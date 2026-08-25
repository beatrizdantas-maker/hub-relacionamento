// ============================================================================
// Gráficos em SVG puro, gerados como texto.
//
// Por que assim, e não com uma biblioteca de gráficos: o mesmo código precisa
// funcionar na tela (React) e dentro do relatório impresso (HTML solto numa aba
// nova). Gerando SVG como string, os dois usam exatamente a mesma função e o
// resultado sai idêntico no papel e no monitor — sem dependência externa e sem
// canvas, que costuma sair borrado ou em branco na impressão.
// ============================================================================

const esc = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const CORES = {
  atencao: "#ef4444",
  positivo: "#22c55e",
  neutro: "#2563eb",
  roxo: "#7c3aed",
  alerta: "#f59e0b",
  linha: "#e2e8f0",
  texto: "#64748b",
  titulo: "#1e293b",
};

const FONTE = "font-family='DM Sans,system-ui,sans-serif'";

/** Envelope comum: título, legenda e área de desenho. */
function moldura({ titulo, legenda, largura, altura, conteudo }) {
  const leg = (legenda || []).map((l, i) =>
    `<g transform="translate(${i * 150},0)">
       <rect width="9" height="9" rx="2" y="-8" fill="${l.cor}"/>
       <text x="14" y="0" font-size="11" fill="${CORES.texto}" ${FONTE}>${esc(l.nome)}</text>
     </g>`).join("");

  return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto">
    <text x="0" y="14" font-size="13" font-weight="800" fill="${CORES.titulo}" ${FONTE}>${esc(titulo)}</text>
    ${leg ? `<g transform="translate(0,34)">${leg}</g>` : ""}
    <g transform="translate(0,${legenda && legenda.length ? 48 : 28})">${conteudo}</g>
  </svg>`;
}

// ── EVOLUÇÃO NO TEMPO ──────────────────────────────────────────────────────
export function graficoEvolucao(serie, { largura = 640, alturaPlot = 170 } = {}) {
  const pts = serie.pontos;
  if (pts.length < 2)
    return `<div style="font-size:12px;color:#94a3b8;padding:10px 0">Ainda não há ${serie.unidade === "mês" ? "meses" : "semanas"} suficientes no período para desenhar a evolução.</div>`;

  const eixoY = 34, base = alturaPlot - 22;
  const larguraPlot = largura - eixoY - 6;
  const maxV = Math.max(1, ...pts.map(p => Math.max(p.atencao, p.positivos)));
  const x = (i) => eixoY + (pts.length === 1 ? larguraPlot / 2 : (i / (pts.length - 1)) * larguraPlot);
  const y = (v) => base - (v / maxV) * (base - 8);

  const caminho = (campo) => pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[campo]).toFixed(1)}`).join(" ");
  const area = (campo) => `${caminho(campo)} L${x(pts.length - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z`;

  // no máximo 8 rótulos no eixo X, para não embolar
  const passo = Math.ceil(pts.length / 8);
  const grade = [0, 0.5, 1].map(f => {
    const v = Math.round(maxV * f);
    return `<line x1="${eixoY}" y1="${y(v)}" x2="${largura - 6}" y2="${y(v)}" stroke="${CORES.linha}" stroke-width="1"/>
            <text x="${eixoY - 6}" y="${y(v) + 3.5}" font-size="10" text-anchor="end" fill="#94a3b8" ${FONTE}>${v}</text>`;
  }).join("");

  const marcas = pts.map((p, i) => i % passo === 0 || i === pts.length - 1
    ? `<text x="${x(i)}" y="${base + 14}" font-size="9.5" text-anchor="middle" fill="#94a3b8" ${FONTE}>${esc(p.label)}</text>` : "").join("");

  const bolinhas = pts.map((p, i) =>
    `<circle cx="${x(i)}" cy="${y(p.atencao)}" r="2.6" fill="${CORES.atencao}"/>
     <circle cx="${x(i)}" cy="${y(p.positivos)}" r="2.6" fill="${CORES.positivo}"/>`).join("");

  return moldura({
    titulo: `Evolução por ${serie.unidade}`,
    legenda: [{ nome: "Registros de atenção", cor: CORES.atencao }, { nome: "Registros positivos", cor: CORES.positivo }],
    largura, altura: alturaPlot + 48,
    conteudo: `
      ${grade}
      <path d="${area("positivos")}" fill="${CORES.positivo}" opacity="0.10"/>
      <path d="${area("atencao")}" fill="${CORES.atencao}" opacity="0.10"/>
      <path d="${caminho("positivos")}" fill="none" stroke="${CORES.positivo}" stroke-width="2" stroke-linejoin="round"/>
      <path d="${caminho("atencao")}" fill="none" stroke="${CORES.atencao}" stroke-width="2" stroke-linejoin="round"/>
      ${bolinhas}${marcas}`,
  });
}

