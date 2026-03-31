"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// ── HELPERS ────────────────────────────────────────────────────────────────────
const getRiscoColor = (r) => r >= 60 ? "#ef4444" : r >= 30 ? "#f59e0b" : "#22c55e";
const getRiscoBg = (r) => r >= 60 ? "#fef2f2" : r >= 30 ? "#fffbeb" : "#f0fdf4";
const getRiscoNivel = (r) => r >= 60 ? "ALTO" : r >= 30 ? "MÉDIO" : "BAIXO";
const getUrgColor = (u) => u === "ALTA" ? "#ef4444" : u === "MEDIA" ? "#f59e0b" : u === "BAIXA" ? "#22c55e" : "#94a3b8";
const getStColor = (s) => s === "RESOLVIDO" ? "#22c55e" : s === "EM_ANALISE" ? "#3b82f6" : "#f59e0b";
const getStLabel = (s) => s === "EM_ANALISE" ? "EM ANÁLISE" : s || "PENDENTE";
const fmtDate = () => new Date().toLocaleDateString("pt-BR");
const perfilLabel = (p) => ({ SUPER_ADMIN: "Super Admin", DIRECAO: "Direção", PSICOLOGO: "Psicólogo", SECRETARIA: "Secretária", PROFESSOR: "Professor", NUCLEO: "Núcleo Pedagógico" }[p] || p);
const SETORES = ["Psicólogo", "Psicopedagogo", "Secretária", "Professor", "Recepção", "Núcleo Pedagógico", "Direção"];

// ── UI ATOMS ───────────────────────────────────────────────────────────────────
const Badge = ({ children, color = "#3b82f6" }) => (
  <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color, background: color + "18" }}>{children}</span>
);

const Btn = ({ children, onClick, variant = "primary", small, icon, disabled, style: s }) => {
  const variants = {
    primary: { background: "#2563eb", color: "#fff", border: "none" },
    ghost: { background: "transparent", color: "#64748b", border: "1.5px solid #e2e8f0" },
    success: { background: "#f0fdf4", color: "#16a34a", border: "none" },
    danger: { background: "#fef2f2", color: "#ef4444", border: "none" },
    secondary: { background: "#f1f5f9", color: "#475569", border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: small ? "6px 14px" : "10px 20px", borderRadius: 8, fontSize: small ? 12 : 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "inherit", ...variants[variant], ...s }}>
      {icon && <span style={{ fontSize: 14 }}>{icon}</span>}{children}
    </button>
  );
};

const Input = ({ label, error, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 600, color: error ? "#ef4444" : "#475569" }}>{label}</label>}
    <input style={{ padding: "9px 13px", border: `1.5px solid ${error ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fafafa", color: "#1e293b", fontFamily: "inherit", boxSizing: "border-box", width: "100%" }} {...props} />
    {error && <span style={{ fontSize: 11, color: "#ef4444" }}>{error}</span>}
  </div>
);

const Sel = ({ label, error, children, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 600, color: error ? "#ef4444" : "#475569" }}>{label}</label>}
    <select style={{ padding: "9px 13px", border: `1.5px solid ${error ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fafafa", color: "#1e293b", fontFamily: "inherit", width: "100%" }} {...props}>{children}</select>
    {error && <span style={{ fontSize: 11, color: "#ef4444" }}>{error}</span>}
  </div>
);

const Card = ({ children, style }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,.06)", ...style }}>{children}</div>
);

const Av = ({ initials = "?", color = "#2563eb", size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: color + "18", color, fontSize: size * 0.33, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials}</div>
);

const Overlay = ({ children, onClose }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div onClick={e => e.stopPropagation()}>{children}</div>
  </div>
);

const MBox = ({ children, width = 640 }) => (
  <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: width, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,.22)", overflow: "hidden" }}>{children}</div>
);

const MHead = ({ title, subtitle, icon, onClose }) => (
  <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{title}</h2>
      </div>
      {subtitle && <p style={{ margin: "3px 0 0", fontSize: 13, color: "#94a3b8" }}>{subtitle}</p>}
    </div>
    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8", padding: 4 }}>✕</button>
  </div>
);

const MBody = ({ children }) => (
  <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
);

const MFoot = ({ children }) => (
  <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>{children}</div>
);

const FBlock = ({ num, title, children }) => (
  <div style={{ background: "#f8fafc", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{num}</div>
      <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>{title}</span>
    </div>
    {children}
  </div>
);

const Loading = ({ msg = "Carregando..." }) => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, background: "#f1f5f9", fontFamily: "system-ui,sans-serif" }}>
    <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    <p style={{ color: "#64748b", fontSize: 14 }}>{msg}</p>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

