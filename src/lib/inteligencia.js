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
export function montarResumoParaIA({ saude, atencao, turmas, positivos, recortes, relatos, periodo, escola }) {
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
    // Quando os relatos foram lidos, os temas do TEXTO valem mais que o motivo
    // escolhido na lista: o motivo costuma ser generico e nem sempre descreve
    // o que de fato aconteceu.
    ...(relatos && relatos.atencao.length
      ? { temas_dos_relatos: relatos.atencao.map(t => ({ tema: t.nome, o_que_e: t.descricao, qtd: t.qtd })),
          observacao_temas: "Estes temas foram lidos do texto dos relatos e sao mais confiaveis que a lista de motivos. Baseie a analise neles.",
          motivos_selecionados_na_lista: recortes.queixas }
      : { principais_queixas: recortes.queixas }),
    temas_emergentes: recortes.emergentes,
    segmentos: recortes.segmentos,
    setores_mais_acionados: recortes.setores,
    turnos: recortes.turnos,
    encaminhamentos_parados: { total: recortes.totalParados, exemplos: recortes.parados.slice(0, 5) },
    pontos_positivos: { ...positivos, variacao: pct(positivos.variacao) },
  };
}

// ── DETALHAMENTO PARA OS RELATÓRIOS ────────────────────────────────────────
// O painel mostra o resumo; o relatório precisa do detalhe por trás de cada linha.

/** Visão completa de um setor: fila, tempo de resposta e onde está travando. */
export function calcularSetores(atual, anterior, temas) {
  const encaminhados = atual.filter(c => c.encaminhamento && c.enc_destino);
  const antes = contarPor(anterior.filter(c => c.encaminhamento && c.enc_destino), "enc_destino");
  const porSetor = new Map();

  for (const c of encaminhados) {
    const s = c.enc_destino;
    if (!porSetor.has(s))
      porSetor.set(s, { setor: s, recebidos: 0, pendentes: 0, resolvidos: 0, criticos: 0,
                        tempos: [], parados: [], responsaveis: new Map(), motivos: new Map() });
    const r = porSetor.get(s);
    r.recebidos++;
    const pendente = c.enc_status === "PENDENTE";
    if (pendente) r.pendentes++; else r.resolvidos++;
    if (c.urgencia === "ALTA" && pendente) r.criticos++;

    const d = diasAteResolver(c);
    if (d !== null) r.tempos.push(d);

    if (pendente && !c.resolucao) {
      const dias = Math.round((new Date() - dataDoRegistro(c)) / 864e5);
      if (dias >= 7) r.parados.push({ dias, motivo: c.motivo_nome || c.titulo, responsavel: c.enc_responsavel, aluno_id: c.aluno_id });
    }
    if (c.enc_responsavel) r.responsaveis.set(c.enc_responsavel, (r.responsaveis.get(c.enc_responsavel) || 0) + 1);
    if (c.motivo_nome) r.motivos.set(c.motivo_nome, (r.motivos.get(c.motivo_nome) || 0) + 1);
  }

  // temas do texto dos relatos que chegaram a cada setor
  const porSetorComs = new Map();
  for (const c of encaminhados) {
    if (!porSetorComs.has(c.enc_destino)) porSetorComs.set(c.enc_destino, []);
    porSetorComs.get(c.enc_destino).push(c);
  }

  return [...porSetor.values()].map(r => ({
    setor: r.setor,
    temasTexto: temas ? classificarRelatos(porSetorComs.get(r.setor) || [], temas) : null,
    recebidos: r.recebidos,
    pendentes: r.pendentes,
    resolvidos: r.resolvidos,
    criticos: r.criticos,
    percResolvido: r.recebidos ? Math.round((r.resolvidos / r.recebidos) * 100) : 0,
    tempoMedio: r.tempos.length ? Math.round(media(r.tempos) * 10) / 10 : null,
    amostraTempo: r.tempos.length,
    parados: r.parados.sort((a, b) => b.dias - a.dias),
    variacao: variacao(r.recebidos, antes.get(r.setor) || 0),
    responsaveis: topN(r.responsaveis, 5),
    motivos: topN(r.motivos, 5),
  })).sort((a, b) => b.recebidos - a.recebidos);
}

