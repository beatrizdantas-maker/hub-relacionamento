"use client";
import { useState, useMemo } from "react";
import { apiPost } from "../lib/api-client";
import {
  PERIODOS, fatiarPeriodo, calcularSaude, calcularAtencaoAlunos, calcularTurmas,
  calcularPontosPositivos, calcularRecortes, montarResumoParaIA,
} from "../lib/inteligencia";

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

export default function InteligenciaPage({ comunicacoes, alunos, escola }) {
  const [periodoId, setPeriodoId] = useState("30");
  const [segmento, setSegmento] = useState("");
  const [analise, setAnalise] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [erroIA, setErroIA] = useState(null);

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

    return {
      periodo, saude, atencao, turmas, positivos, recortes,
      resumo: montarResumoParaIA({
        saude, atencao, turmas, positivos, recortes,
        periodo: periodo.label + (segmento ? " · " + segmento : ""),
        escola,
      }),
    };
  }, [comunicacoes, alunos, periodoId, segmento, escola]);

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
          <select value={periodoId} onChange={e => { setPeriodoId(e.target.value); setAnalise(null); }}
            style={{ padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff", color: "#1e293b" }}>
            {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <select value={segmento} onChange={e => { setSegmento(e.target.value); setAnalise(null); }}
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
          </div>
        )}

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

          {/* PRINCIPAIS QUEIXAS */}
          <Bloco titulo="Principais motivos de atenção" icone="📌">
            {recortes.queixas.length === 0 ? <Vazio>Sem registros de atenção no período.</Vazio> :
              recortes.queixas.map(q => <Barra key={q.nome} nome={q.nome} qtd={q.qtd} max={maxQueixa} cor="#ef4444" />)}
          </Bloco>

          {/* O QUE ESTÁ INDO BEM */}
          <Bloco titulo="O que está indo bem" icone="⭐" sub={positivos.totalPositivos + " registros positivos"}>
            {positivos.temas.length > 0 && (<>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>MAIS CITADOS</div>
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
