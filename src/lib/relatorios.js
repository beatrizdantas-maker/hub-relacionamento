// ============================================================================
// Relatórios imprimíveis do Painel de Inteligência.
//
// Gera uma página HTML pronta para impressão e abre numa aba nova, seguindo o
// mesmo caminho já usado pela ficha do aluno. No navegador, "Imprimir" permite
// escolher "Salvar como PDF" — por isso não é preciso biblioteca de PDF.
// ============================================================================

import { graficoEvolucao, graficoSituacao, graficoSegmentos, graficoTurmas, graficoMotivos } from "./graficos";

const esc = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const hoje = () => new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

/** Seta de variação. Em registros de atenção, subir é ruim. */
const seta = (v, inverso = true) => {
  if (v === null || v === undefined) return "";
  if (v === 0) return `<span class="delta neutro">estável</span>`;
  const ruim = inverso ? v > 0 : v < 0;
  return `<span class="delta ${ruim ? "ruim" : "bom"}">${v > 0 ? "▲" : "▼"} ${Math.abs(v)}%</span>`;
};

const barra = (qtd, max, cor) =>
  `<div class="bar"><div class="bar-in" style="width:${max ? Math.max(3, (qtd / max) * 100) : 0}%;background:${cor}"></div></div>`;

const listaBarras = (itens, cor) => {
  if (!itens || !itens.length) return `<div class="vazio">Sem registros.</div>`;
  const max = itens[0].qtd;
  return itens.map(i => `
    <div class="linha">
      <div class="linha-topo"><span>${esc(i.nome)}</span><b>${i.qtd}</b></div>
      ${barra(i.qtd, max, cor)}
    </div>`).join("");
};

const CSS = `
@page { size: A4; margin: 14mm 12mm; }
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',system-ui,-apple-system,sans-serif;color:#1e293b;background:#f1f5f9;font-size:12px}
.pg{max-width:820px;margin:0 auto;background:#fff;padding:26px 30px 34px}
.topo{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:3px solid #1a4f8a;padding-bottom:14px;margin-bottom:18px}
.topo h1{font-size:19px;font-weight:800;line-height:1.25}
.topo .sub{font-size:12px;color:#64748b;margin-top:3px}
.topo .escola{font-size:13px;font-weight:700;color:#1a4f8a;text-align:right}
.topo .data{font-size:11px;color:#94a3b8;text-align:right;margin-top:2px}
.logo{height:52px;width:auto;object-fit:contain}
h2{font-size:14px;font-weight:800;margin:22px 0 10px;padding-bottom:5px;border-bottom:1px solid #e2e8f0}
h3{font-size:13px;font-weight:800;margin:16px 0 8px;color:#334155}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:8px}
.kpi{border:1px solid #e2e8f0;border-radius:9px;padding:9px 11px;background:#f8fafc}
.kpi .l{font-size:9.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.03em}
.kpi .v{font-size:20px;font-weight:900;margin-top:3px;line-height:1}
.kpi .r{font-size:9.5px;color:#94a3b8;margin-top:3px}
.delta{font-size:10px;font-weight:800;margin-left:5px}
.delta.ruim{color:#ef4444}.delta.bom{color:#16a34a}.delta.neutro{color:#94a3b8}
table{width:100%;border-collapse:collapse;margin-top:8px}
th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.03em;color:#94a3b8;font-weight:700;padding:6px 8px;border-bottom:1.5px solid #e2e8f0}
td{padding:7px 8px;border-bottom:1px solid #f1f5f9;font-size:11.5px;vertical-align:top}
td.num,th.num{text-align:right;white-space:nowrap}
tr.destaque td{background:#fef2f2}
.tag{display:inline-block;padding:1.5px 8px;border-radius:20px;font-size:9.5px;font-weight:800}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.linha{margin-bottom:7px}
.linha-topo{display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:2.5px;gap:8px}
.bar{height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden}
.bar-in{height:100%;border-radius:3px}
.vazio{font-size:11.5px;color:#94a3b8;padding:6px 0}
.caixa{border:1px solid #e2e8f0;border-radius:9px;padding:12px 14px;margin-bottom:9px;background:#f8fafc}
.caixa.alerta{background:#fef2f2;border-color:#fecaca}
.caixa.bom{background:#f0fdf4;border-color:#bbf7d0}
.nota{font-size:10.5px;color:#64748b;font-style:italic;margin-top:6px;line-height:1.55}
.rodape{margin-top:26px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between;gap:12px}
.graficos{margin:16px 0 22px}
.graficos svg{display:block}
.quebra{page-break-before:always}
.evita-quebra{page-break-inside:avoid}
.barra-acao{position:sticky;top:0;background:#1a4f8a;color:#fff;padding:11px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:13px}
.barra-acao button{background:#fff;color:#1a4f8a;border:none;border-radius:7px;padding:8px 18px;font-weight:800;cursor:pointer;font-size:13px;font-family:inherit}
@media print{.barra-acao{display:none}body{background:#fff}.pg{max-width:none;padding:0}}
`;

