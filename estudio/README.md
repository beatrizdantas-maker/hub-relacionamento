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
   - `supabase/migrations/0005_metricool_user.sql` — User ID do Metricool e última semana importada
   - `supabase/migrations/0006_logo.sql` — logo da empresa (coluna e bucket de imagens)
   - `supabase/migrations/0007_linkedin.sql` — LinkedIn: rede de cada conteúdo, redes da empresa, ritmo do LinkedIn e formatos Texto, Enquete e Artigo

   As migrations 0006 e 0007 podem ser rodadas mais de uma vez sem problema. Sem a 0007, o Instagram continua funcionando; o que for do LinkedIn mostra "rode a migração 0007".
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
| `ANTHROPIC_API_KEY` | só servidor | sugestões semanais e geração do mês com a IA (Claude, modelo `claude-opus-5-5`) |
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

- `/calendario?mes=AAAA-MM` (visão por mês: grade de segunda a domingo no computador, lista dos dias com postagem no celular) e `/calendario?semana=AAAA-MM-DD` (visão por semana: 7 colunas no computador, dias empilhados no celular) e `/calendario?dia=AAAA-MM-DD` (detalhe completo: roteiro, legenda com copiar, ganchos, arte, notas e as telas dos stories numeradas). Filtro `formato=Reels|Carrossel|Estático|Stories`. `abrir=novo` abre o editor de conteúdo novo (usado pelo Início).
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

## Integração com o Metricool (Etapa 7)

Endpoints confirmados no servidor MCP oficial da Metricool (pacote `mcp-metricool`) e no guia "Basic Guide for API Integration": base `https://app.metricool.com/api`, cabeçalho `X-Mc-Auth: <token>`, `userId` e `blogId` na query; marcas em `GET /v2/settings/brands`; séries diárias em `GET /v2/analytics/timelines?metric=&subject=account&network=instagram&from=&to=&timezone=` (resposta `data[].values[]{dateTime,value}`); publicações em `GET /v2/analytics/posts|reels|stories/instagram?from=&to=`.

- **Configuração** (Marca → Metricool, só Dono): User ID, ID da marca e token (cifrado). "Testar conexão" lista a marca encontrada e o Instagram conectado.
- **Importação** (Painel → "Atualizar do Metricool"): desde a última semana completa já importada (ou 12 semanas) até hoje. Por dia: seguidores, ganhos, perdidos, visualizações, alcance e stories. Por post e Reels: data, legenda, tipo, alcance, visualizações, curtidas, comentários, salvamentos, compartilhamentos, interações, URL e, nos Reels, tempo médio e taxa de visualização. Por story: data e respostas.
- **Agregação** (`src/lib/metricool/agregar.ts`, testada): somas; seguidores = último valor da semana; alcance só quando os 7 dias têm dado; interações, salvamentos, compartilhamentos e alcance dos posts a partir das publicações da semana.
- Nunca sobrescreve `cliques_link` e `mensagens_direct` (manuais) nem semanas marcadas como ajustadas à mão. Cada métrica diária é pedida separadamente: uma faltar não derruba a importação, e os avisos aparecem na tela.
- Os nomes dos campos das publicações são lidos de forma tolerante (`likes`/`comments`/`saved`/`shares`/`reach`/`views`/`averageWatchTime`/`reelsViewRate`/`replies`, data em `timestamp`/`publishedAt`/`{dateTime}`); se nada for reconhecido, o aviso mostra os campos recebidos para ajuste.
- Requer `ESTUDIO_CRYPTO_KEY` no servidor (o token é cifrado antes de ir ao banco).

## IA: sugestões e geração do mês (Etapa 8)

Toda chamada ao Claude acontece no servidor (`src/app/api/ia/*`), com a chave em `ANTHROPIC_API_KEY`. Antes de chamar a IA a rota confere sessão, vínculo com a empresa e papel (só Dono e Editor); a RLS repete a checagem ao gravar. Sem a chave, a tela mostra um aviso claro em vez de falhar em silêncio.