// ── MICROFONE + IA ─────────────────────────────────────────────────────────────
function CampoRelato({ value, onChange }) {
  const [gravando, setGravando] = useState(false);
  const [transcricao, setTranscricao] = useState("");
  const [resumindo, setResumindo] = useState(false);
  const [resumo, setResumo] = useState("");
  const recRef = useRef(null);
  const suportado = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const iniciar = () => {
    if (!suportado) { alert("Use o Google Chrome para gravar voz."); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "pt-BR"; rec.continuous = true; rec.interimResults = true;
    let final = value || "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
      }
      setTranscricao(interim); onChange(final + interim);
    };
    rec.onend = () => { setGravando(false); setTranscricao(""); };
    rec.start(); recRef.current = rec; setGravando(true); setResumo("");
  };

  const parar = () => { recRef.current?.stop(); setGravando(false); setTranscricao(""); };

  const resumir = async () => {
    if (!value?.trim()) return;
    setResumindo(true); setResumo("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: "Você é um assistente escolar. Resuma transcrições de conversas sobre alunos de forma clara e objetiva em português brasileiro. Use no máximo 4 frases. Foque no problema central.",
          messages: [{ role: "user", content: `Resuma:\n\n${value}` }]
        })
      });
      const data = await res.json();
      setResumo(data.content?.[0]?.text || "Não foi possível gerar o resumo.");
    } catch { setResumo("Erro ao conectar com a IA."); }
    setResumindo(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Relato *</label>
      <div style={{ position: "relative" }}>
        <textarea value={value} onChange={e => onChange(e.target.value)}
          placeholder={gravando ? "🔴 Gravando... fale agora." : "Descreva o ocorrido ou clique no microfone para gravar."}
          rows={gravando ? 5 : 4}
          style={{ width: "100%", padding: "12px 50px 12px 14px", border: `1.5px solid ${gravando ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, fontSize: gravando ? 17 : 14, lineHeight: 1.6, outline: "none", background: gravando ? "#fff5f5" : "#fafafa", color: "#1e293b", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", transition: "all .2s" }} />
        <button type="button" onClick={gravando ? parar : iniciar}
          style={{ position: "absolute", right: 10, top: 10, width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer", background: gravando ? "#ef4444" : "#2563eb", color: "#fff", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: gravando ? "0 0 0 4px rgba(239,68,68,.2)" : "none" }}>
          {gravando ? "⏹" : "🎤"}
        </button>
      </div>
      {gravando && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
          <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>Gravando em tempo real</span>
          {transcricao && <span style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>"{transcricao}"</span>}
          <Btn small variant="danger" onClick={parar} style={{ marginLeft: "auto" }}>⏹ Parar</Btn>
        </div>
      )}
      {!gravando && value?.trim().length > 40 && !resumo && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Btn small variant="secondary" onClick={resumir} disabled={resumindo} icon="✨">
            {resumindo ? "Resumindo..." : "Resumir com IA"}
          </Btn>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Gera um resumo limpo do relato</span>
        </div>
      )}
      {resumo && (
        <div style={{ padding: "14px 16px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 8 }}>✨ Resumo gerado pela IA</div>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#1e293b", lineHeight: 1.6 }}>{resumo}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small onClick={() => { onChange(resumo); setResumo(""); }} icon="✓">Usar este resumo</Btn>
            <Btn small variant="ghost" onClick={() => setResumo("")}>Manter original</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── LOGIN ──────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setErro(""); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) { setErro("E-mail ou senha inválidos."); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("*, escolas(*)").eq("id", data.user.id).single();
    onLogin(data.user, profile);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 26 }}>🏫</div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#1e293b" }}>HUB DE RELACIONAMENTO</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Autenticação Segura</p>
      </div>
      <Card style={{ width: 360, padding: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="E-mail" type="email" placeholder="nome@instituicao.edu.br" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />
          <Input label="Senha" type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} error={erro} />
          <Btn onClick={handle} disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
            {loading ? "Entrando..." : "ENTRAR"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}

// ── SUPER ADMIN ────────────────────────────────────────────────────────────────
function SuperAdminPanel({ onLogout, onEntrarEscola, profile }) {
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [nova, setNova] = useState({ nome: "", cidade: "", plano: "BÁSICO" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { carregarEscolas(); }, []);

  const carregarEscolas = async () => {
    setLoading(true);
    const { data } = await supabase.from("escolas").select("*").order("created_at", { ascending: false });
    setEscolas(data || []);
    setLoading(false);
  };

  const addEscola = async () => {
    if (!nova.nome.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("escolas").insert([{ ...nova, status: "TRIAL" }]).select().single();
    if (data) setEscolas(p => [data, ...p]);
    setNova({ nome: "", cidade: "", plano: "BÁSICO" }); setShowAdd(false); setSaving(false);
  };

  const planColor = p => p === "PRO" ? "#7c3aed" : p === "BÁSICO" ? "#2563eb" : "#f59e0b";

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏫</div>
          <div><div style={{ fontWeight: 900, fontSize: 15, color: "#1e293b" }}>HUB DE RELACIONAMENTO</div><div style={{ fontSize: 11, color: "#94a3b8" }}>Painel Super Admin</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Av initials="SA" color="#ef4444" />
          <Btn variant="ghost" small onClick={onLogout}>Sair</Btn>
        </div>
      </div>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        {loading ? <Loading msg="Carregando escolas..." /> : (
          <>
            <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
              {[{ label: "Escolas Ativas", value: escolas.filter(e => e.status === "ATIVA").length, color: "#2563eb" }, { label: "Total Escolas", value: escolas.length, color: "#7c3aed" }, { label: "Planos PRO", value: escolas.filter(e => e.plano === "PRO").length, color: "#f59e0b" }, { label: "Em Trial", value: escolas.filter(e => e.status === "TRIAL").length, color: "#059669" }].map(m => (
                <Card key={m.label} style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: m.color }}>{m.value}</div>
                </Card>
              ))}
            </div>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div><h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>Escolas Cadastradas</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>Gerencie todas as instituições</p></div>
                <Btn icon="+" onClick={() => setShowAdd(true)}>Nova Escola</Btn>
              </div>
              {escolas.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🏫</div>
                  <p>Nenhuma escola cadastrada ainda.</p>
                  <Btn onClick={() => setShowAdd(true)}>Cadastrar primeira escola</Btn>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {escolas.map(escola => (
                    <div key={escola.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 10, border: "1px solid #f1f5f9", background: "#fafafa", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: "#2563eb18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏫</div>
                        <div><div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{escola.nome}</div><div style={{ fontSize: 13, color: "#64748b" }}>{escola.cidade}</div></div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Badge color={planColor(escola.plano)}>{escola.plano}</Badge>
                        <Badge color={escola.status === "ATIVA" ? "#22c55e" : "#f59e0b"}>{escola.status}</Badge>
                        <Btn small variant="ghost" onClick={() => onEntrarEscola(escola)}>Acessar →</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
      {showAdd && (
        <Overlay onClose={() => setShowAdd(false)}>
          <MBox width={420}>
            <MHead title="Nova Escola" icon="🏫" onClose={() => setShowAdd(false)} />
            <MBody>
              <Input label="Nome *" value={nova.nome} onChange={e => setNova(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Colégio ABC" />
              <Input label="Cidade / Estado" value={nova.cidade} onChange={e => setNova(p => ({ ...p, cidade: e.target.value }))} placeholder="Ex: Campina Grande - PB" />
              <Sel label="Plano" value={nova.plano} onChange={e => setNova(p => ({ ...p, plano: e.target.value }))}>
                <option>TRIAL</option><option>BÁSICO</option><option>PRO</option>
              </Sel>
            </MBody>
            <MFoot><Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn><Btn onClick={addEscola} disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Btn></MFoot>
          </MBox>
        </Overlay>
      )}
    </div>
  );
}

// ── MODAIS ─────────────────────────────────────────────────────────────────────
function ModalNovaCom({ onClose, onSave, profile, alunos, equipe }) {
  const [f, setF] = useState({ alunoId: "", titulo: "", detalhes: "", urgencia: "", comQuem: "", encaminhar: false, encDestino: "", encResponsavelId: "", encResponsavelNome: "", encObs: "" });
  const [err, setErr] = useState({});
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!f.alunoId) e.alunoId = "Obrigatório";
    if (!f.titulo.trim()) e.titulo = "Obrigatório";
    if (!f.detalhes.trim()) e.detalhes = "Descreva ou grave o relato";
    if (!f.comQuem) e.comQuem = "Obrigatório";
    if (f.encaminhar && !f.encDestino) e.encDestino = "Obrigatório";
    if (f.encaminhar && !f.encResponsavelNome) e.encResponsavel = "Obrigatório";
    setErr(e); return Object.keys(e).length === 0;
  };

  const handle = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      escola_id: profile.escola_id,
      aluno_id: f.alunoId,
      data_registro: fmtDate(),
      titulo: f.titulo,
      detalhes: f.detalhes,
      urgencia: f.urgencia || null,
      autor_id: profile.id,
      autor_nome: profile.nome,
      encaminhamento: f.encaminhar,
      enc_destino: f.encaminhar ? f.encDestino : null,
      enc_responsavel: f.encaminhar ? f.encResponsavelNome : null,
      enc_responsavel_id: f.encaminhar ? f.encResponsavelId : null,
      enc_obs: f.encObs || null,
      enc_status: f.encaminhar ? "PENDENTE" : null,
      status: "PENDENTE",
      com_quem: f.comQuem,
    };
    const { data, error } = await supabase.from("comunicacoes").insert([payload]).select().single();
    if (!error && data) onSave(data);
    setSaving(false); onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <MBox>
        <MHead title="Nova Comunicação" subtitle="Registre uma nova interação." icon="📨" onClose={onClose} />
        <MBody>
          <FBlock num="1" title="Identificação">
            <Sel label="Aluno *" error={err.alunoId} value={f.alunoId} onChange={e => upd("alunoId", e.target.value)}>
              <option value="">Selecione o aluno...</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome} — {a.turma}</option>)}
            </Sel>
            <Input label="Título / Assunto *" error={err.titulo} value={f.titulo} onChange={e => upd("titulo", e.target.value)} placeholder="Ex: Retenção, Bullying, Escuta..." />
          </FBlock>
          <FBlock num="2" title="Detalhamento">
            <CampoRelato value={f.detalhes} onChange={v => upd("detalhes", v)} />
            {err.detalhes && <span style={{ fontSize: 11, color: "#ef4444" }}>{err.detalhes}</span>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Sel label="Urgência" value={f.urgencia} onChange={e => upd("urgencia", e.target.value)}>
                <option value="">— Sem urgência —</option>
                <option value="BAIXA">BAIXA</option>
                <option value="MEDIA">MÉDIA</option>
                <option value="ALTA">ALTA</option>
              </Sel>
              <Sel label="Comunicação com *" error={err.comQuem} value={f.comQuem} onChange={e => upd("comQuem", e.target.value)}>
                <option value="">Selecione...</option>
                <option>Responsável / Família</option>
                <option>Aluno</option>
                <option>Professor</option>
                <option>Outro setor</option>
              </Sel>
            </div>
          </FBlock>
          <FBlock num="3" title="Encaminhamento">
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: 12, borderRadius: 8, border: `1.5px solid ${f.encaminhar ? "#2563eb" : "#e2e8f0"}`, background: f.encaminhar ? "#eff6ff" : "#fff" }}>
              <input type="checkbox" checked={f.encaminhar} onChange={e => upd("encaminhar", e.target.checked)} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 14 }}>Encaminhar para outro setor</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>Exige ação ou acompanhamento de terceiros.</div>
              </div>
            </label>
            {f.encaminhar && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Sel label="Setor de Destino *" error={err.encDestino} value={f.encDestino} onChange={e => upd("encDestino", e.target.value)}>
                    <option value="">Selecione...</option>
                    {SETORES.map(s => <option key={s}>{s}</option>)}
                  </Sel>
                  <Sel label="Responsável *" error={err.encResponsavel} value={f.encResponsavelId}
                    onChange={e => {
                      const u = equipe.find(x => x.id === e.target.value);
                      upd("encResponsavelId", e.target.value);
                      upd("encResponsavelNome", u?.nome || "");
                    }}>
                    <option value="">Selecione...</option>
                    {equipe.filter(u => u.id !== profile.id).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </Sel>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Observações para o destino</label>
                  <textarea value={f.encObs} onChange={e => upd("encObs", e.target.value)} placeholder="Instruções..." rows={2} style={{ padding: "9px 13px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", background: "#fafafa", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", width: "100%" }} />
                </div>
              </div>
            )}
          </FBlock>
        </MBody>
        <MFoot>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn icon="📨" onClick={handle} disabled={saving}>{saving ? "Salvando..." : "Registrar Comunicação"}</Btn>
        </MFoot>
      </MBox>
    </Overlay>
  );
}

function ModalNovaReuniao({ onClose, onSave, profile, alunos }) {
  const [f, setF] = useState({ titulo: "", tipo: "Reunião de Pais", data: "", descricao: "", ata: "", proximaAcao: "" });
  const [convocados, setConvocados] = useState([]);
  const [err, setErr] = useState({});
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggleAluno = (a) => setConvocados(p => p.find(c => c.alunoId === a.id) ? p.filter(c => c.alunoId !== a.id) : [...p, { alunoId: a.id, responsavel: a.responsavel, compareceu: false }]);
  const toggleP = (id) => setConvocados(p => p.map(c => c.alunoId === id ? { ...c, compareceu: !c.compareceu } : c));

  const handle = async () => {
    const e = {};
    if (!f.titulo.trim()) e.titulo = "Obrigatório";
    if (!f.data) e.data = "Obrigatório";
    setErr(e); if (Object.keys(e).length) return;
    setSaving(true);
    const { data: reuniao, error } = await supabase.from("reunioes").insert([{
      escola_id: profile.escola_id,
      data_reuniao: new Date(f.data).toLocaleDateString("pt-BR"),
      tipo: f.tipo, titulo: f.titulo, descricao: f.descricao,
      ata: f.ata, proxima_acao: f.proximaAcao, autor_id: profile.id
    }]).select().single();
    if (!error && reuniao && convocados.length > 0) {
      await supabase.from("reuniao_convocados").insert(
        convocados.map(c => ({ reuniao_id: reuniao.id, aluno_id: c.alunoId, responsavel: c.responsavel, compareceu: c.compareceu }))
      );
    }
    if (!error && reuniao) onSave({ ...reuniao, convocados });
    setSaving(false); onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <MBox width={700}>
        <MHead title="Nova Reunião" subtitle="Registre a reunião e a presença familiar." icon="📅" onClose={onClose} />
        <MBody>
          <FBlock num="1" title="Identificação">
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <Input label="Título *" error={err.titulo} value={f.titulo} onChange={e => upd("titulo", e.target.value)} placeholder="Ex: Conselho de Classe" />
              <Input label="Data *" type="date" error={err.data} value={f.data} onChange={e => upd("data", e.target.value)} />
            </div>
            <Sel label="Tipo" value={f.tipo} onChange={e => upd("tipo", e.target.value)}>
              {["Reunião de Pais", "Reunião Pedagógica", "Reunião Individual", "Conselho de Classe", "Reunião com Responsável"].map(t => <option key={t}>{t}</option>)}
            </Sel>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Pauta</label>
              <textarea value={f.descricao} onChange={e => upd("descricao", e.target.value)} placeholder="Descreva a pauta..." rows={2} style={{ padding: "9px 13px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", background: "#fafafa", fontFamily: "inherit", resize: "vertical", width: "100%", boxSizing: "border-box" }} />
            </div>
          </FBlock>
          <FBlock num="2" title="Lista de Presença">
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Selecione os alunos convocados e marque quem compareceu.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
              {alunos.map(a => {
                const conv = convocados.find(c => c.alunoId === a.id);
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${conv ? "#2563eb" : "#e2e8f0"}`, background: conv ? "#eff6ff" : "#fafafa" }}>
                    <input type="checkbox" checked={!!conv} onChange={() => toggleAluno(a)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{a.nome}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Resp.: {a.responsavel} · {a.turma}</div>
                    </div>
                    {conv && (
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: conv.compareceu ? "#16a34a" : "#94a3b8", cursor: "pointer" }}>
                        <input type="checkbox" checked={conv.compareceu} onChange={() => toggleP(a.id)} />
                        {conv.compareceu ? "✓ Compareceu" : "Ausente"}
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            {convocados.length > 0 && (
              <div style={{ display: "flex", gap: 10 }}>
                <Badge color="#16a34a">✓ {convocados.filter(c => c.compareceu).length} presentes</Badge>
                <Badge color="#ef4444">✗ {convocados.filter(c => !c.compareceu).length} ausentes</Badge>
              </div>
            )}
          </FBlock>
          <FBlock num="3" title="Ata e Próximos Passos">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Ata / Resumo</label>
              <textarea value={f.ata} onChange={e => upd("ata", e.target.value)} placeholder="O que foi discutido e decidido..." rows={3} style={{ padding: "9px 13px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", background: "#fafafa", fontFamily: "inherit", resize: "vertical", width: "100%", boxSizing: "border-box" }} />
            </div>
            <Input label="Próxima Ação" value={f.proximaAcao} onChange={e => upd("proximaAcao", e.target.value)} placeholder="Ex: Contato com famílias ausentes até 10/04" />
          </FBlock>
        </MBody>
        <MFoot>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn icon="📅" onClick={handle} disabled={saving}>{saving ? "Salvando..." : "Registrar Reunião"}</Btn>
        </MFoot>
      </MBox>
    </Overlay>
  );
}