// ── ROSCA: SITUAÇÃO DOS REGISTROS ──────────────────────────────────────────
export function graficoSituacao(saude, { largura = 300 } = {}) {
  const fatias = [
    { nome: "Resolvidos", valor: saude.resolvidos, cor: CORES.positivo },
    { nome: "Em acompanhamento", valor: Math.max(0, saude.pendentes - saude.criticos), cor: CORES.alerta },
    { nome: "Críticos em aberto", valor: saude.criticos, cor: CORES.atencao },
  ].filter(f => f.valor > 0);

  const total = fatias.reduce((a, f) => a + f.valor, 0);
  if (!total) return `<div style="font-size:12px;color:#94a3b8">Sem registros no período.</div>`;

  const cx = 82, cy = 82, r = 62, esp = 22, circ = 2 * Math.PI * r;
  let acumulado = 0;
  const aneis = fatias.map(f => {
    const frac = f.valor / total;
    const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${f.cor}" stroke-width="${esp}"
      stroke-dasharray="${(frac * circ).toFixed(2)} ${circ.toFixed(2)}"
      stroke-dashoffset="${(-acumulado * circ).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    acumulado += frac;
    return el;
  }).join("");

  const itens = fatias.map((f, i) => `
    <g transform="translate(180,${18 + i * 30})">
      <rect width="9" height="9" rx="2" fill="${f.cor}"/>
      <text x="15" y="8.5" font-size="11.5" font-weight="700" fill="${CORES.titulo}" ${FONTE}>${f.valor}</text>
      <text x="15" y="21" font-size="10" fill="${CORES.texto}" ${FONTE}>${esc(f.nome)}</text>
    </g>`).join("");

  return moldura({
    titulo: "Situação dos registros",
    largura, altura: 196,
    conteudo: `${aneis}
      <text x="${cx}" y="${cy - 2}" font-size="26" font-weight="900" text-anchor="middle" fill="${CORES.titulo}" ${FONTE}>${saude.percResolvidos}%</text>
      <text x="${cx}" y="${cy + 16}" font-size="10" text-anchor="middle" fill="${CORES.texto}" ${FONTE}>resolvidos</text>
      ${itens}`,
  });
}

