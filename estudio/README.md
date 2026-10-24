# Estúdio

Planejamento de Instagram para várias empresas: calendário de conteúdo, tarefas da equipe, painel de evolução com métricas reais e sugestões semanais geradas por IA (sempre separadas dos dados reais).

Este projeto vive na pasta `estudio/` do repositório. Na Vercel, configure **Root Directory = `estudio`**.

## Stack

- Next.js 15 (App Router) + TypeScript
- Supabase: autenticação (link mágico e Google), Postgres, Row Level Security
- Tailwind CSS com tokens de cor (claro/escuro; destaque vem da empresa ativa)
- Claude (Anthropic) e Metricool chamados só no servidor

## Como rodar

```bash
cd estudio
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev                  # http://localhost:3000
```

Checagens rápidas:

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # testes unitários (vitest)
npm run build       # build de produção
```

## Supabase: projeto GAME, schema `estudio`

O Estúdio usa o projeto Supabase **GAME** (`oxenvlnvyrfjfvbbdgbm`) e vive inteiro dentro do schema **`estudio`** (a "pasta" do Postgres). Nada do Estúdio toca o schema `public` do GAME; a autenticação (`auth.users`) é compartilhada, então quem já tem conta no GAME consegue entrar no Estúdio, mas só vê as empresas em que for membro.

As três migrations já foram aplicadas no GAME e o teste de RLS passou lá. Para reproduzir em outro projeto:

1. No **SQL Editor**, rode as migrations **nesta ordem**:
   - `supabase/migrations/0001_esquema.sql` — schema, enums, tabelas, índices e triggers
   - `supabase/migrations/0002_padroes.sql` — ritmo semanal e metas padrão
   - `supabase/migrations/0003_rls.sql` — funções de papel, políticas RLS e RPCs (`criar_empresa`, `ver_convite`, `aceitar_convite`)
   - `supabase/migrations/0004_membros_email.sql` — e-mail/nome do membro na lista de equipe; membro edita o próprio nome
2. Em **Project Settings → Data API → Exposed schemas**, inclua `estudio` (sem isso a API não enxerga o schema). No GAME isso já foi feito.
3. Rode o teste de RLS: `supabase/tests/rls.sql`. Ele cria usuários de teste, exercita os quatro papéis em duas empresas e **desfaz tudo no fim** (`rollback`). Deve terminar com `NOTICE: RLS OK`. Se algum critério falhar, para com `FALHOU: ...`.
4. Em **Authentication → URL Configuration**:
   - Site URL: `https://SEU-DOMINIO` (ou `http://localhost:3000` em desenvolvimento)
   - Redirect URLs: `http://localhost:3000/auth/callback` e `https://SEU-DOMINIO/auth/callback`
5. Em **Authentication → Providers**: deixe **Email** ligado (link mágico já funciona com o template padrão) e configure **Google** com o Client ID/Secret do Google Cloud (URI de redirecionamento autorizado: `https://oxenvlnvyrfjfvbbdgbm.supabase.co/auth/v1/callback`).
6. Copie a URL do projeto e a chave publicável para `.env.local`.

### Variáveis de ambiente

| Variável | Onde | Para quê |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | navegador + servidor | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador + servidor | chave publicável; todo acesso passa pelo RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | só servidor | tarefas administrativas (ex.: enviar e-mail de convite) |
| `NEXT_PUBLIC_SITE_URL` | servidor | base dos links de e-mail |
| `ANTHROPIC_API_KEY` | só servidor | sugestões e geração de calendário (Etapa 8) |
| `ESTUDIO_CRYPTO_KEY` | só servidor | cifra o token do Metricool no banco (`openssl rand -base64 32`) |

## Empresas, equipe e convites (Etapa 2)

- **Empresas** (`/empresas`): lista as empresas do usuário com papel e cores; "Nova empresa" abre o assistente de 3 passos (dados da marca → público e objetivos → metas e ritmo semanal). Dono arquiva, reativa e exclui (confirmação dentro da tela). Dono e Editor editam.
- **Seletor no topo**: trocar de empresa grava `perfis.empresa_ativa_id` e recarrega tudo; a última empresa usada fica lembrada. As cores primária/secundária da empresa ativa viram os tokens `--cor-primaria`/`--cor-secundaria` da interface.
- **Equipe** (`/empresas/<id>/membros`): membros com papel; Dono altera papéis, remove, convida por e-mail; qualquer membro sai (menos o último Dono) e edita o próprio nome.
- **Convites**: criam um registro em `convites` (token, 7 dias) e disparam um e-mail de acesso pelo próprio Supabase (template "Magic Link") que leva a `/convite/<token>`. O link também pode ser copiado e enviado por WhatsApp. Para aceitar, a pessoa precisa entrar com o mesmo e-mail do convite. Atenção: o SMTP padrão do Supabase tem limite baixo de envios por hora; configure um SMTP próprio em Authentication → SMTP Settings para uso real.

## Papéis e permissões

| Ação | Dono | Editor | Colaborador | Leitor |
| --- | :-: | :-: | :-: | :-: |
| Ver tudo da empresa | ✓ | ✓ | ✓ | ✓ |
| Editar marca, calendário, tarefas, métricas, sugestões | ✓ | ✓ | – | – |
| Mudar status de conteúdos/stories | ✓ | ✓ | ✓ | – |
| Concluir/mudar status das próprias tarefas | ✓ | ✓ | ✓ | – |
| Comentar | ✓ | ✓ | ✓ | – |
| Arquivar/excluir empresa, membros, convites, integração Metricool | ✓ | – | – | – |

Tudo isso é garantido **no banco** (políticas RLS + triggers que restringem colunas), não só na interface. Um Leitor que use a API diretamente com a chave anon e o próprio JWT continua bloqueado.

### Decisões de modelagem

- `empresas_integracoes` guarda o ID da marca e o token do Metricool em tabela separada (só o Dono lê/escreve), para o token nunca sair num `select *` de `empresas`. O token é cifrado com AES-256-GCM no servidor (`src/lib/cripto.ts`).
- `perfis` (1:1 com `auth.users`) lembra a última empresa usada (`empresa_ativa_id`) e o tema. Usuários criados antes do Estúdio não passaram pelo trigger de `auth.users`; o app cria o perfil no primeiro acesso.
- `comentarios` existe porque o papel Colaborador "comenta".
- `empresa_id` é imutável em todas as tabelas (trigger), para nunca "mover" dados entre empresas.
- A empresa precisa sempre ter pelo menos um Dono (trigger).
- Semanas começam na segunda (`check` em `metricas_semanais.semana` e `sugestoes.semana`).

## Estrutura

```
estudio/
  supabase/migrations/   SQL em ordem (tudo no schema estudio)
  supabase/tests/rls.sql Teste de isolamento e papéis
  src/app/entrar         Login (link mágico + Google)
  src/app/auth/callback  Troca o código pela sessão
  src/app/(app)/         Telas autenticadas (casca com barra lateral / barra inferior)
  src/lib/supabase/      Clientes (navegador, servidor, middleware)
  src/lib/tipos/         Tipos do banco
  src/lib/cripto.ts      Cifra do token do Metricool
  src/components/        UI (Botao, Selo, Aviso) e casca
```

## Ordem de construção

1. ✅ Projeto, autenticação, tabelas, RLS e políticas por papel
2. ✅ Empresas: cadastro, seletor, convites e membros
3. Marca e ritmo semanal
4. Calendário com editor de conteúdo e de stories
5. Tarefas
6. Painel com registro manual
7. Integração com o Metricool
8. IA: sugestões e geração de calendário
9. Início
10. Testes e deploy na Vercel