- **Dados reais de agora** (`src/lib/ia/dadosReais.ts`, testado): calculados pelo sistema com as últimas 8 semanas completas e os 15 posts mais recentes com resultado — período, visualizações (média e última semana com variação), seguidores, engajamento, salvamentos, compartilhamentos, melhor conteúdo, média por formato e metas × real. O que não tem registro aparece como "sem dado"; nada vira zero. A IA nunca escreve essas linhas: elas vão para a caixa verde e para `sugestoes.dados_reais_usados`.
- **Sugestões da semana** (`POST /api/ia/sugestoes`): recebe perfil da marca, regras de linguagem, metas, campanhas, ritmo, as 8 semanas e os 15 posts em JSON, o que já está no calendário e as datas comemorativas; devolve JSON estruturado (`resumo`, `manter`, `melhorar`, `testar`, `ideias[]`) validado por schema (saída estruturada da API) e por regras de negócio (datas dentro da semana, CTA em toda ideia). Cada item cita entre parênteses o dado usado ou "(sem dado: hipótese)". "Adicionar ao calendário" cria o conteúdo como sugestão da IA com as tarefas padrão e marca a ideia como adicionada.
- **Gerar mês com IA** (Calendário → botão; `POST /api/ia/calendario`): uma chamada por semana (dá para cancelar no meio; o que já foi gerado fica). Para cada dia do ritmo semanal de hoje em diante e ainda vazio: tema, objetivo, roteiro/slides, legenda pronta com CTA, orientação de arte, 3 ganchos nos Reels (curiosidade, identificação, provocação) e stories de 4 telas (abertura, compartilhar post, interação com opções, fechamento). Tudo entra com status `sugestao`, origem `ia`, e as tarefas padrão são criadas. Dias que já têm conteúdo são pulados; dias inválidos na resposta são descartados com aviso.
- Cancelar no navegador aborta a requisição; o servidor repassa o sinal à chamada da IA, então nada é gravado de uma geração cancelada.
- Erros vêm traduzidos (chave recusada, limite de uso, resposta cortada, JSON inválido) com os detalhes da validação quando houver.

## Início (Etapa 9)

Resumo do dia da empresa ativa, montado só com o que já está no banco:

- **Precisa de atenção** (`src/lib/inicio.ts`, testado): tarefas atrasadas, sugestões da IA aguardando aprovação, semana passada sem métricas (leva a "Registrar" ou "Atualizar do Metricool"), ritmo semanal não definido, Metricool não conectado (só Dono) e próximos 7 dias vazios (leva a "Gerar mês com IA"). Leitor e Colaborador só veem o alerta de tarefas.
- **Hoje**: conteúdos e stories do dia com status, e tarefas com prazo hoje.
- **Próximos 7 dias**: um item por dia com link para a visão do dia no calendário.
- **Tarefas**: atrasadas e dos próximos 7 dias, com "Concluir" direto (Dono/Editor em qualquer tarefa; Colaborador só nas suas, como no banco).
- **Última semana completa**: seguidores, seguidores líquidos, visualizações e engajamento comparados com a semana anterior, mais o progresso das metas do mês. Sem registro, "sem dado".
- **Sugestões**: resumo da última sugestão gerada.
- Atalhos: "Novo conteúdo" (`/calendario?abrir=novo`) e "Gerar mês com IA" (`/calendario?abrir=gerar-mes`).

## Testes e deploy (Etapa 10)

### O que roda em cada verificação

