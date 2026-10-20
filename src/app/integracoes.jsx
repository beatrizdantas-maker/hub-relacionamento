"use client";
import { useState, useEffect, useCallback } from "react";
import { apiPost } from "../lib/api-client";
import { supabase } from "../lib/supabase";

const fmt = (d) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

async function chamar(metodo, corpo) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/chaves", {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

const Caixa = ({ children, cor = "#f8fafc", borda = "#f1f5f9", style }) => (
  <div style={{ background: cor, border: "1px solid " + borda, borderRadius: 12, padding: 18, ...style }}>{children}</div>
);

export default function IntegracoesPage({ escola }) {
  const [chaves, setChaves] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [nome, setNome] = useState("");
  const [escopo, setEscopo] = useState("leitura");
  const [criando, setCriando] = useState(false);
  const [novaChave, setNovaChave] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    const { ok, json } = await chamar("GET");
    if (ok) setChaves(json.dados || []);
    else setErro(json.erro || "Não foi possível carregar as chaves.");
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const criar = async () => {
    if (nome.trim().length < 3) { setErro("Dê um nome de ao menos 3 letras."); return; }
    setCriando(true); setErro(null);
    const { ok, json } = await chamar("POST", { nome: nome.trim(), escopo });
    if (ok) { setNovaChave(json); setNome(""); setCopiado(false); carregar(); }
    else setErro(json.erro || "Não foi possível criar a chave.");
    setCriando(false);
  };

  const alternar = async (chave) => {
    const acao = chave.ativo ? "revogar" : "reativar";
    if (!confirm(`Tem certeza que deseja ${acao} a chave "${chave.nome}"?` +
      (chave.ativo ? "\n\nQualquer integração usando esta chave vai parar de funcionar imediatamente." : ""))) return;
    const { ok, json } = await chamar("PATCH", { id: chave.id, ativo: !chave.ativo });
    if (ok) carregar(); else setErro(json.erro || "Não foi possível atualizar a chave.");
  };

  const copiar = async () => {
    try { await navigator.clipboard.writeText(novaChave.chave); setCopiado(true); }
    catch { setErro("Não consegui copiar. Selecione o texto e copie manualmente."); }
  };

  const base = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#1e293b" }}>🔌 Integrações</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
          Chaves de acesso para outros sistemas lerem e gravarem dados desta escola — Make, n8n, bot de WhatsApp, planilhas.
        </p>
      </div>

      {erro && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 14, fontSize: 13, color: "#b91c1c" }}>{erro}</div>
      )}

      {/* chave recém-criada: única oportunidade de copiar */}
      {novaChave && (
        <Caixa cor="#f0fdf4" borda="#bbf7d0">
          <div style={{ fontSize: 13, fontWeight: 800, color: "#15803d", marginBottom: 6 }}>
            ✅ Chave &quot;{novaChave.nome}&quot; criada
          </div>
          <div style={{ fontSize: 12.5, color: "#166534", marginBottom: 12, lineHeight: 1.6 }}>
            <b>Copie agora.</b> Por segurança o sistema guarda apenas um resumo criptografado — esta chave
            não poderá ser vista de novo. Se perder, crie outra e revogue esta.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <code style={{ flex: 1, minWidth: 260, background: "#fff", border: "1px solid #bbf7d0", borderRadius: 8,
                           padding: "10px 12px", fontSize: 12.5, wordBreak: "break-all", color: "#166534" }}>
              {novaChave.chave}
            </code>
            <button onClick={copiar}
              style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: copiado ? "#16a34a" : "#15803d",
                       color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {copiado ? "✓ Copiado" : "Copiar"}
            </button>
            <button onClick={() => setNovaChave(null)}
              style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #bbf7d0", background: "#fff",
                       color: "#166534", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Já guardei
            </button>
          </div>
        </Caixa>
      )}

      {/* criar nova */}
      <Caixa cor="#fff">
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "#1e293b" }}>Criar nova chave</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
              Para que serve esta chave?
            </label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Bot WhatsApp da secretaria"
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#1e293b" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Permissão</label>
            <select value={escopo} onChange={e => setEscopo(e.target.value)}
              style={{ padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff", color: "#1e293b" }}>
              <option value="leitura">Somente leitura</option>
              <option value="escrita">Leitura e escrita</option>
            </select>
          </div>
          <button onClick={criar} disabled={criando}
            style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff",
                     fontSize: 13, fontWeight: 700, cursor: criando ? "default" : "pointer" }}>
            {criando ? "Criando..." : "Criar chave"}
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 10, lineHeight: 1.6 }}>
          Prefira <b>somente leitura</b> sempre que a integração só precisar consultar. Uma chave de escrita
          pode criar alunos e registrar ocorrências. Cada integração deve ter a sua própria chave — assim,
          se uma vazar, você revoga só aquela.
        </div>
      </Caixa>

      {/* lista */}
      <Caixa cor="#fff">
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "#1e293b" }}>
          Chaves desta escola {chaves.length > 0 && <span style={{ color: "#94a3b8", fontWeight: 500 }}>({chaves.length})</span>}
        </h3>

        {carregando ? <div style={{ fontSize: 13, color: "#94a3b8" }}>Carregando...</div>
          : chaves.length === 0 ? <div style={{ fontSize: 13, color: "#94a3b8" }}>Nenhuma chave criada ainda.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 620 }}>
              <thead>
                <tr style={{ color: "#94a3b8", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.3 }}>
                  {["Nome", "Chave", "Permissão", "Criada", "Último uso", "Usos", ""].map((h, i) => (
                    <th key={h + i} style={{ textAlign: i >= 5 ? "right" : "left", padding: "6px 8px", borderBottom: "1.5px solid #e2e8f0", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chaves.map(c => (
                  <tr key={c.id} style={{ opacity: c.ativo ? 1 : 0.55 }}>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, color: "#1e293b" }}>
                      {c.nome}
                      {!c.ativo && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: "#ef4444", background: "#fef2f2", padding: "2px 7px", borderRadius: 10 }}>REVOGADA</span>}
                    </td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", fontFamily: "monospace", color: "#64748b" }}>{c.prefixo}…</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 10,
                                     color: c.escopo === "escrita" ? "#b45309" : "#15803d",
                                     background: c.escopo === "escrita" ? "#fffbeb" : "#f0fdf4" }}>
                        {c.escopo === "escrita" ? "LEITURA E ESCRITA" : "SOMENTE LEITURA"}
                      </span>
                    </td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{fmt(c.created_at)}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{fmt(c.ultimo_uso)}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", textAlign: "right", color: "#64748b" }}>{c.total_usos || 0}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                      <button onClick={() => alternar(c)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                                 color: c.ativo ? "#ef4444" : "#2563eb", padding: 0 }}>
                        {c.ativo ? "Revogar" : "Reativar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Caixa>

      {/* como usar */}
      <Caixa cor="#f8fafc">
        <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: "#1e293b" }}>Como usar</h3>
        <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.7 }}>
          <p style={{ margin: "0 0 10px" }}>
            Endereço base: <code style={{ background: "#fff", padding: "2px 7px", borderRadius: 5, border: "1px solid #e2e8f0" }}>{base}/api/v1</code>
          </p>
          <p style={{ margin: "0 0 6px" }}>Envie a chave no cabeçalho de toda requisição:</p>
          <pre style={{ background: "#1e293b", color: "#e2e8f0", padding: 14, borderRadius: 8, fontSize: 11.5,
                        overflowX: "auto", lineHeight: 1.6, margin: "0 0 12px" }}>{`curl ${base}/api/v1/alunos \\
  -H "Authorization: Bearer SUA_CHAVE"`}</pre>
          <p style={{ margin: "0 0 6px" }}>Registrar uma ocorrência (precisa de chave com escrita):</p>
          <pre style={{ background: "#1e293b", color: "#e2e8f0", padding: 14, borderRadius: 8, fontSize: 11.5,
                        overflowX: "auto", lineHeight: 1.6, margin: "0 0 12px" }}>{`curl -X POST ${base}/api/v1/comunicacoes \\
  -H "Authorization: Bearer SUA_CHAVE" \\
  -H "Content-Type: application/json" \\
  -d '{"aluno_id":"...","detalhes":"Relato da ocorrência","urgencia":"MEDIA"}'`}</pre>
          <p style={{ margin: 0 }}>
            A lista completa de endereços fica em{" "}
            <code style={{ background: "#fff", padding: "2px 7px", borderRadius: 5, border: "1px solid #e2e8f0" }}>{base}/api/v1</code>
            {" "}— basta chamar com a sua chave. A escola é identificada pela própria chave, então uma integração
            nunca enxerga dados de outra escola.
          </p>
        </div>
      </Caixa>
    </div>
  );
}
