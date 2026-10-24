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

## Marca (Etapa 3)

`/marca` edita a empresa ativa em seções independentes: Identidade (nome, @, sobre, tom de voz, regras de linguagem e de imagem, cores, fuso horário), Público e objetivos (público, objetivos, pilares, melhores horários), Metas do mês, Ritmo semanal, Campanhas (lista editável) e Integração com o Metricool (só Dono; token cifrado com `ESTUDIO_CRYPTO_KEY`).

Proteção contra perda do que está sendo digitado:
- **Rascunho local**: cada seção guarda o que está sendo digitado em `localStorage`; recarregar a página restaura e avisa.
- **Bloqueio otimista**: a seção salva só se `empresas.atualizado_em` ainda for o valor carregado. Se outro membro salvou antes, o servidor devolve a versão atual.
- **Mesclagem de três vias** (`src/lib/mesclagem.ts`, com testes): campos que só a outra pessoa mudou entram sozinhos; campos que os dois mudaram pedem escolha ("minha versão" ou "versão da outra pessoa") antes de salvar.

## Calendário (Etapa 4)

- `/calendario?semana=AAAA-MM-DD` (visão por semana: 7 colunas no computador, dias empilhados no celular) e `/calendario?dia=AAAA-MM-DD` (detalhe completo: roteiro, legenda com copiar, ganchos, arte, notas e as telas dos stories numeradas). Filtro `formato=Reels|Carrossel|Estático|Stories`. `abrir=novo` abre o editor de conteúdo novo (usado pelo Início).
- **Editor de conteúdo** (painel lateral / folha de baixo): data, hora, formato, status, tema, tipo, pilar, objetivo, campanha, CTA, roteiro, ganchos (Reels), legenda, arte, notas. Salvar, Aprovar, Copiar legenda, Excluir com confirmação na tela. Mudar a data reagenda: mostra "Reagendado para dd/mm", mantém as tarefas ligadas e desloca os prazos das tarefas abertas pelo mesmo número de dias (nunca para antes de hoje).
- **Tarefas padrão** (`src/lib/tarefasPadrao.ts`, com testes): escolhidas pelo formato e pelo campo "tipo" (prova social, texto na tela, Reels comum, carrossel/estático). Criadas ao salvar um conteúdo novo (opção marcada por padrão) ou pelo botão no editor; não duplica.
- **Editor de stories**: data, objetivo, status, post ligado e telas (tipo, texto e opções da interação: pergunta, opções, emoji, link, data), com adicionar, remover, subir e descer. Sequência padrão de 4 telas em stories novos.
- "Aprovar as N sugestões da semana" aprova conteúdos e stories com status `sugestao` na semana exibida.
- Colaborador muda só o status (conteúdo, stories e as próprias tarefas); Leitor só vê. Tudo garantido pelo RLS.

## Tarefas (Etapa 5)

- `/tarefas?filtro=hoje|atrasadas|semana|abertas|entregues&responsavel=<user_id|sem>`. "Hoje" inclui as atrasadas; "Entregues" mostra as concluídas nos últimos 60 dias. `abrir=nova` abre o formulário.
- Quadro com 4 colunas por status (Pendente, Em produção, Aguardando, Concluída), empilhadas no celular. Cada tarefa: caixa de concluir, título, prioridade com cor e texto, tipo, responsável, prazo (vermelho e selo "Atrasada" se vencido), link para o conteúdo no calendário, seletor de status e editar.
- Formulário: título, tipo, prioridade, responsável (membros da empresa), prazo, status, conteúdo ligado (30 dias atrás a 90 à frente).
- Contador de atrasadas no ícone de Tarefas (barra lateral e barra inferior), calculado no layout para a empresa ativa.
- Colaborador só muda o status das próprias tarefas (caixa e seletor desabilitados nas outras); Dono e Editor fazem tudo. O RLS garante no banco.

## Painel de evolução (Etapa 6)

- `/painel` (semanas) e `/painel?visao=meses`. `abrir=registrar` abre o formulário da semana passada.
- **Comparação**: último período completo contra o anterior. Semana completa = domingo já passou; mês completo = todas as semanas que começam nele já fecharam. Períodos parciais aparecem nos gráficos e no histórico com o selo "parcial", mas nunca entram na comparação.
- **Indicadores**: seguidores, seguidores líquidos, visualizações, alcance, engajamento (interações ÷ alcance dos posts, em %, diferença em p.p.), compartilhamentos, salvamentos, respostas aos stories, cliques no link, mensagens no direct. Valor nulo mostra "sem dado", nunca zero. Selo da fonte: Metricool, registro manual, ou Metricool ajustado à mão.
- **Meses** somam as semanas que começam no mês; seguidores = última semana com dado.
- **Gráficos** em SVG puro (`GraficoLinha`, `GraficoBarras`): desenhados na largura real do contêiner, tooltip e crosshair no hover/toque/teclado, parciais em tracejado ou translúcido, barras verdes/vermelhas com o sinal no número.
- **Metas do mês** (`progressoMetas`, testada): semanas que começam no mês + posts publicados nele. Visualizações por dia usa os dias com dado registrados.
- **Melhores conteúdos**: `resultados_posts` dos últimos 6 meses, ordenável por alcance, interações, salvamentos e compartilhamentos, filtro por formato, link para o post e edição.
- **Registro manual**: semana (qualquer dia vira a segunda-feira), todos os campos opcionais, notas. Se a semana veio do Metricool, mantém a fonte e marca `editado_manual`. Resultado de post manual com interações calculadas ao salvar.
- "Atualizar do Metricool" fica desabilitado até a Etapa 7.

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
3. ✅ Marca e ritmo semanal
4. ✅ Calendário com editor de conteúdo e de stories
5. ✅ Tarefas
6. ✅ Painel com registro manual
7. Integração com o Metricool
8. IA: sugestões e geração de calendário
9. Início
10. Testes e deploy na Vercel
