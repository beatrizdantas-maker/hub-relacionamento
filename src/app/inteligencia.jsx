"use client";
import { useState, useMemo } from "react";
import { apiPost } from "../lib/api-client";
import {
  PERIODOS, fatiarPeriodo, calcularSaude, calcularAtencaoAlunos, calcularTurmas,
  calcularPontosPositivos, calcularRecortes, montarResumoParaIA,
  calcularSetores, detalharTurma, calcularSerie, calcularTempoPorUsuario,
  amostraDeRelatos, classificarRelatos,
} from "../lib/inteligencia";
import { graficoEvolucao, graficoSituacao, graficoSegmentos, graficoTurmas, graficoMotivos,
         graficoValores, graficoDuplo } from "../lib/graficos";
import { relatorioPorTurma, relatorioPorSetor, relatorioExecutivo, relatorioAnaliseIA } from "../lib/relatorios";

const CORES_NIVEL = {
  "PRIORITÁRIO": "#7c3aed",
  "ALTO": "#ef4444",
  "MODERADO": "#f59e0b",
  "BAIXO": "#22c55e",
};

const Bloco = ({ titulo, icone, children, sub }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 16 }}>{icone}</span>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#1e293b" }}>{titulo}</h3>
      {sub && <span style={{ fontSize: 11, color: "#94a3b8" }}>{sub}</span>}
    </div>
    {children}
  </div>
);

const Vazio = ({ children }) => (
  <div style={{ fontSize: 13, color: "#94a3b8", padding: "8px 0" }}>{children}</div>
);

/** Seta de variação: para registros de atenção, subir é ruim. */
const Delta = ({ valor, inverso }) => {
  if (valor === null || valor === undefined) return null;
  const subiu = valor > 0;
  const ruim = inverso ? subiu : !subiu;
  if (valor === 0) return <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>estável</span>;
  return (
    <span style={{ fontSize: 11, fontWeight: 800, color: ruim ? "#ef4444" : "#16a34a" }}>
      {subiu ? "↑" : "↓"} {Math.abs(valor)}%
    </span>
  );
};

const Kpi = ({ label, valor, cor = "#1e293b", delta, inverso, rodape }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
      <span style={{ fontSize: 26, fontWeight: 900, color: cor, lineHeight: 1 }}>{valor}</span>
      <Delta valor={delta} inverso={inverso} />
    </div>
    {rodape && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>{rodape}</div>}
  </div>
);

/** Barra proporcional simples — evita dependência de biblioteca de gráfico. */
const Barra = ({ nome, qtd, max, cor = "#2563eb", direita }) => (
  <div style={{ marginBottom: 9 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, marginBottom: 3 }}>
      <span style={{ color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nome}</span>
      <span style={{ color: "#64748b", fontWeight: 700, flexShrink: 0 }}>{direita != null ? direita : qtd}</span>
    </div>
    <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: (max ? Math.max(3, (qtd / max) * 100) : 0) + "%", height: "100%", background: cor, borderRadius: 3 }} />
    </div>
  </div>
);

/** Insere o SVG gerado pela lib de gráficos. Conteúdo próprio, sem entrada de terceiros. */
const Grafico = ({ svg }) => <div dangerouslySetInnerHTML={{ __html: svg }} />;