function ModalResolucao({ item, onClose, onResolve, alunos }) {
  const [status, setStatus] = useState("EM_ANALISE");
  const [resolucao, setResolucao] = useState(item.resolucao || "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const aluno = alunos.find(a => a.id === item.aluno_id);

  const handle = async () => {
    if (!resolucao.trim()) { setErr("Justificativa obrigatória."); return; }
    setSaving(true);
    const { error } = await supabase.from("comunicacoes").update({ enc_status: status, status, resolucao }).eq("id", item.id);
    if (!error) onResolve(item.id, status, resolucao);
    setSaving(false); onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <MBox width={500}>
        <MHead title="Atualizar Encaminhamento" icon="📋" onClose={onClose} />
        <MBody>
          <div style={{ padding: 14, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Aluno</div>
            <div style={{ fontWeight: 700, color: "#1e293b" }}>{aluno?.nome}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{item.titulo}</div>
          </div>
          <Sel label="Novo Status *" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="EM_ANALISE">EM ANÁLISE</option>
            <option value="RESOLVIDO">RESOLVIDO</option>
            <option value="PENDENTE">PENDENTE</option>
          </Sel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: err ? "#ef4444" : "#475569" }}>Justificativa / Resolução *</label>
            <textarea value={resolucao} onChange={e => setResolucao(e.target.value)} placeholder="Descreva o que foi feito..." rows={4} style={{ padding: "9px 13px", border: `1.5px solid ${err ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fafafa", fontFamily: "inherit", resize: "vertical", width: "100%", boxSizing: "border-box" }} />
            {err && <span style={{ fontSize: 11, color: "#ef4444" }}>{err}</span>}
          </div>
        </MBody>
        <MFoot>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={handle} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
        </MFoot>
      </MBox>
    </Overlay>
  );
}

// ── MODAL CADASTRAR ALUNO ──────────────────────────────────────────────────────
function ModalNovoAluno({ onClose, onSave, profile }) {
  const [f, setF] = useState({ nome: "", turma: "", rm: "", responsavel: "", telefone: "" });
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const handle = async () => {
    if (!f.nome.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("alunos").insert([{ ...f, escola_id: profile.escola_id, risco: 0 }]).select().single();
    if (!error && data) onSave(data);
    setSaving(false); onClose();
  };
  return (
    <Overlay onClose={onClose}>
      <MBox width={500}>
        <MHead title="Cadastrar Aluno" icon="👨‍🎓" onClose={onClose} />
        <MBody>
          <Input label="Nome completo *" value={f.nome} onChange={e => upd("nome", e.target.value)} placeholder="Nome do aluno" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Turma" value={f.turma} onChange={e => upd("turma", e.target.value)} placeholder="Ex: 3º A" />
            <Input label="RM / Matrícula" value={f.rm} onChange={e => upd("rm", e.target.value)} placeholder="Ex: 2024001" />
          </div>
          <Input label="Nome do Responsável" value={f.responsavel} onChange={e => upd("responsavel", e.target.value)} placeholder="Nome completo do responsável" />
          <Input label="Telefone do Responsável" value={f.telefone} onChange={e => upd("telefone", e.target.value)} placeholder="(00) 00000-0000" />
        </MBody>
        <MFoot>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={handle} disabled={saving}>{saving ? "Salvando..." : "Cadastrar Aluno"}</Btn>
        </MFoot>
      </MBox>
    </Overlay>
  );
}

// ── PERFIL DO ALUNO ────────────────────────────────────────────────────────────
function PerfilAluno({ aluno, comunicacoes, reunioes, onClose, profile }) {
  const [tab, setTab] = useState("timeline");
  const isCan = (c) => profile.perfil === "DIRECAO" || profile.perfil === "SUPER_ADMIN" || c.autor_id === profile.id || c.enc_responsavel_id === profile.id;
  const coms = comunicacoes.filter(c => c.aluno_id === aluno.id && isCan(c));
  const reunioesA = reunioes.filter(r => r.convocados?.some(c => c.aluno_id === aluno.id));
  const totalP = reunioesA.reduce((s, r) => s + (r.convocados?.find(c => c.aluno_id === aluno.id)?.compareceu ? 1 : 0), 0);
  const timeline = [...coms.map(c => ({ tipo: "com", data: c.data_registro, item: c })), ...reunioesA.map(r => ({ tipo: "reu", data: r.data_reuniao, item: r }))]
    .sort((a, b) => (b.data || "").split("/").reverse().join("").localeCompare((a.data || "").split("/").reverse().join("")));
  return (
    <Overlay onClose={onClose}>
      <MBox width={720}>
        <MHead title={aluno.nome} subtitle={`${aluno.turma} · RM: ${aluno.rm}`} onClose={onClose} />
        <MBody>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {[{ label: "Risco", value: getRiscoNivel(aluno.risco), color: getRiscoColor(aluno.risco) }, { label: "Score", value: `${aluno.risco} pts`, color: getRiscoColor(aluno.risco) }, { label: "Comunicações", value: coms.length, color: "#2563eb" }, { label: "Presença", value: `${totalP}/${reunioesA.length}`, color: totalP < reunioesA.length / 2 ? "#ef4444" : "#22c55e" }].map(m => (
              <div key={m.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 16px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0", display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Responsável</div><div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{aluno.responsavel}</div></div>
            <div><div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Telefone</div><div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{aluno.telefone}</div></div>
          </div>
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0" }}>
            {[["timeline", "📋 Timeline"], ["reunioes", "📅 Reuniões"], ["encaminhamentos", "📨 Encaminhamentos"]].map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 800 : 500, color: tab === t ? "#2563eb" : "#64748b", borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent", marginBottom: -1 }}>{l}</button>
            ))}
          </div>
          {tab === "timeline" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {timeline.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>Nenhum registro encontrado.</div>}
              {timeline.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 10, border: "1px solid #f1f5f9", background: "#fafafa" }}>
                  <span style={{ fontSize: 20 }}>{t.tipo === "com" ? "💬" : "📅"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{t.item.titulo}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{t.data}</span>
                        {t.tipo === "com" && t.item.urgencia && <Badge color={getUrgColor(t.item.urgencia)}>{t.item.urgencia}</Badge>}
                        {t.tipo === "com" && <Badge color={getStColor(t.item.status)}>{getStLabel(t.item.status)}</Badge>}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{t.item.detalhes || t.item.descricao}</div>
                    {t.tipo === "com" && t.item.resolucao && <div style={{ marginTop: 8, padding: "6px 10px", background: "#f0fdf4", borderRadius: 6, fontSize: 12, color: "#16a34a", borderLeft: "3px solid #22c55e" }}>✓ {t.item.resolucao}</div>}
                    {t.tipo === "reu" && (() => { const p = t.item.convocados?.find(c => c.aluno_id === aluno.id); return <div style={{ fontSize: 12, marginTop: 4, color: p?.compareceu ? "#16a34a" : "#ef4444", fontWeight: 700 }}>{p?.compareceu ? "✓ Responsável compareceu" : "✗ Responsável não compareceu"}</div>; })()}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "reunioes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reunioesA.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>Nenhuma reunião registrada.</div>}
              {reunioesA.map(r => {
                const p = r.convocados?.find(c => c.aluno_id === aluno.id);
                return (
                  <div key={r.id} style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid #f1f5f9", background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <div><div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{r.titulo}</div><div style={{ fontSize: 12, color: "#94a3b8" }}>{r.data_reuniao} · {r.tipo}</div></div>
                      <Badge color={p?.compareceu ? "#16a34a" : "#ef4444"}>{p?.compareceu ? "✓ Presente" : "✗ Ausente"}</Badge>
                    </div>
                    {r.ata && <div style={{ fontSize: 13, color: "#64748b", marginTop: 8, borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>{r.ata}</div>}
                  </div>
                );
              })}
            </div>
          )}
          {tab === "encaminhamentos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {coms.filter(c => c.encaminhamento).length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>Nenhum encaminhamento.</div>}
              {coms.filter(c => c.encaminhamento).map(c => (
                <div key={c.id} style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid #f1f5f9", background: "#fafafa" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{c.titulo}</div>
                    <div style={{ display: "flex", gap: 6 }}>{c.urgencia && <Badge color={getUrgColor(c.urgencia)}>{c.urgencia}</Badge>}<Badge color={getStColor(c.enc_status || "PENDENTE")}>{getStLabel(c.enc_status)}</Badge></div>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{c.data_registro} · {c.enc_destino} → {c.enc_responsavel}</div>
                  {c.resolucao && <div style={{ marginTop: 8, padding: "6px 10px", background: "#f0fdf4", borderRadius: 6, fontSize: 12, color: "#16a34a" }}>✓ {c.resolucao}</div>}
                </div>
              ))}
            </div>
          )}
        </MBody>
      </MBox>
    </Overlay>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────────
function Dashboard({ alunos, comunicacoes, reunioes, profile, equipe, onNovaCom, onVerAluno }) {
  const alto = alunos.filter(a => a.risco >= 60);
  const medio = alunos.filter(a => a.risco >= 30 && a.risco < 60);
  const baixo = alunos.filter(a => a.risco < 30);
  const pendentes = comunicacoes.filter(c => c.encaminhamento && c.enc_status === "PENDENTE");
  const total = alunos.length;
  const r = 58, cx = 80, cy = 80, sw = 16, circ = 2 * Math.PI * r;
  const segs = [{ n: baixo.length, color: "#22c55e", label: "Estáveis" }, { n: medio.length, color: "#f59e0b", label: "Atenção" }, { n: alto.length, color: "#ef4444", label: "Risco Alto" }];
  let off = 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div><h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>Dashboard Estratégico</h1><p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Visão 360° de risco, engajamento e ações preventivas.</p></div>
        <Btn icon="+" onClick={onNovaCom}>Nova Comunicação</Btn>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[{ label: "Total de Alunos", value: total, icon: "👨‍🎓", color: "#2563eb" }, { label: "Enc. Pendentes", value: pendentes.length, icon: "📨", color: "#f59e0b" }, { label: "Em Risco Alto", value: alto.length, icon: "⚠️", color: "#ef4444" }, { label: "Comunicações", value: comunicacoes.length, icon: "💬", color: "#7c3aed" }].map(m => (
          <Card key={m.label} style={{ flex: 1, minWidth: 160 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span style={{ fontSize: 18 }}>{m.icon}</span><span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{m.label}</span></div>
            <div style={{ fontSize: 28, fontWeight: 900, color: m.color }}>{m.value}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>📊 Radar de Risco</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <svg width={160} height={160} viewBox="0 0 160 160">
              {total === 0 ? <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={sw} /> :
                segs.map((s, i) => { const v = (s.n / total) * circ; const o = off; off += v; return s.n > 0 ? <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={sw} strokeDasharray={`${v} ${circ - v}`} strokeDashoffset={-o + circ / 4} /> : null; })}
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize={20} fontWeight="900" fill="#1e293b">{total}</text>
              <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">alunos</text>
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {segs.map((s, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} /><span style={{ fontSize: 13, color: "#64748b" }}>{s.label}</span><span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 900, color: "#1e293b" }}>{s.n}</span></div>))}
            </div>
          </div>
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>⚠️ Alunos em Risco Alto</h3>
          {alto.length === 0 ? <div style={{ color: "#94a3b8", textAlign: "center", padding: 24 }}>🎉 Nenhum aluno em risco alto!</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alto.slice(0, 5).map(a => (<div key={a.id} onClick={() => onVerAluno(a)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, border: "1px solid #fef2f2", background: "#fff5f5", cursor: "pointer" }}><div><div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{a.nome}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{a.turma}</div></div><div style={{ fontWeight: 900, fontSize: 16, color: "#ef4444" }}>{a.risco}</div></div>))}
            </div>
          )}
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>📋 Encaminhamentos Pendentes</h3>
          {pendentes.length === 0 ? <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: 20 }}>Nenhum pendente</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendentes.slice(0, 4).map(c => { const aluno = alunos.find(a => a.id === c.aluno_id); return (<div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fef3c7" }}><div><div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{c.titulo}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{aluno?.nome} → {c.enc_destino}</div></div>{c.urgencia && <Badge color={getUrgColor(c.urgencia)}>{c.urgencia}</Badge>}</div>); })}
            </div>
          )}
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>💬 Últimas Comunicações</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {comunicacoes.slice(0, 5).map(c => { const aluno = alunos.find(a => a.id === c.aluno_id); return (<div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #f1f5f9" }}><div><div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{c.titulo}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{aluno?.nome} · {c.data_registro}</div></div><Badge color={getStColor(c.status)}>{getStLabel(c.status)}</Badge></div>); })}
            {comunicacoes.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: 20 }}>Nenhuma comunicação ainda.</div>}
          </div>
        </Card>
      </div>
      {(profile.perfil === "DIRECAO" || profile.perfil === "SUPER_ADMIN") && equipe.length > 0 && (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>👥 Desempenho por Usuário</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>Visão individual de cada profissional da equipe</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
            {equipe.filter(u => u.perfil !== "DIRECAO" && u.perfil !== "SUPER_ADMIN").map((u, i) => {
              const cores = ["#2563eb", "#7c3aed", "#059669", "#f59e0b", "#ef4444"];
              const cor = cores[i % cores.length];
              const uComs = comunicacoes.filter(c => c.autor_id === u.id);
              const uEnvs = uComs.filter(c => c.encaminhamento).length;
              const uRec = comunicacoes.filter(c => c.enc_responsavel_id === u.id);
              const uRes = uRec.filter(c => c.enc_status === "RESOLVIDO").length;
              const uAlunos = new Set(uComs.map(c => c.aluno_id)).size;
              return (
                <div key={u.id} style={{ background: "#fafafa", borderRadius: 12, padding: 16, border: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <Av initials={u.avatar || u.nome.slice(0, 2).toUpperCase()} color={cor} size={40} />
                    <div><div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{u.nome}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{perfilLabel(u.perfil)}</div></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[{ label: "Comunicações", value: uComs.length, color: cor }, { label: "Alunos", value: uAlunos, color: cor }, { label: "Enc. enviados", value: uEnvs, color: "#f59e0b" }, { label: "Resolvidos", value: uRes, color: "#22c55e" }].map(m => (
                      <div key={m.label} style={{ textAlign: "center", padding: "6px 4px", background: "#fff", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: m.color }}>{m.value}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── PÁGINAS SIMPLES ────────────────────────────────────────────────────────────
function PaginaAlunos({ alunos, comunicacoes, reunioes, profile, onVerAluno, onNovoAluno }) {
  const [busca, setBusca] = useState("");
  const [ord, setOrd] = useState("risco");
  const filtrados = alunos.filter(a => !busca || a.nome?.toLowerCase().includes(busca.toLowerCase()) || a.turma?.toLowerCase().includes(busca.toLowerCase())).sort((a, b) => ord === "risco" ? b.risco - a.risco : (a.nome || "").localeCompare(b.nome || ""));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div><h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>👨‍🎓 Alunos</h1><p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Base de estudantes com score de risco e histórico.</p></div>
        {(profile.perfil === "DIRECAO" || profile.perfil === "SECRETARIA") && <Btn icon="+" onClick={onNovoAluno}>Cadastrar Aluno</Btn>}
      </div>
      <Card>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar por nome ou turma..." style={{ flex: 1, minWidth: 200, padding: "8px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none" }} />
          <select value={ord} onChange={e => setOrd(e.target.value)} style={{ padding: "8px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none" }}>
            <option value="risco">Por risco</option><option value="nome">Por nome</option>
          </select>
        </div>
        {filtrados.length === 0 ? <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Nenhum aluno cadastrado ainda.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtrados.map(a => {
              const nC = comunicacoes.filter(c => c.aluno_id === a.id).length;
              const rA = reunioes.filter(r => r.convocados?.some(c => c.aluno_id === a.id));
              const pR = rA.reduce((s, r) => s + (r.convocados?.find(c => c.aluno_id === a.id)?.compareceu ? 1 : 0), 0);
              return (
                <div key={a.id} onClick={() => onVerAluno(a)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, border: "1px solid #f1f5f9", background: "#fafafa", cursor: "pointer", flexWrap: "wrap" }}>
                  <Av initials={(a.nome || "?").split(" ").map(n => n[0]).slice(0, 2).join("")} color={getRiscoColor(a.risco)} />
                  <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{a.nome}</div><div style={{ fontSize: 12, color: "#94a3b8" }}>{a.turma} · RM: {a.rm}</div></div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center", padding: "4px 12px", borderRadius: 8, background: getRiscoBg(a.risco), border: `1px solid ${getRiscoColor(a.risco)}30` }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: getRiscoColor(a.risco) }}>{a.risco}</div>
                      <div style={{ fontSize: 10, color: getRiscoColor(a.risco), fontWeight: 700 }}>RISCO</div>
                    </div>
                    <Badge color="#2563eb">{nC} registros</Badge>
                    <Badge color="#7c3aed">{pR}/{rA.length} presenças</Badge>
                    <span style={{ color: "#94a3b8" }}>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function PaginaComunicacoes({ comunicacoes, alunos, profile, onNova, onResolve }) {
  const [busca, setBusca] = useState("");
  const [resolving, setResolving] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const isCan = (c) => profile.perfil === "DIRECAO" || profile.perfil === "SUPER_ADMIN" || c.autor_id === profile.id || c.enc_responsavel_id === profile.id;
  const visiveis = comunicacoes.filter(c => isCan(c) && (!busca || alunos.find(a => a.id === c.aluno_id)?.nome?.toLowerCase().includes(busca.toLowerCase()) || c.titulo?.toLowerCase().includes(busca.toLowerCase())));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div><h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>💬 Comunicações</h1><p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Gerencie os registros de interação da instituição.</p></div>
        <Btn icon="+" onClick={onNova}>Nova Comunicação</Btn>
      </div>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ margin: 0, fontWeight: 700, color: "#1e293b" }}>Histórico de Registros</h3>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar..." style={{ padding: "8px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", width: 240 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visiveis.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>Nenhum registro encontrado.</div>}
          {visiveis.map(c => {
            const aluno = alunos.find(a => a.id === c.aluno_id);
            const exp = expandido === c.id;
            const podeAtualizar = (profile.perfil === "DIRECAO" || c.enc_responsavel_id === profile.id) && c.encaminhamento && c.enc_status !== "RESOLVIDO";
            return (
              <div key={c.id} style={{ border: "1px solid #f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                <div onClick={() => setExpandido(exp ? null : c.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fafafa", cursor: "pointer", flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", minWidth: 90 }}>{c.data_registro}</div>
                  <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{aluno?.nome}</div><div style={{ fontSize: 12, color: "#64748b" }}>{c.titulo}</div></div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {c.urgencia ? <Badge color={getUrgColor(c.urgencia)}>{c.urgencia}</Badge> : <span style={{ fontSize: 12, color: "#cbd5e1" }}>—</span>}
                    {c.encaminhamento && <Badge color="#7c3aed">📨 Encaminhado</Badge>}
                    <Badge color={getStColor(c.status)}>{getStLabel(c.status)}</Badge>
                    {podeAtualizar && <Btn small variant="success" onClick={e => { e.stopPropagation(); setResolving(c); }}>Atualizar</Btn>}
                    <span style={{ color: "#94a3b8" }}>{exp ? "▲" : "▼"}</span>
                  </div>
                </div>
                {exp && (
                  <div style={{ padding: "14px 16px", borderTop: "1px solid #f1f5f9", background: "#fff" }}>
                    <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}><b>Relato:</b> {c.detalhes}</div>
                    {c.com_quem && <div style={{ fontSize: 12, color: "#94a3b8" }}>Comunicação com: {c.com_quem}</div>}
                    {c.encaminhamento && <div style={{ fontSize: 12, color: "#7c3aed", marginTop: 4 }}>Encaminhado → {c.enc_destino} / {c.enc_responsavel}</div>}
                    {c.resolucao && <div style={{ marginTop: 10, padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, fontSize: 13, color: "#16a34a", borderLeft: "3px solid #22c55e" }}>✓ {c.resolucao}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      {resolving && <ModalResolucao item={resolving} alunos={alunos} onClose={() => setResolving(null)} onResolve={onResolve} />}
    </div>
  );
}

function PaginaEncaminhamentos({ comunicacoes, alunos, profile, onResolve }) {
  const [resolving, setResolving] = useState(null);
  const [filtro, setFiltro] = useState("TODOS");
  const isCan = (c) => profile.perfil === "DIRECAO" || profile.perfil === "SUPER_ADMIN" || c.autor_id === profile.id || c.enc_responsavel_id === profile.id;
  const encs = comunicacoes.filter(c => c.encaminhamento && isCan(c));
  const filtrados = filtro === "TODOS" ? encs : encs.filter(c => c.enc_status === filtro);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div><h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>📨 Encaminhamentos</h1><p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Acompanhe os casos encaminhados para outros setores.</p></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["TODOS", "PENDENTE", "EM_ANALISE", "RESOLVIDO"].map(f => (<button key={f} onClick={() => setFiltro(f)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: filtro === f ? "#2563eb" : "#f1f5f9", color: filtro === f ? "#fff" : "#64748b" }}>{getStLabel(f)} ({f === "TODOS" ? encs.length : encs.filter(c => c.enc_status === f).length})</button>))}
      </div>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtrados.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>Nenhum encaminhamento encontrado.</div>}
          {filtrados.map(c => {
            const aluno = alunos.find(a => a.id === c.aluno_id);
            const podeAtualizar = (profile.perfil === "DIRECAO" || c.enc_responsavel_id === profile.id) && c.enc_status !== "RESOLVIDO";
            return (
              <div key={c.id} style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid #f1f5f9", background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div><div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{c.titulo}</div><div style={{ fontSize: 13, color: "#64748b" }}>{aluno?.nome} · {aluno?.turma}</div><div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{c.data_registro} · Para: {c.enc_destino} → {c.enc_responsavel}</div></div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {c.urgencia && <Badge color={getUrgColor(c.urgencia)}>{c.urgencia}</Badge>}
                    <Badge color={getStColor(c.enc_status || "PENDENTE")}>{getStLabel(c.enc_status)}</Badge>
                    {podeAtualizar && <Btn small variant="success" onClick={() => setResolving(c)}>Atualizar Status</Btn>}
                  </div>
                </div>
                {c.resolucao && <div style={{ marginTop: 10, padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, fontSize: 13, color: "#16a34a", borderLeft: "3px solid #22c55e" }}>✓ {c.resolucao}</div>}
              </div>
            );
          })}
        </div>
      </Card>
      {resolving && <ModalResolucao item={resolving} alunos={alunos} onClose={() => setResolving(null)} onResolve={onResolve} />}
    </div>
  );
}

function PaginaReunioes({ reunioes, alunos, profile, onNova }) {
  const [expandido, setExpandido] = useState(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div><h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>📅 Reuniões</h1><p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Registro de reuniões e controle de presença familiar.</p></div>
        <Btn icon="+" onClick={onNova}>Nova Reunião</Btn>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[{ label: "Total Reuniões", value: reunioes.length, color: "#2563eb" }, { label: "Convocados", value: reunioes.reduce((s, r) => s + (r.convocados?.length || 0), 0), color: "#7c3aed" }, { label: "Presenças", value: reunioes.reduce((s, r) => s + (r.convocados?.filter(c => c.compareceu).length || 0), 0), color: "#22c55e" }, { label: "Ausências", value: reunioes.reduce((s, r) => s + (r.convocados?.filter(c => !c.compareceu).length || 0), 0), color: "#ef4444" }].map(m => (
          <Card key={m.label} style={{ flex: 1, minWidth: 150 }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{m.label}</div><div style={{ fontSize: 26, fontWeight: 900, color: m.color }}>{m.value}</div></Card>
        ))}
      </div>
      <Card>
        {reunioes.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Nenhuma reunião registrada ainda.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reunioes.map(r => {
            const exp = expandido === r.id;
            const conv = r.convocados || [];
            const pres = conv.filter(c => c.compareceu).length;
            const pct = conv.length > 0 ? Math.round((pres / conv.length) * 100) : 0;
            return (
              <div key={r.id} style={{ border: "1px solid #f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                <div onClick={() => setExpandido(exp ? null : r.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#fafafa", cursor: "pointer", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 26 }}>📅</span>
                  <div style={{ flex: 1, minWidth: 180 }}><div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>{r.titulo}</div><div style={{ fontSize: 12, color: "#94a3b8" }}>{r.data_reuniao} · {r.tipo}</div></div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 900, color: pct < 50 ? "#ef4444" : "#22c55e" }}>{pct}%</div><div style={{ fontSize: 10, color: "#94a3b8" }}>presença</div></div>
                    <Badge color="#22c55e">✓ {pres}</Badge>
                    <Badge color="#ef4444">✗ {conv.length - pres}</Badge>
                    <span style={{ color: "#94a3b8" }}>{exp ? "▲" : "▼"}</span>
                  </div>
                </div>
                {exp && (
                  <div style={{ padding: "14px 16px", borderTop: "1px solid #f1f5f9" }}>
                    {r.descricao && <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>{r.descricao}</p>}
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>LISTA DE PRESENÇA</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                      {conv.map((c, i) => {
                        const aluno = alunos.find(a => a.id === c.aluno_id);
                        return (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 8, background: c.compareceu ? "#f0fdf4" : "#fef2f2", border: `1px solid ${c.compareceu ? "#bbf7d0" : "#fecaca"}` }}>
                            <div><div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{aluno?.nome}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>Resp.: {c.responsavel}</div></div>
                            <Badge color={c.compareceu ? "#16a34a" : "#ef4444"}>{c.compareceu ? "✓ Presente" : "✗ Ausente"}</Badge>
                          </div>
                        );
                      })}
                    </div>
                    {r.ata && <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: 13, color: "#475569", borderLeft: "3px solid #2563eb", marginBottom: 8 }}><b>Ata:</b> {r.ata}</div>}
                    {r.proxima_acao && <div style={{ padding: "8px 14px", background: "#fffbeb", borderRadius: 8, fontSize: 13, color: "#92400e" }}>📌 {r.proxima_acao}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function PaginaRetencao({ alunos, comunicacoes, reunioes, onVerAluno }) {
  const alto = alunos.filter(a => a.risco >= 60).sort((a, b) => b.risco - a.risco);
  const medio = alunos.filter(a => a.risco >= 30 && a.risco < 60).sort((a, b) => b.risco - a.risco);
  const PainelAluno = ({ a, nivel }) => {
    const coms = comunicacoes.filter(c => c.aluno_id === a.id);
    const encs = coms.filter(c => c.encaminhamento);
    const rA = reunioes.filter(r => r.convocados?.some(c => c.aluno_id === a.id));
    const aus = rA.reduce((s, r) => s + (!r.convocados?.find(c => c.aluno_id === a.id)?.compareceu ? 1 : 0), 0);
    return (
      <div onClick={() => onVerAluno(a)} style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${getRiscoColor(a.risco)}30`, background: getRiscoBg(a.risco), cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div><div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>{a.nome}</div><div style={{ fontSize: 12, color: "#94a3b8" }}>{a.turma} · Resp.: {a.responsavel}</div></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 900, color: getRiscoColor(a.risco) }}>{a.risco}</div><div style={{ fontSize: 9, fontWeight: 800, color: getRiscoColor(a.risco) }}>PONTOS</div></div>
            <Badge color={getRiscoColor(a.risco)}>{nivel}</Badge>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#475569" }}>📋 {coms.length} comunicações</span>
          <span style={{ fontSize: 12, color: "#475569" }}>📨 {encs.length} encaminhamentos</span>
          {aus > 0 && <span style={{ fontSize: 12, color: "#ef4444" }}>⚠️ {aus} ausências em reuniões</span>}
        </div>
      </div>
    );
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div><h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>📉 Retenção — Radar de Risco</h1><p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Alunos com maior risco de evasão.</p></div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[{ label: "Risco Alto", count: alto.length, color: "#ef4444", bg: "#fef2f2", desc: "≥ 60 pts" }, { label: "Risco Médio", count: medio.length, color: "#f59e0b", bg: "#fffbeb", desc: "30–59 pts" }, { label: "Estáveis", count: alunos.filter(a => a.risco < 30).length, color: "#22c55e", bg: "#f0fdf4", desc: "< 30 pts" }].map(m => (
          <Card key={m.label} style={{ flex: 1, minWidth: 160, background: m.bg, border: `1px solid ${m.color}30` }}><div style={{ fontSize: 12, fontWeight: 700, color: m.color, marginBottom: 4 }}>{m.label}</div><div style={{ fontSize: 32, fontWeight: 900, color: m.color }}>{m.count}</div><div style={{ fontSize: 11, color: m.color, opacity: 0.7 }}>{m.desc}</div></Card>
        ))}
      </div>
      {alto.length > 0 && <div><h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#ef4444" }}>⚠️ Risco Alto — Ação Imediata</h3><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{alto.map(a => <PainelAluno key={a.id} a={a} nivel="RISCO ALTO" />)}</div></div>}
      {medio.length > 0 && <div><h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#f59e0b" }}>🔶 Risco Médio — Monitorar</h3><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{medio.map(a => <PainelAluno key={a.id} a={a} nivel="RISCO MÉDIO" />)}</div></div>}
      {alto.length === 0 && medio.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>🎉 Nenhum aluno em risco elevado!</div>}
    </div>
  );
}

// ── SCHOOL APP ─────────────────────────────────────────────────────────────────
function SchoolApp({ user, profile, escola, onLogout, onVoltarAdmin }) {
  const [pagina, setPagina] = useState("dashboard");
  const [alunos, setAlunos] = useState([]);
  const [comunicacoes, setComunicacoes] = useState([]);
  const [reunioes, setReunioes] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNovaCom, setModalNovaCom] = useState(false);
  const [modalNovaReuniao, setModalNovaReuniao] = useState(false);
  const [modalNovoAluno, setModalNovoAluno] = useState(false);
  const [alunoSel, setAlunoSel] = useState(null);

  useEffect(() => { carregarTudo(); }, [escola.id]);

  const carregarTudo = async () => {
    setLoading(true);
    const [{ data: al }, { data: co }, { data: re }, { data: eq }] = await Promise.all([
      supabase.from("alunos").select("*").eq("escola_id", escola.id).order("nome"),
      supabase.from("comunicacoes").select("*").eq("escola_id", escola.id).order("created_at", { ascending: false }),
      supabase.from("reunioes").select("*, reuniao_convocados(*)").eq("escola_id", escola.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("escola_id", escola.id),
    ]);
    setAlunos(al || []);
    setComunicacoes(co || []);
    setReunioes((re || []).map(r => ({ ...r, convocados: r.reuniao_convocados || [] })));
    setEquipe(eq || []);
    setLoading(false);
  };

  const addCom = (c) => setComunicacoes(p => [c, ...p]);
  const addReuniao = (r) => setReunioes(p => [r, ...p]);
  const addAluno = (a) => setAlunos(p => [...p, a].sort((x, y) => x.nome.localeCompare(y.nome)));
  const resolveEnc = (id, status, resolucao) => setComunicacoes(p => p.map(c => c.id === id ? { ...c, enc_status: status, status, resolucao } : c));

  const nav = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "alunos", icon: "👨‍🎓", label: "Alunos" },
    { id: "comunicacoes", icon: "💬", label: "Comunicações" },
    { id: "encaminhamentos", icon: "📨", label: "Encaminhamentos" },
    { id: "reunioes", icon: "📅", label: "Reuniões" },
    { id: "retencao", icon: "📉", label: "Retenção" },
  ];

  if (loading) return <Loading msg="Carregando dados da escola..." />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui,sans-serif", background: "#f8fafc" }}>
      <div style={{ width: 200, background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: "#2563eb", lineHeight: 1.2 }}>HUB DE<br />RELACIONAMENTO</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, fontWeight: 600 }}>{escola.nome}</div>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map(item => (
            <button key={item.id} onClick={() => setPagina(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: pagina === item.id ? 800 : 500, background: pagina === item.id ? "#eff6ff" : "transparent", color: pagina === item.id ? "#2563eb" : "#475569" }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 8px", borderTop: "1px solid #f1f5f9" }}>
          {onVoltarAdmin && <button onClick={onVoltarAdmin} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#7c3aed", background: "transparent", width: "100%" }}>← Admin Global</button>}
          <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#ef4444", background: "transparent", width: "100%" }}>↪ Sair</button>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 28px", height: 52, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{profile.nome}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{perfilLabel(profile.perfil)}</div></div>
          <Av initials={profile.avatar || profile.nome.slice(0, 2).toUpperCase()} color="#2563eb" />
        </div>
        <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
          {pagina === "dashboard" && <Dashboard alunos={alunos} comunicacoes={comunicacoes} reunioes={reunioes} profile={profile} equipe={equipe} onNovaCom={() => setModalNovaCom(true)} onVerAluno={setAlunoSel} />}
          {pagina === "alunos" && <PaginaAlunos alunos={alunos} comunicacoes={comunicacoes} reunioes={reunioes} profile={profile} onVerAluno={setAlunoSel} onNovoAluno={() => setModalNovoAluno(true)} />}
          {pagina === "comunicacoes" && <PaginaComunicacoes comunicacoes={comunicacoes} alunos={alunos} profile={profile} onNova={() => setModalNovaCom(true)} onResolve={resolveEnc} />}
          {pagina === "encaminhamentos" && <PaginaEncaminhamentos comunicacoes={comunicacoes} alunos={alunos} profile={profile} onResolve={resolveEnc} />}
          {pagina === "reunioes" && <PaginaReunioes reunioes={reunioes} alunos={alunos} profile={profile} onNova={() => setModalNovaReuniao(true)} />}
          {pagina === "retencao" && <PaginaRetencao alunos={alunos} comunicacoes={comunicacoes} reunioes={reunioes} onVerAluno={setAlunoSel} />}
        </div>
      </div>
      {modalNovaCom && <ModalNovaCom onClose={() => setModalNovaCom(false)} onSave={addCom} profile={profile} alunos={alunos} equipe={equipe} />}
      {modalNovaReuniao && <ModalNovaReuniao onClose={() => setModalNovaReuniao(false)} onSave={addReuniao} profile={profile} alunos={alunos} />}
      {modalNovoAluno && <ModalNovoAluno onClose={() => setModalNovoAluno(false)} onSave={addAluno} profile={profile} />}
      {alunoSel && <PerfilAluno aluno={alunoSel} comunicacoes={comunicacoes} reunioes={reunioes} profile={profile} onClose={() => setAlunoSel(null)} />}
    </div>
  );
}

// ── ROOT ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [escolaAtiva, setEscolaAtiva] = useState(null);
  const [iniciando, setIniciando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: prof } = await supabase.from("profiles").select("*, escolas(*)").eq("id", session.user.id).single();
        setUser(session.user); setProfile(prof);
        if (prof?.perfil !== "SUPER_ADMIN" && prof?.escolas) setEscolaAtiva(prof.escolas);
      }
      setIniciando(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") { setUser(null); setProfile(null); setEscolaAtiva(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setEscolaAtiva(null);
  };

  if (iniciando) return <Loading msg="Verificando sessão..." />;
  if (!user || !profile) return <LoginPage onLogin={(u, p) => { setUser(u); setProfile(p); if (p?.perfil !== "SUPER_ADMIN" && p?.escolas) setEscolaAtiva(p.escolas); }} />;
  if (profile.perfil === "SUPER_ADMIN" && !escolaAtiva) return <SuperAdminPanel onLogout={handleLogout} onEntrarEscola={setEscolaAtiva} profile={profile} />;

  const escola = escolaAtiva || profile.escolas;
  return (
    <SchoolApp
      user={user}
      profile={profile}
      escola={escola}
      onLogout={handleLogout}
      onVoltarAdmin={profile.perfil === "SUPER_ADMIN" ? () => setEscolaAtiva(null) : null}
    />
  );
}
