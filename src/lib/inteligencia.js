// ============================================================================
// Cálculo do Painel de Inteligência.
//
// Regra de ouro: NÚMERO é calculado aqui, em JavaScript, de forma exata e
// gratuita. A IA nunca conta nada — ela só recebe o resumo pronto e interpreta.
// Isso mantém o painel rápido, barato e confiável.
// ============================================================================

/** Data de referência do registro: quando o fato aconteceu, ou quando foi digitado. */
export function dataDoRegistro(c) {
  if (c.data_ocorrencia) return new Date(c.data_ocorrencia + "T12:00:00");
  return new Date(c.created_at);
}

/** Pontuação positiva = situação de risco. Negativa = elogio / avanço. */
export const ehNegativo = (c) => Number(c.motivo_pontos) > 0;
export const ehPositivo = (c) => Number(c.motivo_pontos) < 0;
const ehConcluido = (c) => c.status === "CONCLUÍDO";

export const PERIODOS = [
  { id: "30", label: "Últimos 30 dias", dias: 30 },
  { id: "60", label: "Últimos 60 dias", dias: 60 },
  { id: "90", label: "Últimos 90 dias", dias: 90 },
  { id: "180", label: "Últimos 6 meses", dias: 180 },
  { id: "tudo", label: "Todo o histórico", dias: null },
];

/** Divide os registros em período atual e período anterior de mesma duração. */
export function fatiarPeriodo(coms, dias) {
  if (!dias) return { atual: coms, anterior: [], inicio: null };
  const agora = new Date();
  const inicio = new Date(agora.getTime() - dias * 864e5);
  const inicioAnterior = new Date(agora.getTime() - dias * 2 * 864e5);
  const atual = [], anterior = [];
  for (const c of coms) {
    const d = dataDoRegistro(c);
    if (d >= inicio) atual.push(c);
    else if (d >= inicioAnterior) anterior.push(c);
  }
  return { atual, anterior, inicio };
}