// ── BARRAS AGRUPADAS: SEGMENTOS ────────────────────────────────────────────
export function graficoSegmentos(segmentos, { largura = 640 } = {}) {
  if (!segmentos || !segmentos.length)
    return `<div style="font-size:12px;color:#94a3b8">Sem dados por segmento no período.</div>`;

  const linhaAlt = 42, alturaPlot = segmentos.length * linhaAlt + 8;
  const rotulo = 132, larguraBarra = largura - rotulo - 46;
  const max = Math.max(1, ...segmentos.map(s => Math.max(s.negativos, s.positivos)));

  const linhas = segmentos.map((s, i) => {
    const yb = i * linhaAlt;
    const ln = (s.negativos / max) * larguraBarra;
    const lp = (s.positivos / max) * larguraBarra;
    return `
      <text x="0" y="${yb + 15}" font-size="11" font-weight="600" fill="${CORES.titulo}" ${FONTE}>${esc(s.segmento)}</text>
      <text x="0" y="${yb + 29}" font-size="9.5" fill="#94a3b8" ${FONTE}>${s.alunos} alunos</text>
      <rect x="${rotulo}" y="${yb + 4}" width="${Math.max(1, ln)}" height="13" rx="3" fill="${CORES.atencao}"/>
      <text x="${rotulo + Math.max(1, ln) + 6}" y="${yb + 14.5}" font-size="10.5" font-weight="700" fill="${CORES.atencao}" ${FONTE}>${s.negativos}</text>
      <rect x="${rotulo}" y="${yb + 21}" width="${Math.max(1, lp)}" height="13" rx="3" fill="${CORES.positivo}"/>
      <text x="${rotulo + Math.max(1, lp) + 6}" y="${yb + 31.5}" font-size="10.5" font-weight="700" fill="${CORES.positivo}" ${FONTE}>${s.positivos}</text>`;
  }).join("");

  return moldura({
    titulo: "Atenção e positivos por segmento",
    legenda: [{ nome: "De atenção", cor: CORES.atencao }, { nome: "Positivos", cor: CORES.positivo }],
    largura, altura: alturaPlot + 56,
    conteudo: linhas,
  });
}

// ── BARRAS DIVERGENTES: DESVIO DAS TURMAS ──────────────────────────────────
export function graficoTurmas(turmas, { largura = 640, limite = 10 } = {}) {
  const dados = turmas
    .filter(t => t.desvio !== null && t.negativos > 0)
    .sort((a, b) => b.desvio - a.desvio)
    .slice(0, limite);

  if (!dados.length)
    return `<div style="font-size:12px;color:#94a3b8">Nenhuma turma com base de comparação no período. É preciso ao menos 3 turmas no mesmo segmento.</div>`;

  const linhaAlt = 26, alturaPlot = dados.length * linhaAlt + 22;
  const rotulo = 116;
  const zero = rotulo + (largura - rotulo - 56) * 0.42;
  const maxAbs = Math.max(60, ...dados.map(t => Math.abs(t.desvio)));
  const escala = (largura - rotulo - 56) * 0.55 / maxAbs;

  const linhas = dados.map((t, i) => {
    const yb = i * linhaAlt;
    const w = Math.max(2, Math.abs(t.desvio) * escala);
    const acima = t.desvio > 0;
    return `
      <text x="0" y="${yb + 14}" font-size="10.5" font-weight="600" fill="${CORES.titulo}" ${FONTE}>${esc(t.turma)}</text>
      <rect x="${acima ? zero : zero - w}" y="${yb + 4}" width="${w}" height="13" rx="3" fill="${acima ? CORES.atencao : CORES.positivo}" opacity="${acima ? 1 : 0.65}"/>
      <text x="${acima ? zero + w + 5 : zero - w - 5}" y="${yb + 14.5}" font-size="10" font-weight="700"
            text-anchor="${acima ? "start" : "end"}" fill="${acima ? CORES.atencao : "#16a34a"}" ${FONTE}>${t.desvio > 0 ? "+" : ""}${t.desvio}%</text>`;
  }).join("");

  return moldura({
    titulo: "Turmas x média do próprio segmento",
    largura, altura: alturaPlot + 44,
    conteudo: `
      <line x1="${zero}" y1="0" x2="${zero}" y2="${dados.length * linhaAlt}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>
      <text x="${zero}" y="${dados.length * linhaAlt + 14}" font-size="9.5" text-anchor="middle" fill="#94a3b8" ${FONTE}>média do segmento</text>
      ${linhas}`,
  });
}