const NIVEL_COR = { "PRIORITÁRIO": "#7c3aed", "ALTO": "#ef4444", "MODERADO": "#f59e0b", "BAIXO": "#22c55e" };

function moldura({ titulo, subtitulo, escola, profile, corpo }) {
  const logo = escola && escola.logo_url
    ? `<img class="logo" src="${esc(escola.logo_url)}" alt="" />`
    : `<div class="escola">${esc((escola && escola.nome) || "Escola")}</div>`;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${esc(titulo)}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="barra-acao">
  <span>Use <b>Imprimir</b> e escolha <b>“Salvar como PDF”</b> no destino para gerar o arquivo.</span>
  <button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
</div>
<div class="pg">
  <div class="topo">
    <div>
      <h1>${esc(titulo)}</h1>
      <div class="sub">${esc(subtitulo)}</div>
    </div>
    <div>
      ${logo}
      <div class="data">Emitido em ${hoje()}</div>
    </div>
  </div>
  ${corpo}
  <div class="rodape">
    <span>${esc((escola && escola.nome) || "")} · Documento de uso interno, com dados sensíveis de estudantes.</span>
    <span>Emitido por ${esc((profile && profile.nome) || "—")}</span>
  </div>
</div></body></html>`;
}

function abrir(html) {
  const win = window.open("", "_blank");
  if (!win) { alert("O navegador bloqueou a janela. Libere os pop-ups para este site e tente de novo."); return; }
  win.document.write(html);
  win.document.close();
}

// ── RELATÓRIO POR TURMA ────────────────────────────────────────────────────
export function relatorioPorTurma({ turmas, periodo, escola, profile }) {
  if (!turmas.length) { alert("Nenhuma turma com dados no período selecionado."); return; }

  const secoes = turmas.map((t, i) => {
    const alunosLinhas = t.alunosDetalhe.length
      ? t.alunosDetalhe.map(a => `<tr${a.criticos ? ' class="destaque"' : ""}>
          <td>${esc(a.nome)}</td>
          <td class="num">${a.qtd}</td>
          <td class="num">${a.criticos || "—"}</td>
        </tr>`).join("")
      : `<tr><td colspan="3" class="vazio">Nenhum registro de atenção nesta turma no período.</td></tr>`;

    const leitura = t.desvio === null
      ? `O segmento tem menos de 3 turmas, então não há comparação estatística possível.`
      : t.desvio > 25
        ? `Esta turma registra <b>${t.desvio}% acima</b> da média das outras turmas de ${esc(t.segmento)}.`
        : t.desvio < -25
          ? `Esta turma registra <b>${Math.abs(t.desvio)}% abaixo</b> da média das outras turmas de ${esc(t.segmento)}.`
          : `O volume está dentro da média das outras turmas de ${esc(t.segmento)}.`;

    const concentracao = t.alunosEnvolvidos
      ? `Os ${t.negativos} registro(s) se concentram em <b>${t.alunosEnvolvidos} aluno(s)</b> — média de ${t.concentracao} por aluno envolvido.
         ${t.alunosEnvolvidos <= 2 && t.negativos >= 4
           ? "Volume alto concentrado em poucos alunos: provavelmente é caso individual, não dinâmica de turma."
           : t.alunosEnvolvidos >= 5
             ? "Registros distribuídos entre vários alunos: vale olhar a dinâmica da turma, não só casos isolados."
             : ""}`
      : "";

    return `<div class="${i > 0 ? "quebra" : ""}">
      <h2>${esc(t.turma)} <span style="font-weight:500;color:#94a3b8">· ${esc(t.segmento || "—")} · ${t.totalAlunos} alunos</span></h2>
      <div class="kpis">
        <div class="kpi"><div class="l">Registros</div><div class="v">${t.registros}</div><div class="r">no período</div></div>
        <div class="kpi"><div class="l">De atenção</div><div class="v" style="color:#ef4444">${t.negativos}${seta(t.variacao)}</div><div class="r">vs. período anterior</div></div>
        <div class="kpi"><div class="l">Positivos</div><div class="v" style="color:#16a34a">${t.positivos}</div><div class="r">elogios e avanços</div></div>
        <div class="kpi"><div class="l">Críticos</div><div class="v" style="color:#ef4444">${t.criticos}</div><div class="r">urgência alta em aberto</div></div>
        <div class="kpi"><div class="l">Resolvidos</div><div class="v" style="color:#16a34a">${t.resolvidos}</div><div class="r">de ${t.registros}</div></div>
        <div class="kpi"><div class="l">Enc. em aberto</div><div class="v" style="color:#f59e0b">${t.encPendentes}</div><div class="r">aguardando setor</div></div>
      </div>

      <div class="caixa ${t.desvio > 25 ? "alerta" : ""}" style="margin-top:12px">
        <b>Comparação com o segmento.</b> ${leitura}
        ${t.porAluno !== null ? `<div class="nota">Esta turma: ${t.porAluno.toFixed(2)} registros de atenção por aluno · Média das outras turmas de ${esc(t.segmento)}: ${t.mediaSegmento === null ? "—" : t.mediaSegmento.toFixed(2)}.</div>` : ""}
        ${concentracao ? `<div class="nota">${concentracao}</div>` : ""}
      </div>

      ${t.motivos.length ? `<div class="graficos evita-quebra">${graficoMotivos(t.motivos, { largura: 700, titulo: "Motivos de atenção em " + esc(t.turma) })}</div>` : ""}

      <div class="cols evita-quebra">
        <div>
          ${t.positivosTemas.length ? `<h3>Registros positivos</h3>${listaBarras(t.positivosTemas, "#22c55e")}` : ""}
          ${t.setores.length ? `<h3>Setores acionados</h3>${listaBarras(t.setores, "#7c3aed")}` : ""}
        </div>
        <div>
          <h3>Quem registrou</h3>
          ${listaBarras(t.profissionais, "#2563eb")}
        </div>
      </div>

      <h3>Alunos com registros de atenção</h3>
      <table>
        <thead><tr><th>Aluno</th><th class="num">Registros</th><th class="num">Urgência alta</th></tr></thead>
        <tbody>${alunosLinhas}</tbody>
      </table>
      <div class="nota">Linhas destacadas indicam aluno com registro de urgência alta. Presença nesta lista significa necessidade de acompanhamento, não julgamento sobre o estudante.</div>
    </div>`;
  }).join("");

  abrir(moldura({
    titulo: turmas.length === 1 ? `Relatório da Turma ${turmas[0].turma}` : "Relatório por Turma",
    subtitulo: `${periodo}${turmas.length > 1 ? ` · ${turmas.length} turmas` : ""}`,
    escola, profile, corpo: secoes,
  }));
}

// ── RELATÓRIO POR SETOR ────────────────────────────────────────────────────
export function relatorioPorSetor({ setores, periodo, escola, profile, nomePorAluno }) {
  if (!setores.length) { alert("Nenhum encaminhamento registrado no período selecionado."); return; }

  const totais = setores.reduce((a, s) => ({
    recebidos: a.recebidos + s.recebidos,
    pendentes: a.pendentes + s.pendentes,
    resolvidos: a.resolvidos + s.resolvidos,
    parados: a.parados + s.parados.length,
  }), { recebidos: 0, pendentes: 0, resolvidos: 0, parados: 0 });

  const visaoGeral = `
    <div class="kpis">
      <div class="kpi"><div class="l">Encaminhamentos</div><div class="v">${totais.recebidos}</div><div class="r">no período</div></div>
      <div class="kpi"><div class="l">Resolvidos</div><div class="v" style="color:#16a34a">${totais.recebidos ? Math.round(totais.resolvidos / totais.recebidos * 100) : 0}%</div><div class="r">${totais.resolvidos} de ${totais.recebidos}</div></div>
      <div class="kpi"><div class="l">Em aberto</div><div class="v" style="color:#f59e0b">${totais.pendentes}</div><div class="r">aguardando resposta</div></div>
      <div class="kpi"><div class="l">Parados</div><div class="v" style="color:#ef4444">${totais.parados}</div><div class="r">7 dias ou mais sem retorno</div></div>
      <div class="kpi"><div class="l">Setores</div><div class="v">${setores.length}</div><div class="r">acionados</div></div>
    </div>

    <div class="graficos evita-quebra">
      ${graficoMotivos(setores.map(s => ({ nome: s.setor, qtd: s.recebidos })), { largura: 700, titulo: "Encaminhamentos recebidos por setor", cor: "#7c3aed" })}
      ${setores.some(s => s.parados.length) ? graficoMotivos(
          setores.filter(s => s.parados.length).map(s => ({ nome: s.setor, qtd: s.parados.length })),
          { largura: 700, titulo: "Casos parados por setor (7 dias ou mais)" }) : ""}
    </div>

    <h2>Comparativo entre setores</h2>
    <table>
      <thead><tr>
        <th>Setor</th><th class="num">Recebidos</th><th class="num">Resolvidos</th>
        <th class="num">Em aberto</th><th class="num">Parados</th><th class="num">Tempo médio</th>
      </tr></thead>
      <tbody>${setores.map(s => `<tr${s.parados.length ? ' class="destaque"' : ""}>
        <td><b>${esc(s.setor)}</b></td>
        <td class="num">${s.recebidos}${seta(s.variacao)}</td>
        <td class="num">${s.percResolvido}%</td>
        <td class="num">${s.pendentes}</td>
        <td class="num">${s.parados.length || "—"}</td>
        <td class="num">${s.tempoMedio !== null ? s.tempoMedio + " d" : "—"}</td>
      </tr>`).join("")}</tbody>
    </table>
    <div class="nota">O tempo médio usa apenas os casos cujo texto de resolução traz data registrada, por isso a amostra costuma ser menor que o total. Linhas destacadas têm casos parados há 7 dias ou mais.</div>`;

  const detalhes = setores.map(s => `
    <div class="quebra">
      <h2>${esc(s.setor)}</h2>
      <div class="kpis">
        <div class="kpi"><div class="l">Recebidos</div><div class="v">${s.recebidos}${seta(s.variacao)}</div><div class="r">vs. período anterior</div></div>
        <div class="kpi"><div class="l">Resolvidos</div><div class="v" style="color:#16a34a">${s.percResolvido}%</div><div class="r">${s.resolvidos} de ${s.recebidos}</div></div>
        <div class="kpi"><div class="l">Em aberto</div><div class="v" style="color:#f59e0b">${s.pendentes}</div><div class="r">na fila</div></div>
        <div class="kpi"><div class="l">Críticos abertos</div><div class="v" style="color:#ef4444">${s.criticos}</div><div class="r">urgência alta</div></div>
        <div class="kpi"><div class="l">Tempo médio</div><div class="v">${s.tempoMedio !== null ? s.tempoMedio + " d" : "—"}</div><div class="r">${s.amostraTempo ? "sobre " + s.amostraTempo + " caso(s)" : "sem data registrada"}</div></div>
      </div>

      <div class="cols evita-quebra">
        <div><h3>Motivos que chegam a este setor</h3>${listaBarras(s.motivos, "#7c3aed")}</div>
        <div><h3>Responsáveis designados</h3>${listaBarras(s.responsaveis, "#2563eb")}</div>
      </div>

      <h3>Casos parados há 7 dias ou mais</h3>
      ${s.parados.length ? `<table>
        <thead><tr><th class="num">Dias</th><th>Aluno</th><th>Motivo</th><th>Responsável</th></tr></thead>
        <tbody>${s.parados.map(p => `<tr${p.dias >= 30 ? ' class="destaque"' : ""}>
          <td class="num"><b>${p.dias}</b></td>
          <td>${esc(nomePorAluno(p.aluno_id))}</td>
          <td>${esc(p.motivo || "—")}</td>
          <td>${esc(p.responsavel || "não designado")}</td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="nota">Casos sem qualquer atualização registrada. Linhas destacadas estão paradas há 30 dias ou mais.</div>`
      : `<div class="caixa bom">Nenhum caso parado neste setor. A fila está em dia.</div>`}
    </div>`).join("");

  abrir(moldura({
    titulo: "Relatório por Setor",
    subtitulo: `${periodo} · ${setores.length} setores · ${totais.recebidos} encaminhamentos`,
    escola, profile, corpo: visaoGeral + detalhes,
  }));
}