/** Tudo o que o relatório de uma turma precisa mostrar. */
export function detalharTurma(atual, anterior, alunos, turma, resumoTurma, temas) {
  const daTurma = alunos.filter(a => a.turma === turma);
  const ids = new Set(daTurma.map(a => a.id));
  const regs = atual.filter(c => ids.has(c.aluno_id));
  const regsAntes = anterior.filter(c => ids.has(c.aluno_id));
  const negativos = regs.filter(ehNegativo);

  const alunoPorId = new Map(daTurma.map(a => [a.id, a]));
  const comRegistro = new Set(negativos.map(c => c.aluno_id));

  return {
    turma,
    temasTexto: temas ? classificarRelatos(regs, temas) : null,
    segmento: daTurma[0] && daTurma[0].segmento,
    totalAlunos: daTurma.length,
    registros: regs.length,
    negativos: negativos.length,
    positivos: regs.filter(ehPositivo).length,
    resolvidos: regs.filter(c => c.status === "CONCLUÍDO").length,
    criticos: negativos.filter(c => c.urgencia === "ALTA" && c.status !== "CONCLUÍDO").length,
    encPendentes: regs.filter(c => c.encaminhamento && c.enc_status === "PENDENTE").length,
    variacao: variacao(negativos.length, regsAntes.filter(ehNegativo).length),
    porAluno: resumoTurma ? resumoTurma.porAluno : null,
    mediaSegmento: resumoTurma ? resumoTurma.mediaSegmento : null,
    desvio: resumoTurma ? resumoTurma.desvio : null,
    alunosEnvolvidos: comRegistro.size,
    concentracao: comRegistro.size ? Math.round((negativos.length / comRegistro.size) * 10) / 10 : 0,
    motivos: topN(contarPor(negativos, "motivo_nome"), 6),
    positivosTemas: topN(contarPor(regs.filter(ehPositivo), "motivo_nome"), 4),
    profissionais: topN(contarPor(regs, "autor_nome"), 5),
    setores: topN(contarPor(regs.filter(c => c.encaminhamento), "enc_destino"), 5),
    alunosDetalhe: [...contarPor(negativos, "aluno_id").entries()]
      .map(([id, qtd]) => ({
        nome: (alunoPorId.get(id) || {}).nome || "—",
        qtd,
        criticos: negativos.filter(c => c.aluno_id === id && c.urgencia === "ALTA").length,
      }))
      .sort((a, b) => b.qtd - a.qtd),
  };
}

/** Série temporal para os gráficos: agrupa por semana em períodos curtos e por mês nos longos. */
export function calcularSerie(atual, dias) {
  if (!atual.length) return { pontos: [], unidade: "semana" };
  const porMes = !dias || dias > 90;
  const balde = new Map();

  for (const c of atual) {
    const d = dataDoRegistro(c);
    let chave, ordem;
    if (porMes) {
      ordem = d.getFullYear() * 100 + d.getMonth();
      chave = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    } else {
      // segunda-feira da semana do registro
      const seg = new Date(d);
      seg.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      seg.setHours(0, 0, 0, 0);
      ordem = seg.getTime();
      chave = seg.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }
    if (!balde.has(ordem)) balde.set(ordem, { ordem, label: chave, atencao: 0, positivos: 0, total: 0 });
    const b = balde.get(ordem);
    b.total++;
    if (ehNegativo(c)) b.atencao++;
    if (ehPositivo(c)) b.positivos++;
  }

  return {
    pontos: [...balde.values()].sort((a, b) => a.ordem - b.ordem),
    unidade: porMes ? "mês" : "semana",
  };
}