/** Variação percentual. null quando não há base de comparação. */
export function variacao(atual, anterior) {
  if (!anterior) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

const contarPor = (lista, chave) => {
  const m = new Map();
  for (const item of lista) {
    const k = typeof chave === "function" ? chave(item) : item[chave];
    if (k == null || k === "") continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
};

const topN = (mapa, n) =>
  [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([nome, qtd]) => ({ nome, qtd }));

const media = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

/** As resoluções gravam a data no próprio texto, no formato "[dd/mm/aaaa]". */
function diasAteResolver(c) {
  const m = (c.resolucao || "").match(/\[(\d{2})\/(\d{2})\/(\d{4})\]/);
  if (!m) return null;
  const fim = new Date(m[3] + "-" + m[2] + "-" + m[1] + "T12:00:00");
  const dias = Math.round((fim - dataDoRegistro(c)) / 864e5);
  return dias >= 0 && dias < 400 ? dias : null;
}

// ── SAÚDE DO RELACIONAMENTO ────────────────────────────────────────────────
export function calcularSaude(atual, anterior) {
  const resolvidos = atual.filter(ehConcluido).length;
  const negAtual = atual.filter(ehNegativo).length;
  const tempos = atual.map(diasAteResolver).filter(d => d !== null);

  return {
    total: atual.length,
    variacaoTotal: variacao(atual.length, anterior.length),
    resolvidos,
    percResolvidos: atual.length ? Math.round((resolvidos / atual.length) * 100) : 0,
    pendentes: atual.length - resolvidos,
    criticos: atual.filter(c => c.urgencia === "ALTA" && !ehConcluido(c)).length,
    positivos: atual.filter(ehPositivo).length,
    negativos: negAtual,
    variacaoNegativos: variacao(negAtual, anterior.filter(ehNegativo).length),
    encPendentes: atual.filter(c => c.encaminhamento && c.enc_status === "PENDENTE").length,
    tempoMedioResolucao: tempos.length ? Math.round(media(tempos) * 10) / 10 : null,
    amostraTempo: tempos.length,
  };
}

// ── ALUNOS QUE MERECEM ATENÇÃO ─────────────────────────────────────────────
// Em vez de rotular "aluno de risco", classificamos o NÍVEL DE ATENÇÃO e
// sempre explicamos por que aquele nome apareceu na lista.
export function calcularAtencaoAlunos(atual, anterior, alunos, limite = 12) {
  const porAluno = new Map();
  for (const c of atual) {
    if (!c.aluno_id) continue;
    if (!porAluno.has(c.aluno_id)) porAluno.set(c.aluno_id, []);
    porAluno.get(c.aluno_id).push(c);
  }
  const antesPorAluno = contarPor(anterior.filter(ehNegativo), "aluno_id");

  const linhas = [];
  for (const [alunoId, regs] of porAluno) {
    const aluno = alunos.find(a => a.id === alunoId);
    if (!aluno) continue;

    const negativos = regs.filter(ehNegativo);
    if (negativos.length === 0) continue;

    const profissionais = new Set(regs.map(c => c.autor_id).filter(Boolean));
    const setores = new Set(regs.map(c => c.enc_destino).filter(Boolean));
    const criticos = negativos.filter(c => c.urgencia === "ALTA").length;
    const pendentes = regs.filter(c => c.encaminhamento && c.enc_status === "PENDENTE").length;
    const antes = antesPorAluno.get(alunoId) || 0;
    const cresceu = antes > 0 && negativos.length > antes;

    let score = negativos.length * 10 + criticos * 15 + pendentes * 12;
    if (profissionais.size >= 3) score += 20;
    if (setores.size >= 2) score += 10;
    if (cresceu) score += 25;

    const porques = [negativos.length + " registro(s) de atenção no período"];
    if (criticos) porques.push(criticos + " de urgência ALTA");
    if (profissionais.size >= 3) porques.push(profissionais.size + " profissionais diferentes registraram");
    if (setores.size >= 2) porques.push("envolveu " + setores.size + " setores");
    if (pendentes) porques.push(pendentes + " encaminhamento(s) ainda em aberto");
    if (cresceu) porques.push("aumento sobre o período anterior (era " + antes + ")");

    linhas.push({
      id: alunoId, nome: aluno.nome, turma: aluno.turma, segmento: aluno.segmento,
      registros: negativos.length, criticos, profissionais: profissionais.size,
      antes, cresceu, score,
      nivel: score >= 80 ? "PRIORITÁRIO" : score >= 50 ? "ALTO" : score >= 28 ? "MODERADO" : "BAIXO",
      porques,
    });
  }
  return linhas.sort((a, b) => b.score - a.score).slice(0, limite);
}

// ── TURMAS: VOLUME COMPARADO À MÉDIA DO PRÓPRIO SEGMENTO ───────────────────
// Comparar uma turma de Infantil com uma de Ensino Médio não diz nada.
// O que importa é o desvio da turma frente às turmas parecidas com ela.
export function calcularTurmas(atual, alunos) {
  const alunoPorId = new Map(alunos.map(a => [a.id, a]));
  const porTurma = new Map();

  for (const a of alunos) {
    if (!a.turma) continue;
    if (!porTurma.has(a.turma))
      porTurma.set(a.turma, { turma: a.turma, segmento: a.segmento, alunos: 0, registros: 0, negativos: 0, positivos: 0 });
    porTurma.get(a.turma).alunos++;
  }
  for (const c of atual) {
    const aluno = alunoPorId.get(c.aluno_id);
    if (!aluno || !aluno.turma) continue;
    const t = porTurma.get(aluno.turma);
    if (!t) continue;
    t.registros++;
    if (ehNegativo(c)) t.negativos++;
    if (ehPositivo(c)) t.positivos++;
  }

  const turmas = [...porTurma.values()].filter(t => t.alunos > 0);
  for (const t of turmas) t.porAluno = t.alunos ? t.negativos / t.alunos : 0;

  const porSegmento = new Map();
  for (const t of turmas) {
    const s = t.segmento || "—";
    if (!porSegmento.has(s)) porSegmento.set(s, []);
    porSegmento.get(s).push(t);
  }

  for (const t of turmas) {
    const irmas = porSegmento.get(t.segmento || "—");
    // A turma não pode entrar na média com que ela própria é comparada, senão
    // ela puxa a referência para si e o desvio aparece menor do que é.
    // Com menos de 3 turmas no segmento a comparação não tem significado.
    const outras = irmas.filter(o => o !== t);
    if (irmas.length < 3) { t.mediaSegmento = null; t.desvio = null; continue; }
    const ref = media(outras.map(o => o.porAluno));
    t.mediaSegmento = ref;
    t.desvio = ref > 0 ? Math.round(((t.porAluno - ref) / ref) * 100) : null;
  }
  return turmas.sort((a, b) => b.porAluno - a.porAluno);
}

// ── O QUE ESTÁ INDO BEM ────────────────────────────────────────────────────
export function calcularPontosPositivos(atual, anterior, alunos) {
  const alunoPorId = new Map(alunos.map(a => [a.id, a]));
  const positivos = atual.filter(ehPositivo);

  // temas de atenção que caíram de um período para o outro
  const negAtual = contarPor(atual.filter(ehNegativo), "motivo_nome");
  const negAntes = contarPor(anterior.filter(ehNegativo), "motivo_nome");
  const reducoes = [];
  for (const [motivo, antes] of negAntes) {
    const agora = negAtual.get(motivo) || 0;
    if (antes >= 3 && agora < antes)
      reducoes.push({ nome: motivo, antes, agora, queda: Math.round(((antes - agora) / antes) * 100) });
  }

  const porTurma = new Map();
  for (const c of positivos) {
    const t = alunoPorId.get(c.aluno_id) && alunoPorId.get(c.aluno_id).turma;
    if (t) porTurma.set(t, (porTurma.get(t) || 0) + 1);
  }

  // alunos que melhoraram: tinham registros de atenção antes e têm menos agora
  const negAntesAluno = contarPor(anterior.filter(ehNegativo), "aluno_id");
  const negAgoraAluno = contarPor(atual.filter(ehNegativo), "aluno_id");
  const melhoraram = [];
  for (const [alunoId, antes] of negAntesAluno) {
    const agora = negAgoraAluno.get(alunoId) || 0;
    if (antes >= 2 && agora < antes) {
      const aluno = alunoPorId.get(alunoId);
      if (aluno) melhoraram.push({ nome: aluno.nome, turma: aluno.turma, antes, agora });
    }
  }

  return {
    totalPositivos: positivos.length,
    variacao: variacao(positivos.length, anterior.filter(ehPositivo).length),
    temas: topN(contarPor(positivos, "motivo_nome"), 5),
    turmas: topN(porTurma, 5),
    profissionais: topN(contarPor(positivos, "autor_nome"), 5),
    reducoes: reducoes.sort((a, b) => b.queda - a.queda).slice(0, 5),
    melhoraram: melhoraram.sort((a, b) => (b.antes - b.agora) - (a.antes - a.agora)).slice(0, 5),
  };
}

// ── DEMAIS RECORTES ────────────────────────────────────────────────────────
export function calcularRecortes(atual, anterior, alunos) {
  const alunoPorId = new Map(alunos.map(a => [a.id, a]));
  const negativos = atual.filter(ehNegativo);

  const porSegmento = new Map();
  for (const c of atual) {
    const aluno = alunoPorId.get(c.aluno_id);
    const s = aluno && aluno.segmento;
    if (!s) continue;
    if (!porSegmento.has(s)) porSegmento.set(s, { segmento: s, registros: 0, negativos: 0, positivos: 0, alunos: 0 });
    const r = porSegmento.get(s);
    r.registros++;
    if (ehNegativo(c)) r.negativos++;
    if (ehPositivo(c)) r.positivos++;
  }
  for (const a of alunos) {
    if (a.segmento && porSegmento.has(a.segmento)) porSegmento.get(a.segmento).alunos++;
  }

  // temas emergentes: cresceram bastante de um período para o outro
  const temasAgora = contarPor(negativos, "motivo_nome");
  const temasAntes = contarPor(anterior.filter(ehNegativo), "motivo_nome");
  const emergentes = [];
  for (const [tema, agora] of temasAgora) {
    const antes = temasAntes.get(tema) || 0;
    if (agora >= 3 && agora > antes * 1.3)
      emergentes.push({ nome: tema, agora, antes, alta: antes ? Math.round(((agora - antes) / antes) * 100) : null });
  }

  // casos parados: em aberto e sem nenhuma atualização
  const hoje = new Date();
  const parados = atual
    .filter(c => c.encaminhamento && c.enc_status === "PENDENTE" && !c.resolucao)
    .map(c => ({
      titulo: c.motivo_nome || c.titulo,
      aluno: alunoPorId.get(c.aluno_id) && alunoPorId.get(c.aluno_id).nome,
      destino: c.enc_destino,
      responsavel: c.enc_responsavel,
      dias: Math.round((hoje - dataDoRegistro(c)) / 864e5),
    }))
    .filter(c => c.dias >= 7)
    .sort((a, b) => b.dias - a.dias);

  return {
    queixas: topN(contarPor(negativos, "motivo_nome"), 8),
    setores: topN(contarPor(atual.filter(c => c.encaminhamento), "enc_destino"), 8),
    vias: topN(contarPor(atual, "via_comunicacao"), 6),
    turnos: topN(contarPor(atual.filter(c => c.turno), "turno"), 6),
    segmentos: [...porSegmento.values()].sort((a, b) => b.negativos - a.negativos),
    emergentes: emergentes.sort((a, b) => (b.alta == null ? 999 : b.alta) - (a.alta == null ? 999 : a.alta)).slice(0, 5),
    parados: parados.slice(0, 10),
    totalParados: parados.length,
  };
}

/** Percentuais viram texto com "%", senão a IA lê "+139%" como "+139 registros". */
const pct = (v) => (v === null || v === undefined ? null : (v > 0 ? "+" : "") + v + "%");

/** Pacote enxuto que vai para a IA: números prontos, sem dados brutos. */
export function montarResumoParaIA({ saude, atencao, turmas, positivos, recortes, periodo, escola }) {
  const { variacaoTotal, variacaoNegativos, percResolvidos, ...restoSaude } = saude;
  return {
    escola: escola && escola.nome,
    periodo,
    saude: {
      ...restoSaude,
      percentual_resolvidos: percResolvidos + "%",
      variacao_total_vs_periodo_anterior: pct(variacaoTotal),
      variacao_registros_de_atencao: pct(variacaoNegativos),
    },
    alunos_atencao: atencao.slice(0, 8).map(a => ({
      nome: a.nome, turma: a.turma, nivel: a.nivel,
      registros: a.registros, criticos: a.criticos,
      profissionais: a.profissionais, cresceu: a.cresceu, antes: a.antes,
    })),
    turmas_acima_da_media: turmas
      .filter(t => t.desvio !== null && t.desvio > 25 && t.negativos >= 3)
      .slice(0, 6)
      .map(t => ({ turma: t.turma, segmento: t.segmento, registros: t.negativos, alunos: t.alunos, acima_da_media_do_segmento: t.desvio + "%" })),
    principais_queixas: recortes.queixas,
    temas_emergentes: recortes.emergentes,
    segmentos: recortes.segmentos,
    setores_mais_acionados: recortes.setores,
    turnos: recortes.turnos,
    encaminhamentos_parados: { total: recortes.totalParados, exemplos: recortes.parados.slice(0, 5) },
    pontos_positivos: { ...positivos, variacao: pct(positivos.variacao) },
  };
}