// ── RELATÓRIO EXECUTIVO ────────────────────────────────────────────────────
export function relatorioExecutivo({ saude, atencao, turmas, positivos, recortes, analise, serie, usuarios, periodo, escola, profile, nomePorAluno }) {
  const destaqueTurmas = turmas.filter(t => t.desvio !== null && t.desvio > 25 && t.negativos >= 3).slice(0, 8);

  const blocoIA = analise ? `
    <h2>Leitura e recomendações</h2>
    ${analise.sintese ? `<div class="caixa"><b>${esc(analise.sintese)}</b></div>` : ""}
    ${analise.observar_agora ? `<div class="caixa alerta"><b>O que observar agora.</b> ${esc(analise.observar_agora)}</div>` : ""}
    ${Array.isArray(analise.prioridades) && analise.prioridades.length ? `
      <h3>Prioridades do período</h3>
      <table>
        <thead><tr><th class="num">#</th><th>Prioridade</th><th>Sustentação</th><th>Ação recomendada</th></tr></thead>
        <tbody>${analise.prioridades.map((p, i) => `<tr>
          <td class="num"><b>${i + 1}</b></td>
          <td><b>${esc(p.titulo)}</b></td>
          <td>${esc(p.detalhe || "—")}</td>
          <td>${esc(p.acao || "—")}</td>
        </tr>`).join("")}</tbody>
      </table>` : ""}
    ${Array.isArray(analise.atencao_silenciosa) && analise.atencao_silenciosa.length ? `
      <h3>Padrões que passariam despercebidos</h3>
      ${analise.atencao_silenciosa.map(t => `<div class="caixa">${esc(t)}</div>`).join("")}` : ""}
    <div class="nota">Leitura gerada por IA a partir dos indicadores desta página. Os números são calculados pelo sistema; a interpretação é sugestão e não substitui a avaliação da equipe.</div>
  ` : `<div class="caixa"><b>Sem leitura de IA neste relatório.</b><div class="nota">Para incluir, clique em “Gerar Análise com IA” no painel antes de emitir o relatório.</div></div>`;

  const corpo = `
    <h2>Saúde do relacionamento</h2>
    <div class="kpis">
      <div class="kpi"><div class="l">Registros</div><div class="v">${saude.total}${seta(saude.variacaoTotal)}</div><div class="r">vs. período anterior</div></div>
      <div class="kpi"><div class="l">Resolvidos</div><div class="v" style="color:#16a34a">${saude.percResolvidos}%</div><div class="r">${saude.resolvidos} de ${saude.total}</div></div>
      <div class="kpi"><div class="l">Em acompanhamento</div><div class="v" style="color:#f59e0b">${saude.pendentes}</div><div class="r">${saude.encPendentes} enc. em aberto</div></div>
      <div class="kpi"><div class="l">Críticos</div><div class="v" style="color:#ef4444">${saude.criticos}</div><div class="r">urgência alta em aberto</div></div>
      <div class="kpi"><div class="l">Positivos</div><div class="v" style="color:#16a34a">${saude.positivos}${seta(positivos.variacao, false)}</div><div class="r">elogios e avanços</div></div>
      <div class="kpi"><div class="l">Tempo de resolução</div><div class="v">${saude.tempoMedioResolucao !== null ? saude.tempoMedioResolucao + " d" : "—"}</div><div class="r">${saude.amostraTempo ? "sobre " + saude.amostraTempo + " caso(s)" : "sem dado"}</div></div>
    </div>

    <div class="graficos evita-quebra">
      ${serie ? graficoEvolucao(serie, { largura: 700 }) : ""}
      <div class="cols" style="margin-top:14px">
        <div>${graficoSituacao(saude, { largura: 320 })}</div>
        <div>${graficoMotivos(recortes.queixas, { largura: 340 })}</div>
      </div>
      <div style="margin-top:14px">${graficoTurmas(turmas, { largura: 700 })}</div>
      <div style="margin-top:14px">${graficoSegmentos(recortes.segmentos, { largura: 700 })}</div>
    </div>

    ${blocoIA}

    <div class="quebra"></div>
    <h2>Alunos que merecem atenção</h2>
    <table>
      <thead><tr><th>Aluno</th><th>Turma</th><th>Nível</th><th class="num">Registros</th><th>Por que aparece aqui</th></tr></thead>
      <tbody>${atencao.length ? atencao.map(a => `<tr>
        <td><b>${esc(a.nome)}</b></td>
        <td>${esc(a.turma || "—")}</td>
        <td><span class="tag" style="color:${NIVEL_COR[a.nivel]};background:${NIVEL_COR[a.nivel]}20">${a.nivel}</span></td>
        <td class="num">${a.registros}</td>
        <td>${esc(a.porques.join(" · "))}</td>
      </tr>`).join("") : `<tr><td colspan="5" class="vazio">Nenhum aluno com registros de atenção no período.</td></tr>`}</tbody>
    </table>
    <div class="nota">“Nível de atenção” indica necessidade de acompanhamento pedagógico, não classificação do estudante.</div>

    <h2>Turmas acima da média do segmento</h2>
    ${destaqueTurmas.length ? `<table>
      <thead><tr><th>Turma</th><th>Segmento</th><th class="num">Registros</th><th class="num">Alunos</th><th class="num">Acima da média</th></tr></thead>
      <tbody>${destaqueTurmas.map(t => `<tr>
        <td><b>${esc(t.turma)}</b></td><td>${esc(t.segmento || "—")}</td>
        <td class="num">${t.negativos}</td><td class="num">${t.alunos}</td>
        <td class="num" style="color:#ef4444"><b>+${t.desvio}%</b></td>
      </tr>`).join("")}</tbody></table>
      <div class="nota">Comparação feita contra as demais turmas do mesmo segmento. Turma com poucos alunos pode apresentar percentual alto a partir de poucos registros — confira a coluna de registros antes de concluir.</div>`
      : `<div class="caixa bom">Nenhuma turma destoa da média do seu segmento no período.</div>`}

    <div class="cols">
      <div>
        <h2>Principais motivos de atenção</h2>
        ${listaBarras(recortes.queixas, "#ef4444")}
      </div>
      <div>
        <h2>Setores mais acionados</h2>
        ${listaBarras(recortes.setores, "#7c3aed")}
      </div>
    </div>

    <h2>O que está indo bem</h2>
    <div class="cols">
      <div>
        <h3>Temas positivos mais citados</h3>
        ${listaBarras(positivos.temas, "#22c55e")}
      </div>
      <div>
        ${positivos.reducoes.length ? `<h3>Problemas que diminuíram</h3>
          ${positivos.reducoes.map(r => `<div class="linha"><div class="linha-topo"><span>${esc(r.nome)}</span><b style="color:#16a34a">▼ ${r.queda}%</b></div><div class="nota" style="margin:0">${r.antes} → ${r.agora} registros</div></div>`).join("")}` : ""}
        ${positivos.melhoraram.length ? `<h3>Alunos com evolução positiva</h3>
          ${positivos.melhoraram.map(m => `<div class="linha"><div class="linha-topo"><span>${esc(m.nome)} <span style="color:#94a3b8">· ${esc(m.turma || "—")}</span></span><b style="color:#16a34a">${m.antes} → ${m.agora}</b></div></div>`).join("")}` : ""}
      </div>
    </div>

    ${recortes.emergentes.length ? `<h2>Temas emergentes</h2>
      <table><thead><tr><th>Tema</th><th class="num">Antes</th><th class="num">Agora</th><th class="num">Variação</th></tr></thead>
      <tbody>${recortes.emergentes.map(t => `<tr>
        <td>${esc(t.nome)}</td><td class="num">${t.antes}</td><td class="num">${t.agora}</td>
        <td class="num" style="color:#ef4444">${t.alta !== null ? "+" + t.alta + "%" : "novo"}</td>
      </tr>`).join("")}</tbody></table>` : ""}

    ${usuarios && usuarios.length ? `<h2>Tempo de resposta por usuário</h2>
      <table><thead><tr>
        <th>Profissional</th><th class="num">Tempo médio</th><th class="num">Recebidos</th>
        <th class="num">Resolvidos</th><th class="num">Em aberto</th><th class="num">Parados</th><th class="num">Registrou</th>
      </tr></thead><tbody>${usuarios.map(u => `<tr${u.parados ? ' class="destaque"' : ""}>
        <td><b>${esc(u.nome)}</b></td>
        <td class="num">${u.tempoMedio === null ? "—" : u.tempoMedio + " d"}${u.amostra ? ` <span style="color:#94a3b8">(${u.amostra})</span>` : ""}</td>
        <td class="num">${u.recebidos || "—"}</td>
        <td class="num">${u.percResolvido === null ? "—" : u.percResolvido + "%"}</td>
        <td class="num">${u.pendentes || "—"}</td>
        <td class="num">${u.parados || "—"}${u.maisAntigo ? ` <span style="color:#94a3b8">(${u.maisAntigo}d)</span>` : ""}</td>
        <td class="num">${u.registrou || "—"}</td>
      </tr>`).join("")}</tbody></table>
      <div class="nota">O número entre parênteses no tempo médio é a quantidade de casos com data de resolução registrada — só esses entram na conta. Indicador de distribuição de carga, não de avaliação individual.</div>` : ""}

    ${recortes.parados.length ? `<h2>Casos sem acompanhamento há 7 dias ou mais</h2>
      <table><thead><tr><th class="num">Dias</th><th>Aluno</th><th>Motivo</th><th>Setor</th><th>Responsável</th></tr></thead>
      <tbody>${recortes.parados.map(p => `<tr${p.dias >= 30 ? ' class="destaque"' : ""}>
        <td class="num"><b>${p.dias}</b></td><td>${esc(p.aluno || "—")}</td><td>${esc(p.titulo || "—")}</td>
        <td>${esc(p.destino || "—")}</td><td>${esc(p.responsavel || "não designado")}</td>
      </tr>`).join("")}</tbody></table>
      ${recortes.totalParados > recortes.parados.length ? `<div class="nota">Exibindo ${recortes.parados.length} de ${recortes.totalParados} casos parados.</div>` : ""}` : ""}
  `;

  abrir(moldura({ titulo: "Relatório Executivo do Relacionamento", subtitulo: periodo, escola, profile, corpo }));
}