| Comando | O que garante |
| --- | --- |
| `npm run lint` · `npm run typecheck` | Código sem avisos e tipos fechados (inclusive os tipos do banco) |
| `npm test` | 52 testes de unidade: cifra do token, mesclagem de 3 vias da Marca, tarefas padrão, datas e semanas, agregação de métricas, importação do Metricool, dados reais e validação da IA, plano do mês, reagendamento, alertas do Início, cores da empresa (contraste no tema escuro) |
| `npm run test:a11y` | Em todas as telas, como Dono e como Leitor, em 360px e 1280px, nos temas claro e escuro: zero violações WCAG 2.1 A/AA (axe), zero erros de console e zero rolagem horizontal. Precisa do app rodando com `ESTUDIO_PREVIEW=1` (a rota `/dev-preview` monta cada tela com dados de exemplo; sem a variável ela não existe) |
| `supabase/tests/rls.sql` | Isolamento entre empresas e permissões por papel direto no banco (ver abaixo) |

`.github/workflows/estudio.yml` roda tudo isso a cada push em `estudio/**`: lint, tipos, testes, build, acessibilidade e o teste de RLS num Postgres 16 limpo (com `supabase/tests/auth_shim.sql` simulando o `auth` do Supabase, as 5 migrations aplicadas em ordem e o script de RLS precisando imprimir "RLS OK").

### Critérios de aceite

| Critério | Como é garantido | Onde está testado |
| --- | --- | --- |
| Quem está em duas empresas nunca vê dados de uma na outra | RLS em todas as tabelas por `empresa_id` + vínculo em `membros`; `empresa_id` imutável por trigger | `rls.sql` (Ana é dona da A e leitora da B; Bia não vê nada da A) |
| Leitor não edita nada, nem pela API | Políticas de escrita exigem `pode_editar`/`pode_colaborar`; valem para qualquer cliente com a chave anon + JWT | `rls.sql` (inserts, updates e deletes bloqueados em empresas, conteúdos, stories, tarefas, métricas e sugestões) |
| Colaborador só muda status, e só das próprias tarefas | Triggers `tg_somente_status` e `tg_tarefas_restricoes` | `rls.sql` |
| Reagendar um conteúdo mantém as tarefas ligadas | As tarefas continuam com o mesmo `conteudo_id`; os prazos abertos deslocam junto, nunca para antes de hoje | `reagendar.test.ts` |
| O Painel nunca mostra número que não veio do Metricool ou do registro manual | Nulo vira "sem dado" em toda a cadeia (agregação, períodos, metas, dados reais da IA); alcance semanal só com 7 dias de dado | `metricas.test.ts`, `metricool.test.ts`, `ia.test.ts` |
| A IA usa só os números enviados | Dados reais calculados pelo sistema; resposta em JSON estruturado validada por schema e regras de negócio antes de gravar; `dados_reais_usados` nunca vem da IA | `ia.test.ts` + rotas em `src/app/api/ia` |
| Tudo funciona no celular (a partir de 360px) | Layout mobile-first; o teste de acessibilidade falha se houver rolagem horizontal | `npm run test:a11y` |
| Acessível | Cores de status com contraste AA e sempre com texto; foco visível; painéis com `role="dialog"`; gráficos com nome acessível; tabelas roláveis focáveis | `npm run test:a11y` |

Observação: a cor primária de cada empresa é escolhida por quem cadastra. O sistema escolhe texto branco ou escuro sobre ela pelo contraste e, no tema escuro, clareia a cor automaticamente até 5,5:1 sobre o fundo (`src/lib/cores.ts`), então qualquer cor da marca passa no AA nos dois temas.

### Checklist de produção (Vercel + Supabase)