// ── TEMPO DE RESPOSTA POR USUÁRIO ──────────────────────────────────────────
// Mede a fila de cada profissional: quanto ele recebeu, quanto devolveu e em
// quantos dias. Serve para redistribuir carga, não para ranquear pessoas — por
// isso mostramos também o tamanho da amostra e o caso mais antigo parado.
export function calcularTempoPorUsuario(atual, equipe) {
  const porPessoa = new Map();
  const chave = (c) => c.enc_responsavel_id || c.enc_responsavel;

  const garantir = (k, nome) => {
    if (!porPessoa.has(k))
      porPessoa.set(k, { id: k, nome, recebidos: 0, resolvidos: 0, pendentes: 0,
                        criticos: 0, tempos: [], parados: 0, maisAntigo: 0, registrou: 0 });
    return porPessoa.get(k);
  };

  const nomeDoPerfil = new Map((equipe || []).map(p => [p.id, p.nome]));
  const hoje = new Date();

  for (const c of atual) {
    // encaminhamentos recebidos
    const k = chave(c);
    if (c.encaminhamento && k) {
      const r = garantir(k, nomeDoPerfil.get(k) || c.enc_responsavel || "—");
      r.recebidos++;
      if (c.enc_status === "PENDENTE") {
        r.pendentes++;
        if (c.urgencia === "ALTA") r.criticos++;
        if (!c.resolucao) {
          const d = Math.round((hoje - dataDoRegistro(c)) / 864e5);
          if (d >= 7) { r.parados++; if (d > r.maisAntigo) r.maisAntigo = d; }
        }
      } else {
        r.resolvidos++;
      }
      const t = diasAteResolver(c);
      if (t !== null) r.tempos.push(t);
    }
    // registros criados
    if (c.autor_id) {
      const a = garantir(c.autor_id, nomeDoPerfil.get(c.autor_id) || c.autor_nome || "—");
      a.registrou++;
    }
  }

  return [...porPessoa.values()]
    .filter(p => p.recebidos > 0 || p.registrou > 0)
    .map(p => ({
      ...p,
      tempoMedio: p.tempos.length ? Math.round(media(p.tempos) * 10) / 10 : null,
      amostra: p.tempos.length,
      percResolvido: p.recebidos ? Math.round((p.resolvidos / p.recebidos) * 100) : null,
    }))
    .sort((a, b) => {
      if (a.tempoMedio === null && b.tempoMedio === null) return b.recebidos - a.recebidos;
      if (a.tempoMedio === null) return 1;
      if (b.tempoMedio === null) return -1;
      return a.tempoMedio - b.tempoMedio;
    });
}

// ── TEMAS EXTRAÍDOS DO TEXTO DO RELATO ─────────────────────────────────────
// O motivo é escolhido numa lista e nem sempre reflete o que de fato foi
// escrito. Aqui os temas saem do texto: a IA lê uma amostra e devolve os temas
// com os termos que os identificam; a contagem é feita aqui, em cima de TODOS
// os relatos do período. IA interpreta, JavaScript conta.

