import { autenticar, json } from "../../../lib/api-v1";

// GET /api/v1 — índice da API. Serve também como teste de que a chave funciona.
export async function GET(request) {
  const auth = await autenticar(request);
  if (auth.resposta) return auth.resposta;

  return json({
    api: "Hub de Relacionamento",
    versao: "1.0",
    escola: { id: auth.escola.id, nome: auth.escola.nome },
    chave: { nome: auth.chave.nome, escopo: auth.chave.escopo },
    documentacao: new URL("/api/v1/docs", request.url).toString(),
    endpoints: [
      { metodo: "GET",   caminho: "/api/v1/alunos",             descricao: "Lista alunos. Filtros: turma, segmento, rm, busca, risco_minimo, risco_maximo, ordenar_por, ordem, pagina, por_pagina" },
      { metodo: "POST",  caminho: "/api/v1/alunos",             descricao: "Cadastra aluno. Obrigatório: nome", escopo: "escrita" },
      { metodo: "GET",   caminho: "/api/v1/alunos/{id}",        descricao: "Ficha do aluno com histórico. Parâmetros: incluir_historico, limite_historico" },
      { metodo: "PATCH", caminho: "/api/v1/alunos/{id}",        descricao: "Atualiza dados cadastrais do aluno", escopo: "escrita" },
      { metodo: "GET",   caminho: "/api/v1/comunicacoes",       descricao: "Lista registros. Filtros: aluno_id, status, urgencia, enc_status, enc_destino, autor_id, desde, ate, busca, tipo, encaminhamento, pagina, por_pagina" },
      { metodo: "POST",  caminho: "/api/v1/comunicacoes",       descricao: "Registra ocorrência. Obrigatórios: aluno_id, detalhes", escopo: "escrita" },
      { metodo: "GET",   caminho: "/api/v1/comunicacoes/{id}",  descricao: "Detalhe de um registro" },
      { metodo: "PATCH", caminho: "/api/v1/comunicacoes/{id}",  descricao: "Resolve, redireciona ou complementa um registro", escopo: "escrita" },
      { metodo: "GET",   caminho: "/api/v1/motivos",            descricao: "Motivos disponíveis, com pontuação e tipo" },
      { metodo: "GET",   caminho: "/api/v1/equipe",             descricao: "Profissionais que podem receber encaminhamento. Filtros: perfil, ativo" },
      { metodo: "GET",   caminho: "/api/v1/indicadores",        descricao: "Indicadores do Painel de Inteligência. Parâmetros: dias, incluir_serie, incluir_perfis, incluir_setores" },
    ],
    observacoes: [
      "Autenticação: cabeçalho 'Authorization: Bearer SUA_CHAVE'.",
      "A escola é determinada pela chave. Mandar escola_id no corpo não tem efeito.",
      "Datas em formato ISO 8601 (2026-10-20 ou 2026-10-20T14:30:00Z).",
      "Respostas de lista vêm em { dados: [...], paginacao: {...} }.",
      "Erros vêm em { erro: 'mensagem' } com o código HTTP correspondente.",
    ],
  });
}