1. **Supabase (projeto GAME)**: aplicar as migrations `supabase/migrations/0001` a `0005` em ordem no SQL Editor (a 0004 ainda está pendente no GAME) e rodar `supabase/tests/rls.sql` lá para ver "RLS OK". Em Authentication → URL Configuration, adicionar `https://<seu-domínio>/auth/callback` nas Redirect URLs e definir a Site URL. Em Providers, configurar o Google (Client ID e Secret do Google Cloud) se quiser login com Google.
2. **Vercel**: variáveis de ambiente `ESTUDIO_CRYPTO_KEY` (gerar com `openssl rand -base64 32`), `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL` (o domínio público) e, se quiser sobrescrever os padrões do código, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Depois de salvar, fazer um novo deploy (as variáveis só entram no próximo build).
3. **Vercel → Deployment Protection**: desligar a "Vercel Authentication" para que a equipe e as pessoas convidadas abram o app sem conta na Vercel.
4. **Vercel → Settings → General**: renomear o projeto (hoje `hub-rel-github`) e apontar um domínio próprio, se houver. Root Directory deve ser `estudio`.
5. **Rotas de IA** usam `maxDuration = 300` (5 min). No plano Hobby isso exige Fluid Compute ligado (padrão nos projetos novos). Se o build reclamar do limite, reduza para 60 em `src/app/api/ia/*/route.ts` e gere o mês com menos dias por vez.
6. **Depois do primeiro acesso**: criar a empresa, preencher Marca (ritmo, metas, regras de linguagem), conectar o Metricool e importar, convidar a equipe com os papéis certos.

## Logo e análise do sistema

- **Logo da empresa**: no cadastro (passo 1) e em Marca → Identidade. A imagem é reduzida no navegador para no máximo 512 px (WebP ou PNG) e vai para o bucket público `estudio-logos` do Supabase Storage, na pasta da empresa (`<empresa_id>/`). Só Dono e Editor gravam (políticas de `storage.objects` em `0006_logo.sql`). A logo aparece no seletor de empresas e nos cartões; sem logo, aparece a inicial na cor da marca.
- **Cadastro em 2 passos**: dados da marca e público. Metas e ritmo não são pedidos: a empresa nasce com o ritmo padrão e sem metas.
- **Análise do sistema** (`src/lib/analiseSistema.ts`, testada, sem IA): em Marca → Metas, sugere cada meta como valor real das últimas 4 semanas completas + 10%, arredondado (salvamentos por carrossel e alcance por Reels usam os posts das últimas 8 semanas, com no mínimo 2 posts). Em Marca → Ritmo, mostra o melhor horário por formato pela média de interações e oferece aplicar só as horas. Sem dado suficiente, não sugere nada. Nada é salvo sem clicar em Salvar.

## Briefing de produção (imagens e roteiros)

A equipe produz as artes e grava os vídeos; a IA entrega o briefing completo (`src/lib/ia/briefing.ts`, testado):

| Formato | Campo "Roteiro" | Campo "Orientação de arte" |
| --- | --- | --- |
| Carrossel | Slide a slide: título e texto que vão na arte e como deve ser a imagem de cada slide | Estilo, cores, tipografia, fotografia, elementos e dicas de produção |
| Estático | Título e texto da arte, imagem e composição | Idem |
| Reels com pessoa | Cena a cena: tempo, como filmar, fala palavra por palavra, texto na tela, áudio; música sugerida | Idem |
| Reels sem pessoa | Cena a cena: imagens de apoio, texto na tela, narração em off quando fizer sentido, áudio; música sugerida | Idem |

- **Gerar mês com IA** já cria cada dia com esse briefing.
- No editor do conteúdo, **Gerar briefing com IA** (`POST /api/ia/briefing`) refaz o briefing de um item a partir do que está no formulário; preenche roteiro, orientação de arte, legenda, CTA e ganchos, e nada é salvo até clicar em Salvar.
- **Teleprompter**: nos Reels, lê as linhas "FALA:" do roteiro e mostra em tela cheia, com rolagem automática, velocidade, tamanho de letra e espelhamento.
- Nenhuma alteração no banco: tudo fica nos campos que já existiam.
- **Copiar artes da semana / do mês** (Calendário): copia de uma vez, para colar no WhatsApp ou num documento, só os carrosséis e posts estáticos do período (sem Reels, stories e publicados), com data, tema, status, slides (texto e imagem de cada um) e orientação de arte (`src/lib/copiarArtes.ts`, testado).
- **Copiar falas da semana / do mês** (Calendário) e **Copiar falas** (no editor de cada Reels): só as falas do roteiro, cena a cena com o tempo ("[0s–3s] …"), sem imagem, texto na tela nem áudio; Reels sem fala aparecem com aviso.
- **Marcar todas como feitas** (Tarefas ligadas, no editor do conteúdo): conclui de uma vez as tarefas abertas daquele conteúdo; o Colaborador só conclui as suas (regra do banco).
- **Hashtags**: toda legenda escrita pela IA (Gerar mês, briefing e ideias das Sugestões) recebe de 5 a 10 hashtags, limpas e sem repetição, numa linha separada depois da chamada para ação (`src/lib/ia/hashtags.ts`, testado).