// ── BARRAS HORIZONTAIS: MOTIVOS ────────────────────────────────────────────
export function graficoMotivos(itens, { largura = 640, titulo = "Motivos de atenção", cor = CORES.atencao } = {}) {
  if (!itens || !itens.length) return `<div style="font-size:12px;color:#94a3b8">Sem registros no período.</div>`;

  const linhaAlt = 25, rotulo = 210;
  const larguraBarra = largura - rotulo - 42;
  const max = itens[0].qtd;
  const total = itens.reduce((a, i) => a + i.qtd, 0);

  const linhas = itens.map((it, i) => {
    const yb = i * linhaAlt;
    const w = Math.max(2, (it.qtd / max) * larguraBarra);
    const nome = it.nome.length > 32 ? it.nome.slice(0, 31) + "…" : it.nome;
    return `
      <text x="0" y="${yb + 14}" font-size="10.5" fill="${CORES.titulo}" ${FONTE}>${esc(nome)}</text>
      <rect x="${rotulo}" y="${yb + 4}" width="${w}" height="13" rx="3" fill="${cor}"/>
      <text x="${rotulo + w + 6}" y="${yb + 14.5}" font-size="10" font-weight="700" fill="${cor}" ${FONTE}>${it.qtd}</text>
      <text x="${largura - 2}" y="${yb + 14.5}" font-size="9.5" text-anchor="end" fill="#94a3b8" ${FONTE}>${Math.round(it.qtd / total * 100)}%</text>`;
  }).join("");

  return moldura({ titulo, largura, altura: itens.length * linhaAlt + 34, conteudo: linhas });
}

// ── COMPARATIVO DE UMA SÉRIE COM UNIDADE (dias, %, etc.) ───────────────────
// Diferente do gráfico de motivos: aqui o valor não é contagem, então não faz
// sentido mostrar percentual do total. Mostra a média como linha de referência.
export function graficoValores(itens, { largura = 640, titulo, sufixo = "", cor = CORES.neutro, rotulo = 190, inverso = false } = {}) {
  const dados = (itens || []).filter(i => i.valor !== null && i.valor !== undefined);
  if (!dados.length) return `<div style="font-size:12px;color:#94a3b8">Sem dados suficientes para comparar.</div>`;

  const linhaAlt = 25;
  const larguraBarra = largura - rotulo - 60;
  const max = Math.max(...dados.map(d => d.valor)) || 1;
  const med = dados.reduce((a, d) => a + d.valor, 0) / dados.length;
  const xMedia = rotulo + (med / max) * larguraBarra;

  const linhas = dados.map((d, i) => {
    const yb = i * linhaAlt;
    const w = Math.max(2, (d.valor / max) * larguraBarra);
    // com "inverso", valor alto é ruim (ex.: dias parados)
    const c = inverso ? (d.valor > med * 1.5 ? CORES.atencao : d.valor < med * 0.6 ? CORES.positivo : cor) : cor;
    const nome = d.nome.length > 28 ? d.nome.slice(0, 27) + "…" : d.nome;
    return `
      <text x="0" y="${yb + 14}" font-size="10.5" fill="${CORES.titulo}" ${FONTE}>${esc(nome)}</text>
      <rect x="${rotulo}" y="${yb + 4}" width="${w}" height="13" rx="3" fill="${c}"/>
      <text x="${rotulo + w + 6}" y="${yb + 14.5}" font-size="10" font-weight="700" fill="${c}" ${FONTE}>${d.valor}${sufixo}</text>`;
  }).join("");

  const alturaPlot = dados.length * linhaAlt;
  return moldura({
    titulo, largura, altura: alturaPlot + 48,
    conteudo: `
      ${linhas}
      <line x1="${xMedia}" y1="0" x2="${xMedia}" y2="${alturaPlot}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>
      <text x="${xMedia}" y="${alturaPlot + 13}" font-size="9.5" text-anchor="middle" fill="#94a3b8" ${FONTE}>média ${Math.round(med * 10) / 10}${sufixo}</text>`,
  });
}