export default function InteligenciaPage({ comunicacoes, alunos, escola, profile, equipe }) {
  const [periodoId, setPeriodoId] = useState("30");
  const [segmento, setSegmento] = useState("");
  const [analise, setAnalise] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [erroIA, setErroIA] = useState(null);
  const [turmaRel, setTurmaRel] = useState("");
  const [temas, setTemas] = useState(null);
  const [lendoRelatos, setLendoRelatos] = useState(false);
  const [erroTemas, setErroTemas] = useState(null);

  const segmentos = useMemo(
    () => [...new Set(alunos.map(a => a.segmento).filter(Boolean))].sort(),
    [alunos]
  );

  const dados = useMemo(() => {
    const periodo = PERIODOS.find(p => p.id === periodoId) || PERIODOS[0];

    const alunosFiltrados = segmento ? alunos.filter(a => a.segmento === segmento) : alunos;
    const idsPermitidos = new Set(alunosFiltrados.map(a => a.id));
    const base = segmento ? comunicacoes.filter(c => idsPermitidos.has(c.aluno_id)) : comunicacoes;

    const { atual, anterior } = fatiarPeriodo(base, periodo.dias);
    const saude = calcularSaude(atual, anterior);
    const atencao = calcularAtencaoAlunos(atual, anterior, alunosFiltrados);
    const turmas = calcularTurmas(atual, alunosFiltrados);
    const positivos = calcularPontosPositivos(atual, anterior, alunosFiltrados);
    const recortes = calcularRecortes(atual, anterior, alunosFiltrados);

    const setores = calcularSetores(atual, anterior, temas);
    const serie = calcularSerie(atual, periodo.dias);
    const usuarios = calcularTempoPorUsuario(atual, equipe);
    const relatos = classificarRelatos(atual, temas);

    return {
      periodo, saude, atencao, turmas, positivos, recortes, setores, serie, usuarios, relatos,
      atual, anterior, alunosFiltrados,
      resumo: montarResumoParaIA({
        saude, atencao, turmas, positivos, recortes, relatos,
        periodo: periodo.label + (segmento ? " · " + segmento : ""),
        escola,
      }),
    };
  }, [comunicacoes, alunos, equipe, periodoId, segmento, escola, temas]);

  const { saude, atencao, turmas, positivos, recortes } = dados;

  const gerarAnalise = async () => {
    setGerando(true); setErroIA(null); setAnalise(null);
    try {
      const res = await apiPost("/api/inteligencia", { resumo: dados.resumo });
      const json = await res.json();
      if (json.analise) setAnalise(json.analise);
      else setErroIA(json.error || "Não foi possível gerar a análise.");
    } catch {
      setErroIA("Erro de conexão com a IA.");
    }
    setGerando(false);
  };

  const nomePorAluno = (id) => {
    const a = alunos.find(x => x.id === id);
    return a ? a.nome : "—";
  };
  const ctx = () => ({
    periodo: dados.periodo.label + (segmento ? " · " + segmento : ""),
    escola, profile,
  });

  const turmasComDados = useMemo(
    () => turmas.filter(t => t.registros > 0).map(t => t.turma),
    [turmas]
  );

  const emitirTurma = () => {
    const alvo = turmaRel ? [turmaRel] : turmasComDados;
    const detalhes = alvo
      .map(nome => detalharTurma(dados.atual, dados.anterior, dados.alunosFiltrados, nome, turmas.find(t => t.turma === nome), temas))
      .filter(t => t.registros > 0)
      .sort((a, b) => b.negativos - a.negativos);
    relatorioPorTurma({ turmas: detalhes, ...ctx() });
  };

  const lerRelatos = async () => {
    setLendoRelatos(true); setErroTemas(null);
    try {
      const amostra = amostraDeRelatos(dados.atual);
      const res = await apiPost("/api/temas", { relatos: amostra.relatos });
      const json = await res.json();
      if (json.temas) setTemas(json.temas);
      else setErroTemas(json.error || "Não foi possível identificar os temas.");
    } catch {
      setErroTemas("Erro de conexão com a IA.");
    }
    setLendoRelatos(false);
  };

  const destaqueTurmas = turmas.filter(t => t.desvio !== null && t.desvio > 25 && t.negativos >= 3).slice(0, 6);
  const maxQueixa = recortes.queixas.length ? recortes.queixas[0].qtd : 0;
  const maxSetor = recortes.setores.length ? recortes.setores[0].qtd : 0;
  const semDados = saude.total === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Cabeçalho e filtros */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#1e293b" }}>🧠 Inteligência do Relacionamento</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Os números são calculados sobre os registros reais. A IA lê esses números e recomenda ação.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={periodoId} onChange={e => { setPeriodoId(e.target.value); setAnalise(null); setTemas(null); }}
            style={{ padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff", color: "#1e293b" }}>
            {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <select value={segmento} onChange={e => { setSegmento(e.target.value); setAnalise(null); setTemas(null); }}
            style={{ padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff", color: "#1e293b" }}>
            <option value="">Todos os segmentos</option>
            {segmentos.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={gerarAnalise} disabled={gerando || semDados}
            style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: semDados ? "#cbd5e1" : "#7c3aed", color: "#fff", fontSize: 13, fontWeight: 700, cursor: gerando || semDados ? "default" : "pointer" }}>
            {gerando ? "Analisando..." : "✨ Gerar Análise com IA"}
          </button>
        </div>
      </div>

      {semDados && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 32, border: "1px solid #f1f5f9", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          Nenhum registro no período selecionado. Experimente ampliar o período.
        </div>
      )}

      {!semDados && (<>
        {/* SAÚDE DO RELACIONAMENTO */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 12 }}>
          <Kpi label="Registros" valor={saude.total} delta={saude.variacaoTotal} inverso
            rodape={dados.periodo.dias ? "vs. " + dados.periodo.dias + " dias anteriores" : "todo o histórico"} />
          <Kpi label="Resolvidos" valor={saude.percResolvidos + "%"} cor="#16a34a"
            rodape={saude.resolvidos + " de " + saude.total} />
          <Kpi label="Em acompanhamento" valor={saude.pendentes} cor="#f59e0b"
            rodape={saude.encPendentes + " encaminhamento(s) em aberto"} />
          <Kpi label="Casos críticos" valor={saude.criticos} cor="#ef4444"
            rodape="urgência alta ainda em aberto" />
          <Kpi label="Registros positivos" valor={saude.positivos} cor="#16a34a" delta={positivos.variacao}
            rodape="elogios e avanços" />
          <Kpi label="Tempo médio de resolução"
            valor={saude.tempoMedioResolucao !== null ? saude.tempoMedioResolucao + " d" : "—"}
            rodape={saude.amostraTempo ? "sobre " + saude.amostraTempo + " caso(s) com data" : "sem dado suficiente"} />
        </div>

        {/* RELATÓRIOS IMPRIMÍVEIS */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>📄</span>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#1e293b" }}>Relatórios para imprimir ou salvar em PDF</h3>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: "#94a3b8" }}>
            Abrem em uma aba nova já formatados. Use <b>Imprimir</b> e escolha <b>&quot;Salvar como PDF&quot;</b> no destino.
            Seguem o período e o segmento selecionados acima.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => relatorioExecutivo({ saude, atencao, turmas, positivos, recortes, analise, serie: dados.serie, usuarios: dados.usuarios, relatos: dados.relatos, nomePorAluno, ...ctx() })}
              style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#1a4f8a", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              📊 Relatório Executivo
            </button>

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select value={turmaRel} onChange={e => setTurmaRel(e.target.value)}
                style={{ padding: "9px 10px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff", color: "#1e293b", maxWidth: 190 }}>
                <option value="">Todas as turmas</option>
                {turmasComDados.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={emitirTurma} disabled={!turmasComDados.length}
                style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: turmasComDados.length ? "#2563eb" : "#cbd5e1", color: "#fff", fontSize: 13, fontWeight: 700, cursor: turmasComDados.length ? "pointer" : "default" }}>
                🏫 Relatório por Turma
              </button>
            </div>

            <button onClick={() => relatorioPorSetor({ setores: dados.setores, nomePorAluno, ...ctx() })}
              disabled={!dados.setores.length}
              style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: dados.setores.length ? "#7c3aed" : "#cbd5e1", color: "#fff", fontSize: 13, fontWeight: 700, cursor: dados.setores.length ? "pointer" : "default" }}>
              🏢 Relatório por Setor
            </button>
          </div>

          {!analise && (
            <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
              💡 O Relatório Executivo inclui a leitura da IA se você clicar antes em &quot;Gerar Análise com IA&quot;.
            </div>
          )}

          {/* prévia dos comparativos que entram nos relatórios */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 14 }}>
              Comparativos incluídos nos relatórios
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              {dados.setores.length > 0 && (<>
                <Grafico svg={graficoDuplo(
                  dados.setores.map(x => ({ nome: x.setor, recebidos: x.recebidos, resolvidos: x.resolvidos, sub: x.pendentes + " em aberto" })),
                  { titulo: "Recebidos x resolvidos por setor", largura: 560,
                    serieA: { campo: "recebidos", nome: "Recebidos", cor: "#7c3aed" },
                    serieB: { campo: "resolvidos", nome: "Resolvidos", cor: "#22c55e" } })} />
                <Grafico svg={graficoValores(
                  dados.setores.map(x => ({ nome: x.setor, valor: x.tempoMedio })),
                  { titulo: "Tempo médio de resposta por setor", sufixo: " d", inverso: true, largura: 560 })} />
              </>)}
              {dados.usuarios.filter(u => u.tempoMedio !== null).length > 0 && (
                <Grafico svg={graficoValores(
                  dados.usuarios.filter(u => u.tempoMedio !== null).map(u => ({ nome: u.nome, valor: u.tempoMedio })),
                  { titulo: "Tempo médio por profissional", sufixo: " d", inverso: true, largura: 560 })} />
              )}
              {dados.usuarios.filter(u => u.recebidos > 0).length > 0 && (
                <Grafico svg={graficoDuplo(
                  dados.usuarios.filter(u => u.recebidos > 0).map(u => ({ nome: u.nome, recebidos: u.recebidos, pendentes: u.pendentes, sub: u.parados ? u.parados + " parado(s)" : "" })),
                  { titulo: "Carga por profissional", largura: 560,
                    serieA: { campo: "recebidos", nome: "Recebidos", cor: "#2563eb" },
                    serieB: { campo: "pendentes", nome: "Ainda em aberto", cor: "#f59e0b" } })} />
              )}
            </div>
          </div>
        </div>

        {/* ANÁLISE DA IA */}
        {erroIA && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 14, fontSize: 13, color: "#b91c1c" }}>{erroIA}</div>
        )}

        {analise && (
          <div style={{ background: "linear-gradient(135deg,#faf5ff,#eff6ff)", border: "1px solid #e9d5ff", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#7c3aed", letterSpacing: 0.5, marginBottom: 8 }}>✨ LEITURA DA IA</div>
            {analise.sintese && <p style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#1e293b", lineHeight: 1.5 }}>{analise.sintese}</p>}

            {analise.observar_agora && (
              <div style={{ background: "#fff", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#d97706", marginBottom: 6 }}>O QUE A GESTÃO DEVE OBSERVAR AGORA</div>
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.65 }}>{analise.observar_agora}</div>
              </div>
            )}

            {Array.isArray(analise.prioridades) && analise.prioridades.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#7c3aed", marginBottom: 8 }}>TOP {analise.prioridades.length} PRIORIDADES</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {analise.prioridades.map((p, i) => (
                    <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 12, background: "#7c3aed", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{p.titulo}</div>
                        {p.detalhe && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{p.detalhe}</div>}
                        {p.acao && <div style={{ fontSize: 12, color: "#2563eb", marginTop: 6, fontWeight: 600 }}>→ {p.acao}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
              {Array.isArray(analise.indo_bem) && analise.indo_bem.length > 0 && (
                <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#16a34a", marginBottom: 8 }}>✅ O QUE ESTÁ INDO BEM</div>
                  {analise.indo_bem.map((t, i) => (
                    <div key={i} style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.6, marginBottom: 5 }}>• {t}</div>
                  ))}
                </div>
              )}
              {Array.isArray(analise.atencao_silenciosa) && analise.atencao_silenciosa.length > 0 && (
                <div style={{ background: "#fffbeb", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#d97706", marginBottom: 8 }}>🔍 PADRÕES QUE PASSARIAM DESPERCEBIDOS</div>
                  {analise.atencao_silenciosa.map((t, i) => (
                    <div key={i} style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.6, marginBottom: 5 }}>• {t}</div>
                  ))}
                </div>
              )}
            </div>

            {/* imprimir somente esta leitura */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end",
                          marginTop: 16, paddingTop: 14, borderTop: "1px solid #e9d5ff" }}>
              <span style={{ fontSize: 11.5, color: "#94a3b8", marginRight: "auto" }}>
                Leitura da IA sobre os números do período. Confira antes de decidir.
              </span>
              <button onClick={() => relatorioAnaliseIA({ analise, saude, ...ctx() })}
                style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                🖨️ Imprimir esta análise
              </button>
              <button onClick={() => relatorioExecutivo({ saude, atencao, turmas, positivos, recortes, analise, serie: dados.serie, usuarios: dados.usuarios, relatos: dados.relatos, nomePorAluno, ...ctx() })}
                style={{ padding: "9px 16px", borderRadius: 8, border: "1.5px solid #c4b5fd", background: "#fff", color: "#6d28d9", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                📊 Relatório completo
              </button>
            </div>
          </div>
        )}

        {/* GRÁFICOS */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>📈</span>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#1e293b" }}>Gráficos do período</h3>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>entram no Relatório Executivo</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginTop: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}><Grafico svg={graficoEvolucao(dados.serie)} /></div>
            <Grafico svg={graficoSituacao(saude)} />
            <Grafico svg={graficoMotivos(recortes.queixas)} />
            <div style={{ gridColumn: "1 / -1" }}><Grafico svg={graficoTurmas(turmas)} /></div>
            <div style={{ gridColumn: "1 / -1" }}><Grafico svg={graficoSegmentos(recortes.segmentos)} /></div>
          </div>
        </div>

        {/* TEMPO DE RESPOSTA POR USUÁRIO */}
        <Bloco titulo="Tempo de resposta por usuário" icone="⏱️" sub="para equilibrar carga, não para ranquear pessoas">
          {dados.usuarios.length === 0 ? <Vazio>Nenhum encaminhamento com responsável no período.</Vazio> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 560 }}>
                <thead>
                  <tr style={{ color: "#94a3b8", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.3 }}>
                    <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1.5px solid #e2e8f0", fontWeight: 700 }}>Profissional</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1.5px solid #e2e8f0", fontWeight: 700 }}>Tempo médio</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1.5px solid #e2e8f0", fontWeight: 700 }}>Recebidos</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1.5px solid #e2e8f0", fontWeight: 700 }}>Resolvidos</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1.5px solid #e2e8f0", fontWeight: 700 }}>Em aberto</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1.5px solid #e2e8f0", fontWeight: 700 }}>Parados</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1.5px solid #e2e8f0", fontWeight: 700 }}>Registrou</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.usuarios.map(u => (
                    <tr key={u.id} style={{ background: u.parados ? "#fef2f2" : "transparent" }}>
                      <td style={{ padding: "7px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 600, color: "#1e293b" }}>{u.nome}</td>
                      <td style={{ padding: "7px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontWeight: 800,
                                   color: u.tempoMedio === null ? "#cbd5e1" : u.tempoMedio <= 3 ? "#16a34a" : u.tempoMedio <= 7 ? "#f59e0b" : "#ef4444" }}>
                        {u.tempoMedio === null ? "—" : u.tempoMedio + " d"}
                        {u.amostra > 0 && <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}> ({u.amostra})</span>}
                      </td>
                      <td style={{ padding: "7px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>{u.recebidos || "—"}</td>
                      <td style={{ padding: "7px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right", color: "#16a34a", fontWeight: 700 }}>
                        {u.percResolvido === null ? "—" : u.percResolvido + "%"}
                      </td>
                      <td style={{ padding: "7px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right", color: "#f59e0b", fontWeight: 700 }}>{u.pendentes || "—"}</td>
                      <td style={{ padding: "7px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right", color: "#ef4444", fontWeight: 700 }}>
                        {u.parados ? u.parados : "—"}
                        {u.maisAntigo > 0 && <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}> ({u.maisAntigo}d)</span>}
                      </td>
                      <td style={{ padding: "7px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right", color: "#64748b" }}>{u.registrou || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10, lineHeight: 1.6 }}>
                O número entre parênteses no tempo médio é a quantidade de casos com data de resolução registrada — só esses entram na conta.
                Em &quot;Parados&quot;, mostra os dias do caso mais antigo. Linhas em vermelho têm caso parado há 7 dias ou mais.
              </div>
            </div>
          )}
        </Bloco>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
          {/* ALUNOS QUE MERECEM ATENÇÃO */}
          <Bloco titulo="Alunos que merecem atenção" icone="🎯" sub="nível de atenção, não rótulo">
            {atencao.length === 0 ? <Vazio>Nenhum aluno com registros de atenção no período.</Vazio> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {atencao.slice(0, 8).map(a => (
                  <div key={a.id} style={{ borderLeft: "3px solid " + CORES_NIVEL[a.nivel], paddingLeft: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{a.nome}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: CORES_NIVEL[a.nivel], background: CORES_NIVEL[a.nivel] + "18", padding: "2px 8px", borderRadius: 10 }}>{a.nivel}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{a.turma}</div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>{a.porques.join(" · ")}</div>
                  </div>
                ))}
              </div>
            )}
          </Bloco>

          {/* TURMAS ACIMA DA MÉDIA */}
          <Bloco titulo="Turmas acima da média" icone="🏫" sub="comparado ao próprio segmento">
            {destaqueTurmas.length === 0 ? <Vazio>Nenhuma turma destoa da média do seu segmento no período.</Vazio> : (
              destaqueTurmas.map(t => (
                <div key={t.turma} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
                    <span style={{ color: "#1e293b", fontWeight: 600 }}>{t.turma}</span>
                    <span style={{ color: "#ef4444", fontWeight: 800 }}>+{t.desvio}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {t.negativos} registro(s) de atenção · {t.alunos} alunos · {t.segmento}
                  </div>
                </div>
              ))
            )}
          </Bloco>

          {/* TEMAS DE ATENÇÃO — extraídos do texto do relato */}
          <Bloco titulo="Principais temas de atenção" icone="📌"
            sub={dados.relatos ? "lidos do texto do relato" : "clique para ler os relatos"}>
            {!dados.relatos ? (
              <div>
                <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.6, marginBottom: 12 }}>
                  Abaixo, os temas saem do <b>que foi escrito no relato</b>, e não do motivo escolhido na lista —
                  que muitas vezes não descreve o que de fato aconteceu.
                </div>
                <button onClick={lerRelatos} disabled={lendoRelatos}
                  style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: lendoRelatos ? "default" : "pointer" }}>
                  {lendoRelatos ? "Lendo os relatos..." : "🔎 Analisar os relatos"}
                </button>
                {erroTemas && <div style={{ marginTop: 10, fontSize: 12, color: "#b91c1c" }}>{erroTemas}</div>}
                <details style={{ marginTop: 14 }}>
                  <summary style={{ fontSize: 11.5, color: "#94a3b8", cursor: "pointer" }}>Ver a contagem antiga, por motivo selecionado</summary>
                  <div style={{ marginTop: 10 }}>
                    {recortes.queixas.map(q => <Barra key={q.nome} nome={q.nome} qtd={q.qtd} max={maxQueixa} cor="#cbd5e1" />)}
                  </div>
                </details>
              </div>
            ) : dados.relatos.atencao.length === 0 ? (
              <Vazio>Nenhum tema identificado nos relatos de atenção do período.</Vazio>
            ) : (
              <div>
                {dados.relatos.atencao.map(t => (
                  <div key={t.nome} style={{ marginBottom: 12 }}>
                    <Barra nome={t.nome} qtd={t.qtd} max={dados.relatos.atencao[0].qtd} cor="#ef4444" />
                    {t.descricao && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: -4, lineHeight: 1.5 }}>{t.descricao}</div>}
                  </div>
                ))}
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10, lineHeight: 1.6 }}>
                  {dados.relatos.analisados.atencao} relato(s) de atenção lidos · {dados.relatos.coberturaAtencao}% se encaixaram em algum tema.
                  <button onClick={lerRelatos} disabled={lendoRelatos}
                    style={{ marginLeft: 8, background: "none", border: "none", color: "#7c3aed", fontWeight: 700, cursor: "pointer", fontSize: 11, padding: 0 }}>
                    {lendoRelatos ? "lendo..." : "reanalisar"}
                  </button>
                </div>
              </div>
            )}
          </Bloco>

          {/* O QUE ESTÁ INDO BEM */}
          <Bloco titulo="O que está indo bem" icone="⭐" sub={positivos.totalPositivos + " registros positivos"}>
            {dados.relatos && dados.relatos.positivo.length > 0 ? (<>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>TEMAS DOS RELATOS</div>
              {dados.relatos.positivo.map(t => (
                <div key={t.nome} style={{ marginBottom: 12 }}>
                  <Barra nome={t.nome} qtd={t.qtd} max={dados.relatos.positivo[0].qtd} cor="#22c55e" />
                  {t.descricao && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: -4, lineHeight: 1.5 }}>{t.descricao}</div>}
                </div>
              ))}
            </>) : positivos.temas.length > 0 && (<>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                MAIS CITADOS <span style={{ fontWeight: 500, textTransform: "none" }}>(por motivo selecionado)</span>
              </div>
              {positivos.temas.map(t => <Barra key={t.nome} nome={t.nome} qtd={t.qtd} max={positivos.temas[0].qtd} cor="#22c55e" />)}
            </>)}
            {positivos.reducoes.length > 0 && (<>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", margin: "12px 0 6px" }}>PROBLEMAS QUE DIMINUÍRAM</div>
              {positivos.reducoes.map(r => (
                <div key={r.nome} style={{ fontSize: 12.5, color: "#334155", marginBottom: 4 }}>
                  <b style={{ color: "#16a34a" }}>↓{r.queda}%</b> {r.nome} <span style={{ color: "#94a3b8" }}>({r.antes} → {r.agora})</span>
                </div>
              ))}
            </>)}
            {positivos.melhoraram.length > 0 && (<>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", margin: "12px 0 6px" }}>ALUNOS COM EVOLUÇÃO POSITIVA</div>
              {positivos.melhoraram.map(m => (
                <div key={m.nome} style={{ fontSize: 12.5, color: "#334155", marginBottom: 3 }}>
                  {m.nome} <span style={{ color: "#94a3b8" }}>· {m.turma} · {m.antes} → {m.agora} registros</span>
                </div>
              ))}
            </>)}
            {positivos.totalPositivos === 0 && positivos.reducoes.length === 0 && <Vazio>Sem destaques positivos no período.</Vazio>}
          </Bloco>

          {/* TEMAS EMERGENTES */}
          <Bloco titulo="Temas emergentes" icone="📈" sub="cresceram sobre o período anterior">
            {recortes.emergentes.length === 0 ? <Vazio>Nenhum tema em crescimento relevante.</Vazio> : (
              recortes.emergentes.map(t => (
                <div key={t.nome} style={{ marginBottom: 9, fontSize: 12.5 }}>
                  <span style={{ color: "#1e293b", fontWeight: 600 }}>{t.nome}</span>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {t.antes} → {t.agora} registros {t.alta !== null && <b style={{ color: "#ef4444" }}>(+{t.alta}%)</b>}
                    {t.alta === null && <b style={{ color: "#ef4444" }}> (novo no período)</b>}
                  </div>
                </div>
              ))
            )}
          </Bloco>

          {/* ENCAMINHAMENTOS PARADOS */}
          <Bloco titulo="Casos sem acompanhamento" icone="⏳" sub="em aberto há 7 dias ou mais">
            {recortes.parados.length === 0 ? <Vazio>Nenhum encaminhamento parado. 👏</Vazio> : (<>
              {recortes.parados.slice(0, 6).map((p, i) => (
                <div key={i} style={{ marginBottom: 9, fontSize: 12.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ color: "#1e293b", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.aluno || p.titulo}</span>
                    <span style={{ color: "#ef4444", fontWeight: 800, flexShrink: 0 }}>{p.dias}d</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.titulo} · {p.destino}{p.responsavel ? " → " + p.responsavel : ""}</div>
                </div>
              ))}
              {recortes.totalParados > 6 && (
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>e mais {recortes.totalParados - 6} caso(s).</div>
              )}
            </>)}
          </Bloco>

          {/* SETORES */}
          <Bloco titulo="Setores mais acionados" icone="🏢">
            {recortes.setores.length === 0 ? <Vazio>Nenhum encaminhamento no período.</Vazio> :
              recortes.setores.map(s => <Barra key={s.nome} nome={s.nome} qtd={s.qtd} max={maxSetor} cor="#7c3aed" />)}
          </Bloco>

          {/* SEGMENTOS */}
          <Bloco titulo="Mapa por segmento" icone="🗺️">
            {recortes.segmentos.length === 0 ? <Vazio>Sem dados por segmento.</Vazio> : (
              recortes.segmentos.map(s => (
                <div key={s.segmento} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                    <span style={{ color: "#1e293b", fontWeight: 600 }}>{s.segmento}</span>
                    <span style={{ color: "#64748b" }}>
                      <b style={{ color: "#ef4444" }}>{s.negativos}</b> atenção · <b style={{ color: "#16a34a" }}>{s.positivos}</b> positivos
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {s.alunos} alunos · {s.alunos ? (s.negativos / s.alunos).toFixed(2) : "0"} registros de atenção por aluno
                  </div>
                </div>
              ))
            )}
          </Bloco>

          {/* MOMENTO DO DIA */}
          <Bloco titulo="Momento do dia" icone="🕐" sub="a partir dos registros novos">
            {recortes.turnos.length === 0 ? (
              <Vazio>
                Ainda sem dados. O campo &quot;Momento do dia&quot; passou a ser preenchido nos registros novos —
                em algumas semanas dá para ver se as ocorrências se concentram em algum período.
              </Vazio>
            ) : (
              recortes.turnos.map(t => <Barra key={t.nome} nome={t.nome} qtd={t.qtd} max={recortes.turnos[0].qtd} cor="#0891b2" />)
            )}
          </Bloco>
        </div>
      </>)}
    </div>
  );
}