## LinkedIn

Página da empresa no LinkedIn, com calendário e ritmo próprios (`src/lib/redes.ts`, testado). Ligue em **Marca → LinkedIn**.

- **Ritmo sugerido (um post por dia):** seg texto de opinião · ter carrossel em PDF · qua vídeo com especialista · qui caso de escola · sex imagem de bastidores · sáb enquete · dom reflexão. Editável na mesma aba.
- **Formatos:** Texto, Carrossel (PDF), Vídeo, Imagem, Enquete e Artigo. No banco, Vídeo é `Reels`, Imagem é `Estático`; Texto, Enquete e Artigo são valores novos do enum. Cada conteúdo tem a coluna `rede` (`instagram` ou `linkedin`).
- **Calendário:** filtro Todas / Instagram / LinkedIn; os posts do LinkedIn levam a marca "in". Em cada dia há "+ Instagram" e "+ LinkedIn"; stories só no Instagram.
- **Gerar mês com IA:** escolha a rede. No LinkedIn a IA segue o ritmo do LinkedIn, escreve na voz da empresa ("nós") para gestores e decisores, usa de 3 a 5 hashtags e não cria stories.
- **Adaptar para o LinkedIn** (`POST /api/ia/adaptar`): no editor de um post do Instagram, a IA reescreve a ideia para o LinkedIn, escolhe o formato (prefere o do ritmo do dia) e cria a versão como sugestão, na mesma data (ou hoje, se já passou), com as tarefas padrão.
- **Briefing com IA** e as cópias de artes e falas funcionam nas duas redes; o texto copiado indica "LINKEDIN" nos posts de lá.
- **Tarefas padrão:** Texto (escrever 2 dias antes, revisar e agendar 1 dia antes), Enquete (escrever e agendar 1 dia antes), Artigo (escrever 5 dias antes, capa 3 dias antes, revisar e publicar 1 dia antes).
- Ainda não tem: números do LinkedIn no Painel e sugestões semanais por rede (próxima etapa).

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
  supabase/tests/rls.sql Teste de isolamento e papéis (auth_shim.sql simula o Supabase fora da nuvem)
  scripts/a11y.mjs       Auditoria de acessibilidade, 360px e console em todas as telas
  src/app/dev-preview/   Telas com dados de exemplo (só com ESTUDIO_PREVIEW=1)
  src/app/entrar         Login (link mágico + Google)
  src/app/auth/callback  Troca o código pela sessão
  src/app/(app)/         Telas autenticadas (casca com barra lateral / barra inferior)
  src/lib/supabase/      Clientes (navegador, servidor, middleware)
  src/lib/tipos/         Tipos do banco
  src/lib/cripto.ts      Cifra do token do Metricool
  src/lib/ia/            Prompts, schemas de saída, dados reais e plano do mês
  src/app/api/ia/        Rotas de servidor que chamam o Claude
  src/components/        UI (Botao, Selo, Aviso) e casca
```

## Ordem de construção

1. ✅ Projeto, autenticação, tabelas, RLS e políticas por papel
2. ✅ Empresas: cadastro, seletor, convites e membros
3. ✅ Marca e ritmo semanal
4. ✅ Calendário com editor de conteúdo e de stories
5. ✅ Tarefas
6. ✅ Painel com registro manual
7. ✅ Integração com o Metricool
8. ✅ IA: sugestões e geração do mês
9. ✅ Início
10. ✅ Testes e deploy na Vercel