// ── COMPARATIVO DE DUAS SÉRIES LADO A LADO ─────────────────────────────────
export function graficoDuplo(itens, { largura = 640, titulo, serieA, serieB, rotulo = 150, sub } = {}) {
  if (!itens || !itens.length) return `<div style="font-size:12px;color:#94a3b8">Sem dados para comparar.</div>`;

  const linhaAlt = 40, larguraBarra = largura - rotulo - 52;
  const max = Math.max(1, ...itens.map(i => Math.max(i[serieA.campo] || 0, i[serieB.campo] || 0)));

  const linhas = itens.map((it, i) => {
    const yb = i * linhaAlt;
    const va = it[serieA.campo] || 0, vb = it[serieB.campo] || 0;
    const la = (va / max) * larguraBarra, lb = (vb / max) * larguraBarra;
    const nome = String(it.nome).length > 22 ? String(it.nome).slice(0, 21) + "…" : it.nome;
    return `
      <text x="0" y="${yb + 15}" font-size="10.5" font-weight="600" fill="${CORES.titulo}" ${FONTE}>${esc(nome)}</text>
      ${it.sub ? `<text x="0" y="${yb + 28}" font-size="9" fill="#94a3b8" ${FONTE}>${esc(it.sub)}</text>` : ""}
      <rect x="${rotulo}" y="${yb + 3}" width="${Math.max(1, la)}" height="13" rx="3" fill="${serieA.cor}"/>
      <text x="${rotulo + Math.max(1, la) + 6}" y="${yb + 13.5}" font-size="10" font-weight="700" fill="${serieA.cor}" ${FONTE}>${va}${serieA.sufixo || ""}</text>
      <rect x="${rotulo}" y="${yb + 20}" width="${Math.max(1, lb)}" height="13" rx="3" fill="${serieB.cor}"/>
      <text x="${rotulo + Math.max(1, lb) + 6}" y="${yb + 30.5}" font-size="10" font-weight="700" fill="${serieB.cor}" ${FONTE}>${vb}${serieB.sufixo || ""}</text>`;
  }).join("");

  return moldura({
    titulo: titulo + (sub ? " — " + sub : ""),
    legenda: [{ nome: serieA.nome, cor: serieA.cor }, { nome: serieB.nome, cor: serieB.cor }],
    largura, altura: itens.length * linhaAlt + 56,
    conteudo: linhas,
  });
}

// ── UMA TURMA CONTRA AS OUTRAS DO SEGMENTO ─────────────────────────────────
export function graficoTurmaVsSegmento(turma, { largura = 640 } = {}) {
  if (!turma || turma.porAluno === null || turma.mediaSegmento === null || turma.desvio === null)
    return `<div style="font-size:12px;color:#94a3b8">Sem base de comparação: o segmento precisa de ao menos 3 turmas.</div>`;

  const itens = [
    { nome: turma.turma, valor: Math.round(turma.porAluno * 100) / 100, destaque: true },
    { nome: "Média das outras de " + (turma.segmento || "—"), valor: Math.round(turma.mediaSegmento * 100) / 100 },
  ];
  const max = Math.max(...itens.map(i => i.valor)) || 1;
  const rotulo = 240, larguraBarra = largura - rotulo - 60;

  const linhas = itens.map((it, i) => {
    const yb = i * 30;
    const w = Math.max(2, (it.valor / max) * larguraBarra);
    const cor = it.destaque ? (turma.desvio > 25 ? CORES.atencao : CORES.neutro) : "#cbd5e1";
    return `
      <text x="0" y="${yb + 16}" font-size="10.5" font-weight="${it.destaque ? 700 : 400}" fill="${CORES.titulo}" ${FONTE}>${esc(it.nome)}</text>
      <rect x="${rotulo}" y="${yb + 5}" width="${w}" height="15" rx="3" fill="${cor}"/>
      <text x="${rotulo + w + 6}" y="${yb + 16.5}" font-size="10.5" font-weight="700" fill="${cor}" ${FONTE}>${it.valor.toFixed(2)}</text>`;
  }).join("");

  return moldura({
    titulo: "Registros de atenção por aluno",
    largura, altura: 106,
    conteudo: `${linhas}
      <text x="0" y="78" font-size="10.5" font-weight="800" fill="${turma.desvio > 0 ? CORES.atencao : "#16a34a"}" ${FONTE}>
        ${turma.desvio > 0 ? "+" : ""}${turma.desvio}% em relação às outras turmas do segmento
      </text>`,
  });
}