/** Tira acento e caixa, para o termo casar mesmo escrito de outro jeito. */
const normalizar = (t) => (t || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

const temRelato = (c) => c.detalhes && c.detalhes.trim().length > 15;

/**
 * Amostra espalhada pelo período, para a IA descobrir os temas sem custo alto.
 *
 * A cota é dividida entre os dois lados. Sorteando da lista inteira, o lado
 * mais volumoso ocupa quase todas as vagas e o outro chega à IA com poucos
 * exemplos — aí ela não consegue formar temas daquele lado. Aqui cada lado tem
 * cota própria, e a sobra de um é aproveitada pelo outro.
 */
export function amostraDeRelatos(atual, { limite = 150, corte = 400 } = {}) {
  const uteis = atual.filter(temRelato);
  const negativos = uteis.filter(ehNegativo);
  const positivos = uteis.filter(ehPositivo);

  const metade = Math.floor(limite / 2);
  const cotaPos = Math.min(positivos.length, Math.max(metade, limite - negativos.length));
  const cotaNeg = Math.min(negativos.length, limite - cotaPos);

  const espalhar = (lista, cota) => {
    if (cota <= 0 || !lista.length) return [];
    const passo = Math.max(1, Math.ceil(lista.length / cota));
    return lista.filter((_, i) => i % passo === 0).slice(0, cota);
  };

  const escolhidos = [...espalhar(negativos, cotaNeg), ...espalhar(positivos, cotaPos)];

  return {
    total: uteis.length,
    amostrados: escolhidos.length,
    deAtencao: Math.min(negativos.length, cotaNeg),
    positivos: Math.min(positivos.length, cotaPos),
    relatos: escolhidos.map((c, i) => ({
      i,
      positivo: ehPositivo(c),
      texto: c.detalhes.trim().slice(0, corte),
    })),
  };
}

/** Conta quantos relatos do período casam com cada tema. Contagem exata, local. */
export function classificarRelatos(atual, temas) {
  if (!temas) return null;

  const preparar = (lista) => (lista || []).map(t => ({
    nome: t.nome,
    descricao: t.descricao,
    termos: (t.termos || []).map(normalizar).filter(Boolean),
    qtd: 0,
    exemplos: [],
  }));

  const grupos = { atencao: preparar(temas.atencao), positivo: preparar(temas.positivo) };
  const contagem = { atencao: 0, positivo: 0, semTema: { atencao: 0, positivo: 0 } };

  for (const c of atual) {
    if (!temRelato(c)) continue;
    const positivo = ehPositivo(c);
    const negativo = ehNegativo(c);
    if (!positivo && !negativo) continue;

    const faixa = positivo ? "positivo" : "atencao";
    contagem[faixa]++;
    const texto = normalizar(c.detalhes);

    // vale o tema com mais termos encontrados; empate fica com o primeiro
    let melhor = null, melhorPontos = 0;
    for (const t of grupos[faixa]) {
      let pontos = 0;
      for (const termo of t.termos) if (texto.includes(termo)) pontos++;
      if (pontos > melhorPontos) { melhorPontos = pontos; melhor = t; }
    }

    if (melhor) {
      melhor.qtd++;
      if (melhor.exemplos.length < 3)
        melhor.exemplos.push({ trecho: c.detalhes.trim().slice(0, 160), aluno_id: c.aluno_id, data: c.data_registro });
    } else {
      contagem.semTema[faixa]++;
    }
  }

  const limpar = (g) => g.filter(t => t.qtd > 0).sort((a, b) => b.qtd - a.qtd)
    .map(t => ({ nome: t.nome, descricao: t.descricao, qtd: t.qtd, exemplos: t.exemplos }));

  return {
    atencao: limpar(grupos.atencao),
    positivo: limpar(grupos.positivo),
    analisados: contagem,
    coberturaAtencao: contagem.atencao ? Math.round((1 - contagem.semTema.atencao / contagem.atencao) * 100) : 0,
    coberturaPositivo: contagem.positivo ? Math.round((1 - contagem.semTema.positivo / contagem.positivo) * 100) : 0,
  };
}

// ── CONTEXTO DA COMPARAÇÃO ─────────────────────────────────────────────────
// Uma variação percentual só significa alguma coisa se a base for típica.
// Comparar agosto contra julho (recesso) produz "+142%" que não representa
// mudança nenhuma na escola. Aqui medimos o volume normal da escola e
// avisamos quando o período de comparação estiver fora do padrão.
export function calcularContexto(base, dias) {
  if (!dias || !base.length) return null;

  const agora = new Date();
  const janelas = [];
  for (let k = 1; k <= 6; k++) {
    const fim = new Date(agora.getTime() - dias * k * 864e5);
    const inicio = new Date(agora.getTime() - dias * (k + 1) * 864e5);
    const n = base.filter(c => { const d = dataDoRegistro(c); return d >= inicio && d < fim; }).length;
    janelas.push(n);
  }

  const comDados = janelas.filter(n => n > 0);
  if (comDados.length < 3) return null;

  const ordenado = [...comDados].sort((a, b) => a - b);
  const tipico = ordenado[Math.floor(ordenado.length / 2)];   // mediana
  const anterior = janelas[0];
  if (!tipico) return null;

  const proporcao = Math.round((anterior / tipico) * 100);
  return {
    anterior,
    tipico,
    proporcao,
    // base muito abaixo do normal infla a variação; muito acima, esconde alta
    baseAtipica: proporcao <= 65 || proporcao >= 150,
    baseBaixa: proporcao <= 65,
    janelas,
  };
}

// ── VISÃO POR PERFIL CADASTRADO ────────────────────────────────────────────
// O campo de destino do encaminhamento é texto livre e na prática tem pouquíssimos
// valores, o que torna a visão "por setor" pobre. O perfil cadastrado de cada
// usuário é mais rico e mais fiel à estrutura real da escola.
export const PERFIL_LABEL = {
  DIRECAO: "Direção", PSICOLOGO: "Psicólogo", SECRETARIA: "Secretaria",
  PROFESSOR: "Professor", NUCLEO: "Núcleo Pedagógico", "RECEPÇÃO": "Recepção",
  PSICOPEDAGOGO: "Psicopedagogo", FINANCEIRO: "Financeiro", RETENCAO: "Retenção",
  SUPER_ADMIN: "Administrador",
};
const rotuloPerfil = (p) => PERFIL_LABEL[p] || p || "Sem perfil";

export function calcularPorPerfil(atual, anterior, equipe, temas) {
  const perfilPorId = new Map((equipe || []).map(p => [p.id, p.perfil]));
  const perfilPorNome = new Map((equipe || []).map(p => [(p.nome || "").trim().toLowerCase(), p.perfil]));
  const pessoasPorPerfil = new Map();
  for (const p of equipe || []) {
    const k = p.perfil || "—";
    if (!pessoasPorPerfil.has(k)) pessoasPorPerfil.set(k, new Set());
    pessoasPorPerfil.get(k).add(p.id);
  }

  // registros antigos podem ter só o nome do responsável, sem o id
  const perfilDoResponsavel = (c) =>
    perfilPorId.get(c.enc_responsavel_id) ||
    perfilPorNome.get((c.enc_responsavel || "").trim().toLowerCase()) ||
    null;

  const grupos = new Map();
  const garantir = (perfil) => {
    if (!grupos.has(perfil))
      grupos.set(perfil, {
        perfil, rotulo: rotuloPerfil(perfil),
        pessoas: (pessoasPorPerfil.get(perfil) || new Set()).size,
        registrou: 0, registrouAtencao: 0, registrouPositivo: 0,
        recebidos: 0, resolvidos: 0, pendentes: 0, criticos: 0, parados: 0,
        maisAntigo: 0, tempos: [], autoria: [], quemRegistrou: new Map(),
      });
    return grupos.get(perfil);
  };

  const hoje = new Date();
  const antesRegistrou = new Map();
  for (const c of anterior || []) {
    const p = perfilPorId.get(c.autor_id);
    if (p) antesRegistrou.set(p, (antesRegistrou.get(p) || 0) + 1);
  }

  for (const c of atual) {
    const pAutor = perfilPorId.get(c.autor_id);
    if (pAutor) {
      const g = garantir(pAutor);
      g.registrou++;
      if (ehNegativo(c)) g.registrouAtencao++;
      if (ehPositivo(c)) g.registrouPositivo++;
      g.autoria.push(c);
      if (c.autor_nome) g.quemRegistrou.set(c.autor_nome, (g.quemRegistrou.get(c.autor_nome) || 0) + 1);
    }

    if (c.encaminhamento) {
      const pResp = perfilDoResponsavel(c);
      if (pResp) {
        const g = garantir(pResp);
        g.recebidos++;
        if (c.enc_status === "PENDENTE") {
          g.pendentes++;
          if (c.urgencia === "ALTA") g.criticos++;
          if (!c.resolucao) {
            const d = Math.round((hoje - dataDoRegistro(c)) / 864e5);
            if (d >= 7) { g.parados++; if (d > g.maisAntigo) g.maisAntigo = d; }
          }
        } else g.resolvidos++;
        const t = diasAteResolver(c);
        if (t !== null) g.tempos.push(t);
      }
    }
  }

  return [...grupos.values()].map(g => ({
    perfil: g.perfil, rotulo: g.rotulo, pessoas: g.pessoas,
    registrou: g.registrou, registrouAtencao: g.registrouAtencao, registrouPositivo: g.registrouPositivo,
    variacaoRegistrou: variacao(g.registrou, antesRegistrou.get(g.perfil) || 0),
    porPessoa: g.pessoas ? Math.round((g.registrou / g.pessoas) * 10) / 10 : null,
    recebidos: g.recebidos, resolvidos: g.resolvidos, pendentes: g.pendentes,
    criticos: g.criticos, parados: g.parados, maisAntigo: g.maisAntigo,
    percResolvido: g.recebidos ? Math.round((g.resolvidos / g.recebidos) * 100) : null,
    tempoMedio: g.tempos.length ? Math.round(media(g.tempos) * 10) / 10 : null,
    amostraTempo: g.tempos.length,
    quemRegistrou: topN(g.quemRegistrou, 5),
    temasTexto: temas ? classificarRelatos(g.autoria, temas) : null,
  })).sort((a, b) => (b.registrou + b.recebidos) - (a.registrou + a.recebidos));
}
