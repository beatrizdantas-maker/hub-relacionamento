"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// ── HELPERS ────────────────────────────────────────────────────────────────────
const getRiscoColor = (r) => r >= 60 ? "#ef4444" : r >= 30 ? "#f59e0b" : "#22c55e";
const getRiscoBg = (r) => r >= 60 ? "#fef2f2" : r >= 30 ? "#fffbeb" : "#f0fdf4";
const getRiscoNivel = (r) => r >= 60 ? "ALTO" : r >= 30 ? "MÉDIO" : "BAIXO";
const getUrgColor = (u) => u === "ALTA" ? "#ef4444" : u === "MEDIA" ? "#f59e0b" : u === "BAIXA" ? "#22c55e" : "#94a3b8";
const getStColor = (s) => s === "RESOLVIDO" ? "#22c55e" : s === "EM_ANALISE" ? "#3b82f6" : s === "CONCLUÍDO" ? "#8b5cf6" : "#f59e0b";
const getStLabel = (s) => s === "EM_ANALISE" ? "EM ANÁLISE" : s || "PENDENTE";
const fmtDate = () => new Date().toLocaleDateString("pt-BR");
const perfilLabel = (p) => ({ SUPER_ADMIN: "Super Admin", DIRECAO: "Direção", PSICOLOGO: "Psicólogo", SECRETARIA: "Secretária", PROFESSOR: "Professor", NUCLEO: "Núcleo Pedagógico", RECEPÇÃO: "Recepção", PSICOPEDAGOGO: "Psicopedagogo" }[p] || p);
const SETORES = ["Psicólogo", "Psicopedagogo", "Secretária", "Professor", "Recepção", "Núcleo Pedagógico", "Direção"];
const PERFIS = ["DIRECAO", "PSICOLOGO", "SECRETARIA", "PROFESSOR", "NUCLEO", "RECEPÇÃO", "PSICOPEDAGOGO"];

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
    warning: { background: "#fffbeb", color: "#d97706", border: "none" },
    secondary: { background: "#f1f5f9", color: "#475569", border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: small ? "6px 14px" : "10px 20px", borderRadius: 8, fontSize: small ? 12 : 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "inherit", ...variants[variant], ...s }}>
      {icon && <span style={{ fontSize: 14 }}>{icon}</span>}{children}
    </button>
  );
};

const Input = ({ label, error, hint, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 600, color: error ? "#ef4444" : "#475569" }}>{label}</label>}
    <input style={{ padding: "9px 13px", border: `1.5px solid ${error ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fafafa", color: "#1e293b", fontFamily: "inherit", boxSizing: "border-box", width: "100%" }} {...props} />
    {hint && <span style={{ fontSize: 11, color: "#94a3b8" }}>{hint}</span>}
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
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{icon && <span style={{ fontSize: 18 }}>{icon}</span>}<h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{title}</h2></div>
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

const Loading = ({ msg = "Carregando..." }) => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, background: "#f1f5f9", fontFamily: "system-ui,sans-serif" }}>
    <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    <p style={{ color: "#64748b", fontSize: 14 }}>{msg}</p>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

// ── MICROFONE + IA ─────────────────────────────────────────────────────────────
function CampoRelato({ value, onChange, onBlur }) {
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
      const res = await fetch("/api/resumir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: value }),
      });
      const data = await res.json();
      setResumo(data.resumo || "Não foi possível gerar o resumo.");
    } catch { setResumo("Erro ao conectar com a IA."); }
    setResumindo(false);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Relato *</label>
      <div style={{ position: "relative" }}>
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={gravando ? "🔴 Gravando... fale agora." : "Descreva o ocorrido ou clique no microfone para gravar."} onBlur={onBlur} rows={gravando ? 5 : 4}
          style={{ width: "100%", padding: "12px 50px 12px 14px", border: `1.5px solid ${gravando ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, fontSize: gravando ? 17 : 14, outline: "none", background: gravando ? "#fff5f5" : "#fafafa", color: "#1e293b", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", transition: "all .2s" }} />
        <button type="button" onClick={gravando ? parar : iniciar} style={{ position: "absolute", right: 10, top: 10, width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer", background: gravando ? "#ef4444" : "#2563eb", color: "#fff", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {gravando ? "⏹" : "🎤"}
        </button>
      </div>
      {gravando && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
        <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>Gravando em tempo real</span>
        {transcricao && <span style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>"{transcricao}"</span>}
        <Btn small variant="danger" onClick={parar} style={{ marginLeft: "auto" }}>⏹ Parar</Btn>
      </div>}
      {!gravando && value?.trim().length > 40 && !resumo && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Btn small variant="secondary" onClick={resumir} disabled={resumindo} icon="✨">{resumindo ? "Resumindo..." : "Resumir com IA"}</Btn>
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

// ── MODAL ESCOLA COMPLETO ──────────────────────────────────────────────────────
function ModalEscola({ escola, onClose, onSave }) {
  const editando = !!escola;
  const [f, setF] = useState({
    nome: escola?.nome || "",
    cidade: escola?.cidade || "",
    plano: escola?.plano || "BÁSICO",
    status: escola?.status || "ATIVA",
    subdomain: escola?.subdomain || "",
    telefone: escola?.telefone || "",
    email_contato: escola?.email_contato || "",
    responsavel_nome: escola?.responsavel_nome || "",
    data_vencimento: escola?.data_vencimento || "",
    logo_url: escola?.logo_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState({});
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!f.nome.trim()) e.nome = "Obrigatório";
    if (!f.subdomain.trim()) e.subdomain = "Obrigatório";
    setErr(e); return Object.keys(e).length === 0;
  };

  const handle = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = { ...f, subdomain: f.subdomain.toLowerCase().replace(/\s/g, "-") };
    let data, error;
    if (editando) {
      ({ data, error } = await supabase.from("escolas").update(payload).eq("id", escola.id).select().single());
    } else {
      ({ data, error } = await supabase.from("escolas").insert([payload]).select().single());
    }
    if (!error && data) onSave(data);
    setSaving(false); onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <MBox width={680}>
        <MHead title={editando ? "Editar Escola" : "Cadastrar Nova Escola"} subtitle="Preencha todas as informações da instituição." icon="🏫" onClose={onClose} />
        <MBody>
          {/* Identificação */}
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14, marginBottom: 4 }}>📋 Identificação</div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <Input label="Nome da Instituição *" error={err.nome} value={f.nome} onChange={e => upd("nome", e.target.value)} placeholder="Ex: Colégio ABC" />
              <Sel label="Plano" value={f.plano} onChange={e => upd("plano", e.target.value)}>
                <option>TRIAL</option><option>BÁSICO</option><option>PRO</option>
              </Sel>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Cidade / Estado" value={f.cidade} onChange={e => upd("cidade", e.target.value)} placeholder="Ex: Campina Grande - PB" />
              <Sel label="Status" value={f.status} onChange={e => upd("status", e.target.value)}>
                <option value="ATIVA">ATIVA</option>
                <option value="TRIAL">TRIAL</option>
                <option value="SUSPENSA">SUSPENSA</option>
                <option value="INATIVA">INATIVA</option>
              </Sel>
            </div>
          </div>

          {/* Link de acesso */}
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14, marginBottom: 4 }}>🔗 Link de Acesso</div>
            <Input label="Subdomínio / Identificador único *" error={err.subdomain} value={f.subdomain}
              onChange={e => upd("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="ex: unicamaster"
              hint={f.subdomain ? `Link: hub-relacionamento.vercel.app/escola/${f.subdomain}` : "Defina o identificador único da escola"} />
            <Input label="Data de Vencimento do Plano" type="date" value={f.data_vencimento} onChange={e => upd("data_vencimento", e.target.value)} />
          </div>

          {/* Contato */}
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14, marginBottom: 4 }}>📞 Contato</div>
            <Input label="Nome do Responsável" value={f.responsavel_nome} onChange={e => upd("responsavel_nome", e.target.value)} placeholder="Nome completo do responsável pela conta" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="E-mail de Contato" type="email" value={f.email_contato} onChange={e => upd("email_contato", e.target.value)} placeholder="contato@escola.com.br" />
              <Input label="Telefone" value={f.telefone} onChange={e => upd("telefone", e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>

          {/* Logo */}
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14, marginBottom: 4 }}>🖼️ Logomarca</div>
            <Input label="URL da Logomarca" value={f.logo_url} onChange={e => upd("logo_url", e.target.value)} placeholder="https://..." hint="Cole o link direto da imagem (PNG, JPG ou SVG)" />
            {f.logo_url && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <img src={f.logo_url} alt="Logo" style={{ width: 60, height: 60, objectFit: "contain", borderRadius: 8 }} onError={e => e.target.style.display = "none"} />
                <span style={{ fontSize: 13, color: "#64748b" }}>Pré-visualização da logomarca</span>
              </div>
            )}
          </div>
        </MBody>
        <MFoot>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={handle} disabled={saving}>{saving ? "Salvando..." : editando ? "Salvar Alterações" : "Cadastrar Escola"}</Btn>
        </MFoot>
      </MBox>
    </Overlay>
  );
}

// ── MODAL CADASTRAR USUÁRIO NA ESCOLA ──────────────────────────────────────────
function ModalNovoUsuario({ escola, onClose, onSave }) {
  const [f, setF] = useState({ nome: "", email: "", senha: "", perfil: "PROFESSOR", cargo: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState({});
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));

  const handle = async () => {
    const e = {};
    if (!f.nome.trim()) e.nome = "Obrigatório";
    if (!f.email.trim()) e.email = "Obrigatório";
    if (!f.senha || f.senha.length < 6) e.senha = "Mínimo 6 caracteres";
    setErr(e); if (Object.keys(e).length) return;
    setSaving(true);
    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin?.createUser?.({
        email: f.email, password: f.senha, email_confirm: true,
        user_metadata: { nome: f.nome, perfil: f.perfil }
      });

      // Como admin.createUser pode não estar disponível no client, usamos signUp
      if (authError || !authData) {
        // Fallback: criar via signup normal
        const { data: signData, error: signError } = await supabase.auth.signUp({
          email: f.email, password: f.senha,
          options: { data: { nome: f.nome, perfil: f.perfil } }
        });
        if (signError) { setErr({ email: signError.message }); setSaving(false); return; }
        if (signData.user) {
          await supabase.from("profiles").upsert({
            id: signData.user.id, nome: f.nome, perfil: f.perfil,
            cargo: f.cargo, escola_id: escola.id,
            avatar: f.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
          });
          onSave({ id: signData.user.id, email: f.email, ...f, escola_id: escola.id });
        }
      } else if (authData.user) {
        await supabase.from("profiles").upsert({
          id: authData.user.id, nome: f.nome, perfil: f.perfil,
          cargo: f.cargo, escola_id: escola.id,
          avatar: f.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
        });
        onSave({ id: authData.user.id, email: f.email, ...f, escola_id: escola.id });
      }
    } catch (ex) { setErr({ email: "Erro ao criar usuário: " + ex.message }); }
    setSaving(false); onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <MBox width={520}>
        <MHead title="Cadastrar Usuário" subtitle={`Escola: ${escola.nome}`} icon="👤" onClose={onClose} />
        <MBody>
          <Input label="Nome completo *" error={err.nome} value={f.nome} onChange={e => upd("nome", e.target.value)} placeholder="Nome do usuário" />
          <Input label="E-mail *" type="email" error={err.email} value={f.email} onChange={e => upd("email", e.target.value)} placeholder="usuario@escola.com.br" />
          <Input label="Senha *" type="password" error={err.senha} value={f.senha} onChange={e => upd("senha", e.target.value)} placeholder="Mínimo 6 caracteres" hint="O usuário poderá alterar a senha depois" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Sel label="Perfil / Função" value={f.perfil} onChange={e => upd("perfil", e.target.value)}>
              {PERFIS.map(p => <option key={p} value={p}>{perfilLabel(p)}</option>)}
            </Sel>
            <Input label="Cargo (opcional)" value={f.cargo} onChange={e => upd("cargo", e.target.value)} placeholder="Ex: Coordenadora" />
          </div>
          <div style={{ padding: "12px 16px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fef3c7", fontSize: 13, color: "#92400e" }}>
            ⚠️ O usuário receberá um e-mail de confirmação. Peça para ele confirmar antes de usar o sistema.
          </div>
        </MBody>
        <MFoot>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={handle} disabled={saving}>{saving ? "Criando..." : "Criar Usuário"}</Btn>
        </MFoot>
      </MBox>
    </Overlay>
  );
}

// ── MODAL EDITAR USUÁRIO ───────────────────────────────────────────────────────
function ModalEditarUsuario({ usuario, onClose, onSave }) {
  const [f, setF] = useState({ nome: usuario.nome || "", perfil: usuario.perfil || "PROFESSOR", cargo: usuario.cargo || "" });
  const [novaSenha, setNovaSenha] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState({});
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const handle = async () => {
    const e = {};
    if (!f.nome.trim()) e.nome = "Obrigatório";
    if (novaSenha && novaSenha.length < 6) e.senha = "Mínimo 6 caracteres";
    setErr(e); if (Object.keys(e).length) return;
    setSaving(true);
    await supabase.from("profiles").update({ nome: f.nome.trim(), perfil: f.perfil, cargo: f.cargo, avatar: f.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() }).eq("id", usuario.id);
    onSave({ ...usuario, nome: f.nome, perfil: f.perfil, cargo: f.cargo });
    setSaving(false);
  };
  return (
    <Overlay onClose={onClose}>
      <MBox width={500}>
        <MHead title="Editar Usuário" subtitle={usuario.nome} icon="✏️" onClose={onClose} />
        <MBody>
          <Input label="Nome completo *" error={err.nome} value={f.nome} onChange={e => upd("nome", e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Sel label="Perfil" value={f.perfil} onChange={e => upd("perfil", e.target.value)}>
              {PERFIS.map(p => <option key={p} value={p}>{perfilLabel(p)}</option>)}
            </Sel>
            <Input label="Cargo (opcional)" value={f.cargo} onChange={e => upd("cargo", e.target.value)} placeholder="Ex: Coordenadora" />
          </div>
          <div style={{ padding: "12px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>🔑 Redefinir senha (opcional)</div>
            <Input label="Nova senha" type="password" error={err.senha} value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Deixe em branco para não alterar" />
          </div>
        </MBody>
        <MFoot>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={handle} disabled={saving}>{saving ? "Salvando..." : "Salvar Alterações"}</Btn>
        </MFoot>
      </MBox>
    </Overlay>
  );
}

// ── MODAL SUSPENDER ESCOLA ─────────────────────────────────────────────────────
function ModalSuspender({ escola, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const handle = async () => {
    setSaving(true);
    const { error } = await supabase.from("escolas").update({ status: "SUSPENSA", suspensa: true, motivo_suspensao: motivo }).eq("id", escola.id);
    if (!error) onConfirm(escola.id, "SUSPENSA", motivo);
    setSaving(false); onClose();
  };
  return (
    <Overlay onClose={onClose}>
      <MBox width={480}>
        <MHead title="Suspender Escola" icon="🔴" onClose={onClose} />
        <MBody>
          <div style={{ padding: "14px 16px", background: "#fef2f2", borderRadius: 10, border: "1px solid #fecaca" }}>
            <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 4 }}>⚠️ Atenção</div>
            <div style={{ fontSize: 13, color: "#ef4444" }}>A escola <b>{escola.nome}</b> ficará sem acesso ao sistema até ser reativada.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Motivo da suspensão</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Pagamento em atraso, contrato encerrado..." rows={3}
              style={{ padding: "9px 13px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", background: "#fafafa", fontFamily: "inherit", resize: "vertical", width: "100%", boxSizing: "border-box" }} />
          </div>
        </MBody>
        <MFoot>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="danger" onClick={handle} disabled={saving}>{saving ? "Suspendendo..." : "Suspender Escola"}</Btn>
        </MFoot>
      </MBox>
    </Overlay>
  );
}

// ── PAINEL DETALHE ESCOLA ──────────────────────────────────────────────────────
function PainelEscola({ escola, onClose, onUpdate, onEntrar }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [modalSuspender, setModalSuspender] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState(null);
  const [tab, setTab] = useState("info");

  useEffect(() => { carregarUsuarios(); }, [escola.id]);

  const carregarUsuarios = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").eq("escola_id", escola.id).order("nome");
    setUsuarios(data || []);
    setLoading(false);
  };

  const reativar = async () => {
    const { error } = await supabase.from("escolas").update({ status: "ATIVA", suspensa: false, motivo_suspensao: null }).eq("id", escola.id);
    if (!error) onUpdate({ ...escola, status: "ATIVA", suspensa: false });
  };

  const desativarUsuario = async (userId) => {
    await supabase.from("profiles").update({ ativo: false }).eq("id", userId);
    setUsuarios(p => p.map(u => u.id === userId ? { ...u, ativo: false } : u));
  };

  const ativarUsuario = async (userId) => {
    await supabase.from("profiles").update({ ativo: true }).eq("id", userId);
    setUsuarios(p => p.map(u => u.id === userId ? { ...u, ativo: true } : u));
  };

  const statusColor = s => s === "ATIVA" ? "#22c55e" : s === "TRIAL" ? "#f59e0b" : s === "SUSPENSA" ? "#ef4444" : "#94a3b8";
  const planColor = p => p === "PRO" ? "#7c3aed" : p === "BÁSICO" ? "#2563eb" : "#f59e0b";

  return (
    <Overlay onClose={onClose}>
      <MBox width={780}>
        <MHead
          title={escola.nome}
          subtitle={escola.cidade}
          icon={escola.logo_url ? undefined : "🏫"}
          onClose={onClose}
        />
        <div style={{ padding: "0 24px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 4 }}>
          {[["info", "📋 Informações"], ["usuarios", `👥 Usuários (${usuarios.length})`], ["acesso", "🔗 Acesso"]].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 800 : 500, color: tab === t ? "#2563eb" : "#64748b", borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent", marginBottom: -1 }}>{l}</button>
          ))}
        </div>
        <MBody>
          {tab === "info" && (
            <>
              {/* Status e ações rápidas */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Badge color={statusColor(escola.status)}>{escola.status}</Badge>
                <Badge color={planColor(escola.plano)}>{escola.plano}</Badge>
                {escola.data_vencimento && <span style={{ fontSize: 12, color: "#64748b" }}>Vence: {new Date(escola.data_vencimento).toLocaleDateString("pt-BR")}</span>}
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <Btn small variant="ghost" icon="✏️" onClick={() => setModalEditar(true)}>Editar</Btn>
                  <Btn small variant="primary" onClick={() => onEntrar(escola)}>Acessar Sistema →</Btn>
                  {escola.status === "SUSPENSA" ? (
                    <Btn small variant="success" onClick={reativar}>✅ Reativar</Btn>
                  ) : (
                    <Btn small variant="danger" onClick={() => setModalSuspender(true)}>🔴 Suspender</Btn>
                  )}
                </div>
              </div>

              {escola.status === "SUSPENSA" && escola.motivo_suspensao && (
                <div style={{ padding: "10px 14px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", fontSize: 13, color: "#dc2626" }}>
                  <b>Motivo da suspensão:</b> {escola.motivo_suspensao}
                </div>
              )}

              {/* Dados */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Responsável", value: escola.responsavel_nome || "—" },
                  { label: "E-mail", value: escola.email_contato || "—" },
                  { label: "Telefone", value: escola.telefone || "—" },
                  { label: "Cidade", value: escola.cidade || "—" },
                ].map(m => (
                  <div key={m.label} style={{ padding: "12px 16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Logo */}
              {escola.logo_url && (
                <div style={{ padding: "14px 16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 16 }}>
                  <img src={escola.logo_url} alt="Logo" style={{ width: 80, height: 80, objectFit: "contain", borderRadius: 8 }} />
                  <div>
                    <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Logomarca cadastrada</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{escola.logo_url}</div>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "usuarios" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, color: "#64748b" }}>{usuarios.length} usuário(s) cadastrado(s)</span>
                <Btn small icon="+" onClick={() => setModalUsuario(true)}>Novo Usuário</Btn>
              </div>
              {loading ? <Loading msg="Carregando usuários..." /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {usuarios.length === 0 && (
                    <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
                      <p>Nenhum usuário cadastrado ainda.</p>
                      <Btn onClick={() => setModalUsuario(true)} icon="+">Cadastrar primeiro usuário</Btn>
                    </div>
                  )}
                  {usuarios.map(u => (
                    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, border: "1px solid #f1f5f9", background: u.ativo === false ? "#fef2f2" : "#fafafa" }}>
                      <Av initials={u.avatar || (u.nome || "?").slice(0, 2).toUpperCase()} color={u.ativo === false ? "#ef4444" : "#2563eb"} size={40} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: u.ativo === false ? "#94a3b8" : "#1e293b" }}>{u.nome}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{perfilLabel(u.perfil)}{u.cargo ? ` · ${u.cargo}` : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Badge color={u.perfil === "DIRECAO" ? "#7c3aed" : "#2563eb"}>{perfilLabel(u.perfil)}</Badge>
                        <Btn small variant="ghost" onClick={() => setEditandoUsuario(u)}>✏️ Editar</Btn>
                        {u.ativo === false ? (
                          <Btn small variant="success" onClick={() => ativarUsuario(u.id)}>Ativar</Btn>
                        ) : (
                          <Btn small variant="danger" onClick={() => desativarUsuario(u.id)}>Desativar</Btn>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "acesso" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ padding: "16px 20px", background: "#eff6ff", borderRadius: 12, border: "1px solid #bfdbfe" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", marginBottom: 8 }}>🔗 Link da escola</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <code style={{ fontSize: 14, color: "#1e293b", background: "#fff", padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", flex: 1 }}>
                    hub-relacionamento.vercel.app
                  </code>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
                  {escola.subdomain ? `Identificador da escola: ${escola.subdomain}` : "⚠️ Nenhum subdomínio cadastrado. Edite a escola para definir um."}
                </p>
              </div>
              <div style={{ padding: "16px 20px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 8 }}>📅 Vencimento do plano</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: escola.data_vencimento ? "#1e293b" : "#94a3b8" }}>
                  {escola.data_vencimento ? new Date(escola.data_vencimento).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "Não definido"}
                </div>
              </div>
              <div style={{ padding: "16px 20px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 12 }}>⚙️ Ações rápidas</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Btn variant="primary" onClick={() => onEntrar(escola)}>Acessar sistema da escola →</Btn>
                  <Btn variant="ghost" onClick={() => setModalEditar(true)}>✏️ Editar dados</Btn>
                  {escola.status === "SUSPENSA" ? (
                    <Btn variant="success" onClick={reativar}>✅ Reativar acesso</Btn>
                  ) : (
                    <Btn variant="danger" onClick={() => setModalSuspender(true)}>🔴 Suspender acesso</Btn>
                  )}
                </div>
              </div>
            </div>
          )}
        </MBody>
      </MBox>
      {modalUsuario && <ModalNovoUsuario escola={escola} onClose={() => setModalUsuario(false)} onSave={u => { setUsuarios(p => [...p, u]); }} />}
      {editandoUsuario && <ModalEditarUsuario usuario={editandoUsuario} onClose={() => setEditandoUsuario(null)} onSave={u => { setUsuarios(p => p.map(x => x.id === u.id ? { ...x, ...u } : x)); setEditandoUsuario(null); }} />}
      {modalSuspender && <ModalSuspender escola={escola} onClose={() => setModalSuspender(false)} onConfirm={(id, status, motivo) => { onUpdate({ ...escola, status, motivo_suspensao: motivo }); onClose(); }} />}
      {modalEditar && <ModalEscola escola={escola} onClose={() => setModalEditar(false)} onSave={updated => { onUpdate(updated); setModalEditar(false); }} />}
    </Overlay>
  );
}

// ── NARAEDU360 — MÓDULOS DO ECOSSISTEMA ────────────────────────────────────────

// Permissões padrão por módulo (quais perfis de escola têm acesso)
const PERMS_PADRAO = {
  relacionamento: ["DIRECAO","PSICOLOGO","SECRETARIA","PROFESSOR","NUCLEO","RECEPÇÃO","PSICOPEDAGOGO"],
  relatorios:     ["DIRECAO","SECRETARIA","NUCLEO"],
  financeiro:     ["DIRECAO","SECRETARIA"],
  secretaria:     ["DIRECAO","SECRETARIA"],
  pro:            ["DIRECAO","PSICOLOGO","SECRETARIA","PROFESSOR","NUCLEO","RECEPÇÃO","PSICOPEDAGOGO"],
  play:           ["DIRECAO","PROFESSOR","NUCLEO","PSICOPEDAGOGO"],
  aprende:        ["DIRECAO","PROFESSOR","NUCLEO","PSICOLOGO","PSICOPEDAGOGO"],

  bus:            ["DIRECAO","SECRETARIA","RECEPÇÃO"],
  achou:          ["DIRECAO","SECRETARIA","RECEPÇÃO","PROFESSOR","NUCLEO"],
  agenda:         ["DIRECAO","SECRETARIA","RECEPÇÃO"],
};

const PERFIS_LABELS = {
  DIRECAO:      { label: "Direção",           emoji: "🏫" },
  PSICOLOGO:    { label: "Psicólogo",         emoji: "🧠" },
  SECRETARIA:   { label: "Secretária",        emoji: "📋" },
  PROFESSOR:    { label: "Professor",          emoji: "👨‍🏫" },
  NUCLEO:       { label: "Núcleo Pedagógico", emoji: "📚" },
  RECEPÇÃO:     { label: "Recepção",          emoji: "📞" },
  PSICOPEDAGOGO:{ label: "Psicopedagogo",     emoji: "🎓" },
};

// Categorias para agrupar no Hub
const CATEGORIAS_ORDEM = ["Gestão", "Colaboradores", "Alunos", "Famílias", "Escola"];

// Perfis disponíveis no sistema
const TODOS_PERFIS = ["DIRECAO","PSICOLOGO","SECRETARIA","PROFESSOR","NUCLEO","RECEPÇÃO","PSICOPEDAGOGO"];

// Tipos de usuário (além dos perfis de escola)
// ALUNO, FAMILIA são usuários futuros do ecossistema

const NARA_MODULOS = [
  // ── GESTÃO ─────────────────────────────────────────────────────────────────
  {
    id: "relacionamento",
    nome: "NARA Relacionamento",
    desc: "Comunicação escola-família, encaminhamentos, retenção e vínculo familiar",
    emoji: "💬", cor: "#7c3aed",
    categoria: "Gestão",
    disponivel: true,
    usuarios: ["equipe_escola"],
  },
  {
    id: "relatorios",
    nome: "NARA Relatórios",
    desc: "Relatórios pedagógicos, boletins e análises de desempenho",
    emoji: "📊", cor: "#2563eb",
    categoria: "Gestão",
    disponivel: true,
    usuarios: ["equipe_escola"],
  },
  {
    id: "financeiro",
    nome: "NARA Financeiro",
    desc: "Mensalidades, inadimplência e bolsas",
    emoji: "💰", cor: "#059669",
    categoria: "Gestão",
    disponivel: false,
    usuarios: ["equipe_escola"],
  },
  {
    id: "secretaria",
    nome: "NARA Secretaria",
    desc: "Matrículas, documentos e declarações",
    emoji: "📋", cor: "#0891b2",
    categoria: "Gestão",
    disponivel: false,
    usuarios: ["equipe_escola"],
  },

  // ── PROFESSORES & COLABORADORES ────────────────────────────────────────────
  {
    id: "pro",
    nome: "NARA Pro",
    desc: "Tudo para colaboradores: agenda, comunicados internos, RH, bem-estar e gamificação de professores",
    emoji: "👩‍🏫", cor: "#d97706",
    categoria: "Colaboradores",
    disponivel: false,
    usuarios: ["equipe_escola"],
  },

  // ── ALUNOS ─────────────────────────────────────────────────────────────────
  {
    id: "play",
    nome: "NARA Play",
    desc: "Gamificação de alunos: pontos por tipo de inteligência, conquistas, moeda NARA e recompensas reais",
    emoji: "🎮", cor: "#7c3aed",
    categoria: "Alunos",
    disponivel: false,
    usuarios: ["aluno", "equipe_escola"],
  },
  {
    id: "aprende",
    nome: "NARA Aprende",
    desc: "Atividades adaptadas para crianças típicas e neurodivergentes (TDAH, autismo, dislexia...) — ferramenta para professores",
    emoji: "🧩", cor: "#db2777",
    categoria: "Colaboradores",
    disponivel: false,
    usuarios: ["equipe_escola"],
  },

  // ── FAMÍLIAS ────────────────────────────────────────────────────────────────
  {
    id: "agenda",
    nome: "NARA Agenda",
    desc: "Agenda virtual da escola para famílias — eventos, comunicados, autorização de saída e acompanhamento do filho",
    emoji: "📆", cor: "#16a34a",
    categoria: "Famílias",
    disponivel: false,
    usuarios: ["familia", "equipe_escola"],
  },
  {
    id: "bus",
    nome: "NARA Bus",
    desc: "Localização do transporte escolar em tempo real para as famílias",
    emoji: "🚌", cor: "#f59e0b",
    categoria: "Famílias",
    disponivel: false,
    usuarios: ["familia", "equipe_escola"],
  },

  // ── ESCOLA (TODOS) ──────────────────────────────────────────────────────────
  {
    id: "achou",
    nome: "NARA Achou",
    desc: "Sistema de perdidos e achados da escola — cadastro, foto e notificação para a família",
    emoji: "🔍", cor: "#64748b",
    categoria: "Escola",
    disponivel: false,
    usuarios: ["equipe_escola", "familia"],
  },
];

const LogoNara=({size=32})=>(<span style={{fontWeight:900,color:"#7c3aed",fontSize:size*0.65,fontFamily:"system-ui,sans-serif",letterSpacing:-0.5}}>Hub de Relacionamento</span>);

// Modal de módulos da escola
function ModalModulos({ escola, onClose, onSave }) {
  const ativos = escola.modulos || ["relacionamento", "relatorios", "reunioes"];
  const [selecionados, setSelecionados] = useState(ativos);
  // permissoes: { modulo_id: [perfil1, perfil2, ...] }
  const [permissoes, setPermissoes] = useState(escola.permissoes || PERMS_PADRAO);
  const [moduloExpandido, setModuloExpandido] = useState(null);
  const [saving, setSaving] = useState(false);

  const toggle = (id) => {
    setSelecionados(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    if (!selecionados.includes(id)) setModuloExpandido(id); // abre ao ativar
  };

  const togglePerfil = (moduloId, perfil) => {
    setPermissoes(p => {
      const atual = p[moduloId] || PERMS_PADRAO[moduloId] || [];
      return {
        ...p,
        [moduloId]: atual.includes(perfil) ? atual.filter(x => x !== perfil) : [...atual, perfil]
      };
    });
  };

  const handle = async () => {
    setSaving(true);
    const { data, error } = await supabase.from("escolas")
      .update({ modulos: selecionados, permissoes })
      .eq("id", escola.id).select().single();
    if (!error && data) onSave(data);
    setSaving(false); onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <MBox width={680}>
        <MHead title="Módulos e Permissões" subtitle={escola.nome} icon="🧩" onClose={onClose} />
        <MBody>
          <div style={{ padding: "10px 14px", background: "#faf5ff", borderRadius: 10, border: "1px solid #e9d5ff", fontSize: 13, color: "#7c3aed" }}>
            💡 Ative os módulos contratados e defina quais perfis têm acesso a cada um.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {NARA_MODULOS.map(m => {
              const ativo = selecionados.includes(m.id);
              const expandido = moduloExpandido === m.id && ativo;
              const perfsAtivos = permissoes[m.id] || PERMS_PADRAO[m.id] || [];

              return (
                <div key={m.id} style={{ borderRadius: 14, border: `2px solid ${ativo ? m.cor : "#e2e8f0"}`, background: ativo ? m.cor + "08" : "#fafafa", overflow: "hidden", opacity: m.disponivel ? 1 : 0.5 }}>
                  {/* Cabeçalho do módulo */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: m.disponivel ? "pointer" : "not-allowed" }}>
                    <div onClick={() => m.disponivel && toggle(m.id)} style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
                      <span style={{ fontSize: 24 }}>{m.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{m.nome}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{m.desc}
                          {ativo && <span style={{ marginLeft: 8, color: m.cor, fontWeight: 700 }}>· {perfsAtivos.length} perfil(is) com acesso</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {!m.disponivel && <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", background: "#f1f5f9", padding: "2px 8px", borderRadius: 20 }}>Em breve</span>}
                      {ativo && m.disponivel && (
                        <button onClick={() => setModuloExpandido(expandido ? null : m.id)}
                          style={{ fontSize: 11, fontWeight: 700, color: m.cor, background: m.cor + "15", border: "none", padding: "4px 12px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit" }}>
                          {expandido ? "▲ Fechar" : "⚙️ Permissões"}
                        </button>
                      )}
                      <div onClick={() => m.disponivel && toggle(m.id)}
                        style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${ativo ? m.cor : "#cbd5e1"}`, background: ativo ? m.cor : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                        {ativo && <span style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>✓</span>}
                      </div>
                    </div>
                  </div>

                  {/* Painel de permissões */}
                  {expandido && (
                    <div style={{ borderTop: `1px solid ${m.cor}20`, padding: "14px 18px", background: "#fff" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>PERFIS COM ACESSO A ESTE MÓDULO:</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {Object.entries(PERFIS_LABELS).map(([perfil, info]) => {
                          const temAcesso = perfsAtivos.includes(perfil);
                          return (
                            <button key={perfil} onClick={() => togglePerfil(m.id, perfil)}
                              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${temAcesso ? m.cor : "#e2e8f0"}`, background: temAcesso ? m.cor : "#f8fafc", color: temAcesso ? "#fff" : "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                              <span>{info.emoji}</span> {info.label}
                              {temAcesso && <span style={{ fontSize: 11 }}>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
                        {perfsAtivos.length === 0
                          ? "⚠️ Nenhum perfil selecionado — ninguém verá este módulo!"
                          : `✓ ${perfsAtivos.length} perfil(is) poderá(ão) acessar este módulo`}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </MBody>
        <MFoot>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={handle} disabled={saving} style={{ background: "#7c3aed", color: "#fff", border: "none" }}>
            {saving ? "Salvando..." : "Salvar Módulos e Permissões"}
          </Btn>
        </MFoot>
      </MBox>
    </Overlay>
  );
}

// ── SUPER ADMIN PANEL ──────────────────────────────────────────────────────────
function SuperAdminPanel({ onLogout, onEntrarEscola }) {
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNova, setModalNova] = useState(false);
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [modalModulos, setModalModulos] = useState(null);
  const [busca, setBusca] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("escolas");

  useEffect(() => { carregarEscolas(); }, []);

  const carregarEscolas = async () => {
    setLoading(true);
    const { data } = await supabase.from("escolas").select("*").order("nome");
    setEscolas(data || []);
    setLoading(false);
  };

  const filtradas = escolas.filter(e => !busca || e.nome?.toLowerCase().includes(busca.toLowerCase()) || e.cidade?.toLowerCase().includes(busca.toLowerCase()));
  const statusColor = s => s === "ATIVA" ? "#22c55e" : s === "TRIAL" ? "#f59e0b" : s === "SUSPENSA" ? "#ef4444" : "#94a3b8";
  const planColor = p => p === "PRO" ? "#7c3aed" : p === "BÁSICO" ? "#2563eb" : "#f59e0b";

  const totalModulos = escolas.reduce((acc, e) => {
    (e.modulos || []).forEach(m => { acc[m] = (acc[m] || 0) + 1; });
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: "#f5f3ff", fontFamily: "system-ui,sans-serif" }}>
      {/* Topbar NARAEDU360 */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e9d5ff", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <LogoNara size={34} />
          <div style={{ width: 1, height: 28, background: "#e9d5ff" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#a855f7", letterSpacing: 1 }}>PAINEL SUPER ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Av initials="SA" color="#7c3aed" />
          <Btn variant="ghost" small onClick={onLogout}>Sair</Btn>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* Métricas topo */}
        <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
          {[
            { label: "Escolas Ativas",  value: escolas.filter(e => e.status === "ATIVA").length,    color: "#22c55e", bg: "#f0fdf4", icon: "✅" },
            { label: "Em Trial",        value: escolas.filter(e => e.status === "TRIAL").length,    color: "#f59e0b", bg: "#fffbeb", icon: "🔬" },
            { label: "Suspensas",       value: escolas.filter(e => e.status === "SUSPENSA").length, color: "#ef4444", bg: "#fef2f2", icon: "🔴" },
            { label: "Planos PRO",      value: escolas.filter(e => e.plano === "PRO").length,       color: "#7c3aed", bg: "#faf5ff", icon: "⭐" },
            { label: "Total Escolas",   value: escolas.length,                                       color: "#2563eb", bg: "#eff6ff", icon: "🏫" },
          ].map(m => (
            <Card key={m.label} style={{ flex: 1, minWidth: 140, background: m.bg, border: `1px solid ${m.color}30` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{m.icon}</span>
                <span style={{ fontSize: 11, color: m.color, fontWeight: 700 }}>{m.label}</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: m.color }}>{m.value}</div>
            </Card>
          ))}
        </div>

        {/* Abas */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {[["escolas", "🏫 Escolas"]].map(([id, label]) => (
            <button key={id} onClick={() => setAbaAtiva(id)} style={{ padding: "9px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: abaAtiva === id ? 800 : 500, background: abaAtiva === id ? "#7c3aed" : "#fff", color: abaAtiva === id ? "#fff" : "#64748b", boxShadow: abaAtiva === id ? "0 2px 8px #7c3aed40" : "none" }}>
              {label}
            </button>
          ))}
        </div>

        {/* ABA ESCOLAS */}
        {abaAtiva === "escolas" && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>Escolas Cadastradas</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>Gerencie todas as instituições cadastradas</p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar escola..." style={{ padding: "8px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", width: 200 }} />
                <Btn icon="+" onClick={() => setModalNova(true)} style={{ background: "#7c3aed", border: "none" }}>Nova Escola</Btn>
              </div>
            </div>

            {loading ? <Loading msg="Carregando escolas..." /> : filtradas.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🏫</div>
                <p style={{ fontSize: 16, fontWeight: 600 }}>Nenhuma escola cadastrada ainda</p>
                <Btn onClick={() => setModalNova(true)} icon="+" style={{ background: "#7c3aed", border: "none" }}>Cadastrar primeira escola</Btn>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filtradas.map(escola => {
                  return (
                    <div key={escola.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", borderRadius: 14, border: `1.5px solid ${escola.status === "SUSPENSA" ? "#fecaca" : "#e9d5ff"}`, background: escola.status === "SUSPENSA" ? "#fff5f5" : "#fff", flexWrap: "wrap" }}>
                      <div style={{ width: 54, height: 54, borderRadius: 12, background: "#faf5ff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, border: "1.5px solid #e9d5ff" }}>
                        {escola.logo_url ? <img src={escola.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={e => e.target.style.display = "none"} /> : <span style={{ fontSize: 24 }}>🏫</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>{escola.nome}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{escola.cidade}{escola.responsavel_nome ? ` · ${escola.responsavel_nome}` : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <Badge color={planColor(escola.plano)}>{escola.plano}</Badge>
                        <Badge color={statusColor(escola.status)}>{escola.status}</Badge>
                        {escola.data_vencimento && <span style={{ fontSize: 11, color: "#94a3b8" }}>até {new Date(escola.data_vencimento).toLocaleDateString("pt-BR")}</span>}
                        <Btn small variant="ghost" onClick={() => setEscolaSelecionada(escola)}>Gerenciar →</Btn>
                        <Btn small onClick={() => onEntrarEscola(escola)} style={{ background: "#7c3aed", color: "#fff", border: "none" }}>Acessar</Btn>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* ABA ECOSSISTEMA */}
        {abaAtiva === "ecossistema" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900, color: "#1e293b" }}>Ecossistema NARAEDU360</h2>
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Visão geral de todos os módulos e adoção pelas escolas</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {NARA_MODULOS.map(m => {
                const qtd = totalModulos[m.id] || 0;
                const pct = escolas.length > 0 ? Math.round(qtd / escolas.length * 100) : 0;
                return (
                  <Card key={m.id} style={{ border: `1.5px solid ${m.cor}30`, background: m.disponivel ? "#fff" : "#fafafa" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: m.cor + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{m.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>{m.nome}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{m.desc}</div>
                        {!m.disponivel && <span style={{ display: "inline-block", marginTop: 4, fontSize: 10, fontWeight: 700, color: "#94a3b8", background: "#f1f5f9", padding: "2px 8px", borderRadius: 20 }}>🚧 Em desenvolvimento</span>}
                      </div>
                    </div>
                    {m.disponivel ? (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Adoção</span>
                          <span style={{ fontSize: 13, fontWeight: 900, color: m.cor }}>{qtd} escola{qtd !== 1 ? "s" : ""} · {pct}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: m.cor, borderRadius: 99, transition: "width .4s" }} />
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>Disponível em breve para contratação</div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {modalNova && <ModalEscola onClose={() => setModalNova(false)} onSave={e => setEscolas(p => [...p, e])} />}
      {escolaSelecionada && (
        <PainelEscola
          escola={escolaSelecionada}
          onClose={() => setEscolaSelecionada(null)}
          onUpdate={updated => { setEscolas(p => p.map(e => e.id === updated.id ? updated : e)); setEscolaSelecionada(updated); }}
          onEntrar={escola => { setEscolaSelecionada(null); onEntrarEscola(escola); }}
        />
      )}
      {modalModulos && (
        <ModalModulos
          escola={modalModulos}
          onClose={() => setModalModulos(null)}
          onSave={updated => { setEscolas(p => p.map(e => e.id === updated.id ? updated : e)); setModalModulos(null); }}
        />
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
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #faf5ff 0%, #f0fdf4 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif" }}>
      {/* Logo e título */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:28,fontWeight:900,color:"#7c3aed",letterSpacing:-1,fontFamily:"system-ui,sans-serif"}}>Hub de Relacionamento</div>
        </div>
      </div>

      {/* Card de login */}
      <div style={{ width: 380, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 8px 40px rgba(168,85,247,.12)", border: "1.5px solid #e9d5ff" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#1e293b", textAlign: "center" }}>Acesse sua conta</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="E-mail" type="email" placeholder="nome@instituicao.edu.br" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />
          <Input label="Senha" type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} error={erro} />
          <button onClick={handle} disabled={loading}
            style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff", background: loading ? "#c4b5fd" : "linear-gradient(135deg, #a855f7, #7c3aed)", marginTop: 4, letterSpacing: 1 }}>
            {loading ? "Entrando..." : "ENTRAR"}
          </button>
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 11, color: "#c4b5fd" }}>© Hub de Relacionamento Escolar</p>
    </div>
  );
}

// ── BUSCA DE ALUNO COM DIGITAÇÃO ──────────────────────────────────────────────
function BuscaAluno({ alunos, value, onChange, error }) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const alunoSel = alunos.find(a => a.id === value);

  const filtrados = busca.length > 0
    ? alunos.filter(a => a.nome?.toLowerCase().includes(busca.toLowerCase()) || a.turma?.toLowerCase().includes(busca.toLowerCase())).slice(0, 12)
    : [];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selecionar = (aluno) => {
    onChange(aluno.id);
    setBusca("");
    setAberto(false);
  };

  const limpar = () => { onChange(""); setBusca(""); setAberto(false); };

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: error ? "#ef4444" : "#475569" }}>Aluno *</label>

      {alunoSel ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", border: `1.5px solid ${error ? "#ef4444" : "#2563eb"}`, borderRadius: 8, background: "#eff6ff" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{alunoSel.nome}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{alunoSel.turma}</div>
          </div>
          <button onClick={limpar} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, padding: 4 }}>✕</button>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <input
            value={busca}
            onChange={e => { setBusca(e.target.value); setAberto(true); }}
            onFocus={() => setAberto(true)}
            placeholder="Digite o nome do aluno para buscar..."
            style={{ width: "100%", padding: "9px 13px", border: `1.5px solid ${error ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fafafa", color: "#1e293b", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          {busca && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#94a3b8" }}>🔍</span>}
        </div>
      )}

      {aberto && filtrados.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,.12)", maxHeight: 280, overflowY: "auto", marginTop: 4 }}>
          {filtrados.map(a => (
            <div key={a.id} onClick={() => selecionar(a)}
              style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", transition: "background .1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{a.nome}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{a.turma}{a.responsavel ? ` · Resp.: ${a.responsavel}` : ""}</div>
            </div>
          ))}
        </div>
      )}

      {aberto && busca.length > 0 && filtrados.length === 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", boxShadow: "0 8px 32px rgba(0,0,0,.12)", marginTop: 4, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
          Nenhum aluno encontrado para "{busca}"
        </div>
      )}

      {error && <span style={{ fontSize: 11, color: "#ef4444" }}>{error}</span>}
    </div>
  );
}

// ── BLOCO NUMERADO (fora do modal para evitar remontagem a cada tecla) ─────────
const FBlock = ({ num, title, children }) => (
  <div style={{ background: "#f8fafc", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{num}</div>
      <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>{title}</span>
    </div>
    {children}
  </div>
);

// ── BUSCA DE MOTIVO COM DIGITAÇÃO ─────────────────────────────────────────────
function BuscaMotivo({ motivos, value, onChange, error }) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  const opcoes = [
    ...(motivos || []).map(m => ({ id: m.id, nome: m.nome, pontos: m.pontos })),
    { id: "outro", nome: "✏️ Outro (digitar manualmente)", pontos: null },
  ];

  const motivoSel = opcoes.find(m => m.id === value);

  const filtrados = busca.length > 0
    ? opcoes.filter(m => m.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 15)
    : [];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selecionar = (m) => { onChange(m.id); setBusca(""); setAberto(false); };
  const limpar = () => { onChange(""); setBusca(""); setAberto(false); };

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: error ? "#ef4444" : "#475569" }}>Motivo da Comunicação *</label>

      {motivoSel ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", border: `1.5px solid ${error ? "#ef4444" : "#2563eb"}`, borderRadius: 8, background: "#eff6ff" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{motivoSel.nome}</div>
            {motivoSel.pontos !== null && (
              <div style={{ fontSize: 11, color: motivoSel.pontos > 0 ? "#dc2626" : "#16a34a" }}>
                {motivoSel.pontos > 0 ? `+${motivoSel.pontos} pts de risco` : `${motivoSel.pontos} pts de risco`}
              </div>
            )}
          </div>
          <button onClick={limpar} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, padding: 4 }}>✕</button>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <input
            value={busca}
            onChange={e => { setBusca(e.target.value); setAberto(true); }}
            onFocus={() => setAberto(true)}
            placeholder="Digite o motivo para buscar..."
            style={{ width: "100%", padding: "9px 13px", border: `1.5px solid ${error ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fafafa", color: "#1e293b", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          {busca && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#94a3b8" }}>🔍</span>}
        </div>
      )}

      {aberto && filtrados.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,.12)", maxHeight: 260, overflowY: "auto", marginTop: 4 }}>
          {filtrados.map(m => (
            <div key={m.id} onClick={() => selecionar(m)}
              style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}
              onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{m.nome}</div>
              {m.pontos !== null && (
                <div style={{ fontSize: 11, color: m.pontos > 0 ? "#dc2626" : "#16a34a" }}>
                  {m.pontos > 0 ? `+${m.pontos} pts` : `${m.pontos} pts`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {aberto && busca.length > 0 && filtrados.length === 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", boxShadow: "0 8px 32px rgba(0,0,0,.12)", marginTop: 4, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
          Nenhum motivo encontrado para "{busca}"
        </div>
      )}

      {error && <span style={{ fontSize: 11, color: "#ef4444" }}>{error}</span>}
    </div>
  );
}

// ── MODAIS SISTEMA ESCOLAR ─────────────────────────────────────────────────────
function ModalNovaCom({ onClose, onSave, profile, alunos, equipe, motivos: motivosInit, escolaId }) {
  const [motivos, setMotivos] = useState(motivosInit || []);
  const [iaAnalisando, setIaAnalisando] = useState(false);
  const [iaSugestao, setIaSugestao] = useState(null);
  const [f, setF] = useState({ alunoId: "", titulo: "", detalhes: "", urgencia: "", comQuem: "", via: "", motivoId: "", motivoCustom: "", motivoCustomPontos: "0", encaminhar: false, encDestino: "", encResponsavelId: "", encResponsavelNome: "", encObs: "" });
  const [arquivo, setArquivo] = useState(null);
  const [err, setErr] = useState({});
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));

  const setorParaPerfil = { "Psicólogo": "PSICOLOGO", "Psicopedagogo": "PSICOPEDAGOGO", "Secretária": "SECRETARIA", "Professor": "PROFESSOR", "Recepção": "RECEPÇÃO", "Núcleo Pedagógico": "NUCLEO", "Direção": "DIRECAO" };
  const equipeDoSetor = f.encDestino ? equipe.filter(u => u.perfil === setorParaPerfil[f.encDestino] && u.id !== profile.id) : equipe.filter(u => u.id !== profile.id);

  const motivoSel = f.motivoId === "outro" ? { nome: f.motivoCustom, pontos: Number(f.motivoCustomPontos) || 0 } : motivos?.find(m => m.id === f.motivoId);

  const validate = () => {
    const e = {};
    if (!f.alunoId) e.alunoId = "Obrigatório";
    if (!f.motivoId) e.motivoId = "Selecione o motivo";
    if (f.motivoId === "outro" && !f.motivoCustom?.trim()) e.motivoCustom = "Descreva o motivo";
    if (!f.detalhes.trim()) e.detalhes = "Descreva ou grave o relato";
    if (!f.comQuem) e.comQuem = "Obrigatório";
    if (!f.via) e.via = "Obrigatório";
    if (f.encaminhar && !f.encDestino) e.encDestino = "Obrigatório";
    if (f.encaminhar && !f.encResponsavelNome) e.encResponsavel = "Obrigatório";
    setErr(e); return Object.keys(e).length === 0;
  };
  const handle = async () => {
    if (!validate()) return;
    setSaving(true);
    const pontos = f.motivoId === "outro" ? (Number(f.motivoCustomPontos) || 0) : (motivoSel?.pontos || 0);
    const nomeMotivo = f.motivoId === "outro" ? f.motivoCustom : (motivoSel?.nome || "");
    // Upload de arquivo se houver
    let arquivoUrl = null, arquivoNome = null;
    if (arquivo) {
      const ext = arquivo.name.split(".").pop();
      const path = `${escolaId || profile.escola_id}/${Date.now()}.${ext}`;
      const { data: upData, error: upErr } = await supabase.storage.from("comunicacoes-anexos").upload(path, arquivo);
      if (!upErr && upData) { const { data: urlData } = supabase.storage.from("comunicacoes-anexos").getPublicUrl(path); arquivoUrl = urlData?.publicUrl || null; arquivoNome = arquivo.name; }
    }

        const payload = {
      escola_id: escolaId || profile.escola_id,
      aluno_id: f.alunoId, data_registro: fmtDate(),
      titulo: nomeMotivo, detalhes: f.detalhes,
      urgencia: f.urgencia || null, autor_id: profile.id, autor_nome: profile.nome,
      motivo_id: f.motivoId !== "outro" ? f.motivoId : null,
      motivo_nome: nomeMotivo, motivo_pontos: pontos,
      encaminhamento: f.encaminhar, enc_destino: f.encaminhar ? f.encDestino : null,
      enc_responsavel: f.encaminhar ? f.encResponsavelNome : null,
      enc_responsavel_id: f.encaminhar ? f.encResponsavelId : null,
      enc_obs: f.encObs || null, enc_status: f.encaminhar ? "PENDENTE" : null,
      status: f.encaminhar ? "PENDENTE" : "CONCLUÍDO", com_quem: f.comQuem,
      via_comunicacao: f.via, arquivo_url: arquivoUrl, arquivo_nome: arquivoNome
    };
    const { data, error } = await supabase.from("comunicacoes").insert([payload]).select().single();
    if (error) {
      console.error("Erro ao salvar comunicação:", JSON.stringify(error));
      alert("Erro: " + (error.message || JSON.stringify(error)));
    }
    if (!error && data) {
      // Atualizar score do aluno
      const aluno = alunos.find(a => a.id === f.alunoId);
      if (aluno && pontos !== 0) {
        const novoRisco = Math.max(0, Math.min(100, (aluno.risco || 0) + pontos));
        await supabase.from("alunos").update({ risco: novoRisco }).eq("id", f.alunoId);
        data._novoRisco = novoRisco;
      }
      onSave(data);
    }
    setSaving(false); onClose();
  };
  return (
    <Overlay onClose={onClose}>
      <MBox>
        <MHead title="Nova Comunicação" subtitle="Registre uma nova interação." icon="📨" onClose={onClose} />
        <MBody>
          <FBlock num="1" title="Identificação">
            <BuscaAluno alunos={alunos} value={f.alunoId} onChange={id => upd("alunoId", id)} error={err.alunoId} />
            <div>
              <BuscaMotivo motivos={motivos} value={f.motivoId} onChange={id => upd("motivoId", id)} error={err.motivoId} />

              {/* Campo personalizado */}
              {f.motivoId === "outro" && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: err.motivoCustom ? "#ef4444" : "#475569" }}>Descreva o motivo *</label>
                      <input value={f.motivoCustom} onChange={e => upd("motivoCustom", e.target.value)} placeholder="Ex: Problema com transporte escolar" style={{ padding: "9px 13px", border: `1.5px solid ${err.motivoCustom ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fafafa", color: "#1e293b", fontFamily: "inherit" }} />
                      {err.motivoCustom && <span style={{ fontSize: 11, color: "#ef4444" }}>{err.motivoCustom}</span>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Pontuação de risco</label>
                      <input type="number" value={f.motivoCustomPontos} onChange={e => upd("motivoCustomPontos", e.target.value)} placeholder="Ex: 15" min="-50" max="50" style={{ padding: "9px 13px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", background: "#fafafa", color: "#1e293b", fontFamily: "inherit" }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>💡 Valores positivos aumentam o risco. Negativos reduzem. Ex: +15 para algo ruim, -5 para algo bom.</div>
                </div>
              )}

              {/* Preview da pontuação */}
              {motivoSel && f.motivoId !== "outro" && (
                <div style={{ marginTop: 6, padding: "6px 12px", borderRadius: 8, background: motivoSel.pontos > 0 ? "#fef2f2" : "#f0fdf4", border: `1px solid ${motivoSel.pontos > 0 ? "#fecaca" : "#bbf7d0"}`, fontSize: 12, fontWeight: 700, color: motivoSel.pontos > 0 ? "#dc2626" : "#16a34a" }}>
                  {motivoSel.pontos > 0 ? `⚠️ +${motivoSel.pontos} pontos de risco` : `✓ ${Math.abs(motivoSel.pontos)} pontos de risco reduzidos`}
                </div>
              )}
              {f.motivoId === "outro" && f.motivoCustomPontos && (
                <div style={{ marginTop: 6, padding: "6px 12px", borderRadius: 8, background: Number(f.motivoCustomPontos) > 0 ? "#fef2f2" : "#f0fdf4", border: `1px solid ${Number(f.motivoCustomPontos) > 0 ? "#fecaca" : "#bbf7d0"}`, fontSize: 12, fontWeight: 700, color: Number(f.motivoCustomPontos) > 0 ? "#dc2626" : "#16a34a" }}>
                  {Number(f.motivoCustomPontos) > 0 ? `⚠️ +${f.motivoCustomPontos} pontos de risco` : `✓ ${Math.abs(Number(f.motivoCustomPontos))} pontos de risco reduzidos`}
                </div>
              )}
            </div>
          </FBlock>
          <FBlock num="2" title="Detalhamento">
            <CampoRelato value={f.detalhes} onChange={v => upd("detalhes", v)} onBlur={() => analisarComIA(f.detalhes)} />
            {err.detalhes && <span style={{ fontSize: 11, color: "#ef4444" }}>{err.detalhes}</span>}
            {iaAnalisando && (<div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#faf5ff", borderRadius: 10, border: "1px solid #e9d5ff" }}><div style={{ width: 16, height: 16, border: "2px solid #e9d5ff", borderTop: "2px solid #7c3aed", borderRadius: "50%", animation: "spin 1s linear infinite", flexShrink: 0 }} /><span style={{ fontSize: 13, color: "#7c3aed" }}>🤖 IA analisando o relato...</span></div>)}
            {iaSugestao && !iaAnalisando && (<div style={{ padding: "14px 16px", background: iaSugestao.encontrado ? "#eff6ff" : "#fefce8", borderRadius: 10, border: `1.5px solid ${iaSugestao.encontrado ? "#bfdbfe" : "#fef08a"}` }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}><div><div style={{ fontSize: 12, fontWeight: 700, color: iaSugestao.encontrado ? "#1d4ed8" : "#a16207", marginBottom: 4 }}>🤖 {iaSugestao.encontrado ? "IA identificou o motivo:" : "IA sugere novo motivo:"}</div><div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>{iaSugestao.nome}</div><div style={{ fontSize: 12, color: iaSugestao.pontos > 0 ? "#dc2626" : "#16a34a", fontWeight: 700, marginTop: 2 }}>{iaSugestao.pontos > 0 ? `⚠️ +${iaSugestao.pontos} pts de risco` : `✅ ${Math.abs(iaSugestao.pontos)} pts de redução`}{!iaSugestao.encontrado && <span style={{ color: "#a16207", fontWeight: 600, marginLeft: 8 }}>· será criado automaticamente</span>}</div></div><div style={{ display: "flex", gap: 8 }}><Btn small variant="success" onClick={confirmarSugestao}>✅ Confirmar</Btn><Btn small variant="ghost" onClick={() => setIaSugestao(null)}>❌ Ignorar</Btn></div></div></div>)}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Sel label="Via de Comunicação *" error={err.via} value={f.via} onChange={e => upd("via", e.target.value)}>
                <option value="">Selecione...</option>
                <option value="WhatsApp">📱 WhatsApp</option>
                <option value="Ligação">📞 Ligação</option>
                <option value="Presencial">🤝 Presencial</option>
                <option value="E-mail">📧 E-mail</option>
                <option value="Bilhete">📝 Bilhete / Agenda</option>
                <option value="Videoconferência">💻 Videoconferência</option>
                <option value="Outro">🔹 Outro</option>
              </Sel>
              <Sel label="Urgência" value={f.urgencia} onChange={e => upd("urgencia", e.target.value)}>
                <option value="">— Sem urgência —</option>
                <option value="BAIXA">BAIXA</option>
                <option value="MEDIA">MÉDIA</option>
                <option value="ALTA">ALTA</option>
              </Sel>
            </div>
            <Sel label="Comunicação com *" error={err.comQuem} value={f.comQuem} onChange={e => upd("comQuem", e.target.value)}>
              <option value="">Selecione...</option>
              <option>Responsável / Família</option>
              <option>Aluno</option>
              <option>Professor</option>
              <option>Outro setor</option>
            </Sel>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>📎 Anexar arquivo (opcional)</label>
              <div style={{ position: "relative", border: "1.5px dashed #e2e8f0", borderRadius: 8, padding: "10px 14px", background: arquivo ? "#f0fdf4" : "#fafafa", display: "flex", alignItems: "center", gap: 10 }}>
                <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={e => setArquivo(e.target.files?.[0] || null)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
                {arquivo ? (<><span style={{ fontSize: 18 }}>✅</span><span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>{arquivo.name}</span><button onClick={e => { e.stopPropagation(); setArquivo(null); }} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16 }}>✕</button></>) : (<><span style={{ fontSize: 18 }}>📎</span><span style={{ fontSize: 13, color: "#94a3b8" }}>Clique para anexar imagem, PDF ou documento</span></>)}
              </div>
            </div>
          </FBlock>
          <FBlock num="3" title="Encaminhamento">
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: 12, borderRadius: 8, border: `1.5px solid ${f.encaminhar ? "#2563eb" : "#e2e8f0"}`, background: f.encaminhar ? "#eff6ff" : "#fff" }}>
              <input type="checkbox" checked={f.encaminhar} onChange={e => upd("encaminhar", e.target.checked)} style={{ marginTop: 2 }} />
              <div><div style={{ fontWeight: 600, color: "#1e293b", fontSize: 14 }}>Encaminhar para outro setor</div><div style={{ fontSize: 12, color: "#94a3b8" }}>Exige ação ou acompanhamento de terceiros.</div></div>
            </label>
            {f.encaminhar && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Sel label="Setor de Destino *" error={err.encDestino} value={f.encDestino} onChange={e => { upd("encDestino", e.target.value); upd("encResponsavelId", ""); upd("encResponsavelNome", ""); }}>
                    <option value="">Selecione...</option>
                    {SETORES.map(s => <option key={s}>{s}</option>)}
                  </Sel>
                  <Sel label={`Responsável *${f.encDestino && equipeDoSetor.length > 0 ? ` (${equipeDoSetor.length})` : ""}`} error={err.encResponsavel} value={f.encResponsavelId} onChange={e => { const u = equipe.find(x => x.id === e.target.value); upd("encResponsavelId", e.target.value); upd("encResponsavelNome", u?.nome || ""); }}>
                    <option value="">Selecione...</option>
                    {equipeDoSetor.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
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

function ModalNovaReuniao({ onClose, onSave, profile, alunos, escolaId }) {
  const [f, setF] = useState({ titulo: "", tipo: "Reunião de Pais", data: "", descricao: "", ata: "", proximaAcao: "" });
  const [convocados, setConvocados] = useState([]);
  const [err, setErr] = useState({});
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");
  const [turmaSel, setTurmaSel] = useState("");
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));

  const turmas = [...new Set(alunos.map(a => a.turma).filter(Boolean))].sort();

  const alunosFiltrados = alunos.filter(a => {
    const okTurma = !turmaSel || a.turma === turmaSel;
    const okBusca = !busca || a.nome?.toLowerCase().includes(busca.toLowerCase()) || a.responsavel?.toLowerCase().includes(busca.toLowerCase());
    return okTurma && okBusca;
  });

  const toggleAluno = (a) => setConvocados(p => p.find(c => c.alunoId === a.id) ? p.filter(c => c.alunoId !== a.id) : [...p, { alunoId: a.id, responsavel: a.responsavel, compareceu: false }]);
  const toggleP = (id) => setConvocados(p => p.map(c => c.alunoId === id ? { ...c, compareceu: !c.compareceu } : c));

  const selecionarTurma = () => {
    const jaSelecionados = alunosFiltrados.every(a => convocados.find(c => c.alunoId === a.id));
    if (jaSelecionados) {
      setConvocados(p => p.filter(c => !alunosFiltrados.find(a => a.id === c.alunoId)));
    } else {
      const novos = alunosFiltrados.filter(a => !convocados.find(c => c.alunoId === a.id));
      setConvocados(p => [...p, ...novos.map(a => ({ alunoId: a.id, responsavel: a.responsavel, compareceu: false }))]);
    }
  };

  const handle = async () => {
    const e = {};
    if (!f.titulo.trim()) e.titulo = "Obrigatório";
    if (!f.data) e.data = "Obrigatório";
    setErr(e); if (Object.keys(e).length) return;
    setSaving(true);
    const { data: reuniao, error } = await supabase.from("reunioes").insert([{ escola_id: escolaId || profile.escola_id, data_reuniao: new Date(f.data).toLocaleDateString("pt-BR"), tipo: f.tipo, titulo: f.titulo, descricao: f.descricao, ata: f.ata, proxima_acao: f.proximaAcao, autor_id: profile.id }]).select().single();
    if (!error && reuniao && convocados.length > 0) {
      await supabase.from("reuniao_convocados").insert(convocados.map(c => ({ reuniao_id: reuniao.id, aluno_id: c.alunoId, responsavel: c.responsavel, compareceu: c.compareceu })));
    }
    if (!error && reuniao) onSave({ ...reuniao, convocados });
    setSaving(false); onClose();
  };

  const todosFiltradosSel = alunosFiltrados.length > 0 && alunosFiltrados.every(a => convocados.find(c => c.alunoId === a.id));

  return (
    <Overlay onClose={onClose}>
      <MBox width={700}>
        <MHead title="Nova Reunião" subtitle="Registre a reunião e a presença familiar." icon="📅" onClose={onClose} />
        <MBody>
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 12 }}>
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
          </div>

          <div style={{ background: "#f8fafc", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Cabeçalho com contador */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>Lista de Presença</div>
              {convocados.length > 0 && (
                <div style={{ display: "flex", gap: 8 }}>
                  <Badge color="#2563eb">{convocados.length} convocados</Badge>
                  <Badge color="#16a34a">✓ {convocados.filter(c => c.compareceu).length} presentes</Badge>
                  <Badge color="#ef4444">✗ {convocados.filter(c => !c.compareceu).length} ausentes</Badge>
                </div>
              )}
            </div>

            {/* Filtros: busca + turma */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="🔍 Buscar por nome ou responsável..."
                style={{ padding: "8px 13px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff", fontFamily: "inherit" }}
              />
              <select
                value={turmaSel}
                onChange={e => setTurmaSel(e.target.value)}
                style={{ padding: "8px 13px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff", fontFamily: "inherit", minWidth: 140 }}
              >
                <option value="">Todas as turmas</option>
                {turmas.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Botão selecionar todos da turma/filtro */}
            {alunosFiltrados.length > 0 && (
              <button
                onClick={selecionarTurma}
                style={{ alignSelf: "flex-start", padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${todosFiltradosSel ? "#ef4444" : "#2563eb"}`, background: todosFiltradosSel ? "#fef2f2" : "#eff6ff", color: todosFiltradosSel ? "#ef4444" : "#2563eb", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                {todosFiltradosSel ? `✕ Desmarcar todos (${alunosFiltrados.length})` : `✓ Selecionar todos (${alunosFiltrados.length})`}
              </button>
            )}

            {/* Lista filtrada */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
              {alunosFiltrados.length === 0 && (
                <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>
                  Nenhum aluno encontrado para "{busca}"
                </div>
              )}
              {alunosFiltrados.map(a => {
                const conv = convocados.find(c => c.alunoId === a.id);
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${conv ? "#2563eb" : "#e2e8f0"}`, background: conv ? "#eff6ff" : "#fff" }}>
                    <input type="checkbox" checked={!!conv} onChange={() => toggleAluno(a)} style={{ cursor: "pointer", width: 16, height: 16, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{a.nome}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>
                        {a.turma && <span style={{ marginRight: 8, background: "#e0e7ff", color: "#3730a3", padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>{a.turma}</span>}
                        Resp.: {a.responsavel || "—"}
                      </div>
                    </div>
                    {conv && (
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: conv.compareceu ? "#16a34a" : "#94a3b8", cursor: "pointer", flexShrink: 0 }}>
                        <input type="checkbox" checked={conv.compareceu} onChange={() => toggleP(a.id)} />
                        {conv.compareceu ? "✓ Compareceu" : "Ausente"}
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: "#f8fafc", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>Ata e Próximos Passos</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Ata / Resumo</label>
              <textarea value={f.ata} onChange={e => upd("ata", e.target.value)} placeholder="O que foi discutido e decidido..." rows={3} style={{ padding: "9px 13px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", background: "#fafafa", fontFamily: "inherit", resize: "vertical", width: "100%", boxSizing: "border-box" }} />
            </div>
            <Input label="Próxima Ação" value={f.proximaAcao} onChange={e => upd("proximaAcao", e.target.value)} placeholder="Ex: Contato com famílias ausentes até 10/04" />
          </div>
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
    await supabase.from("comunicacoes").update({ enc_status: status, status, resolucao }).eq("id", item.id);
    onResolve(item.id, status, resolucao);
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

function ModalNovoAluno({ onClose, onSave, profile, escolaId }) {
  const [modo, setModo] = useState("massa");
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ nome: "", turma: "", rm: "", responsavel: "", telefone: "" });
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const linhaVazia = () => ({ nome: "", responsavel: "", turma: "", telefone: "" });
  const [linhas, setLinhas] = useState(Array.from({ length: 10 }, linhaVazia));
  const updLinha = (i, k, v) => setLinhas(p => p.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const addLinhas = () => setLinhas(p => [...p, ...Array.from({ length: 5 }, linhaVazia)]);
  const linhasValidas = linhas.filter(l => l.nome.trim());
  const handlePaste = (e, rowIdx, colKey) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\t") && !text.includes("\n")) return;
    e.preventDefault();
    const cols = ["nome", "responsavel", "turma", "telefone"];
    const colIdx = cols.indexOf(colKey);
    const rows = text.trim().split("\n").map(r => r.split("\t"));
    setLinhas(prev => {
      const novo = [...prev];
      rows.forEach((row, ri) => {
        const targetRow = rowIdx + ri;
        if (!novo[targetRow]) novo.push(linhaVazia());
        row.forEach((val, ci) => {
          const colTarget = colIdx + ci;
          if (colTarget < cols.length) novo[targetRow] = { ...novo[targetRow], [cols[colTarget]]: val.trim() };
        });
      });
      return novo;
    });
  };
  const handleSalvarMassa = async () => {
    if (linhasValidas.length === 0) return;
    setSaving(true);
    const payload = linhasValidas.map(l => ({ nome: l.nome.trim(), responsavel: l.responsavel.trim(), turma: l.turma.trim(), telefone: l.telefone.trim(), rm: "", escola_id: escolaId || profile.escola_id, risco: 0 }));
    const { data, error } = await supabase.from("alunos").insert(payload).select();
    if (!error && data) data.forEach(a => onSave(a));
    setSaving(false); onClose();
  };
  const handleSalvarIndividual = async () => {
    if (!f.nome.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("alunos").insert([{ ...f, escola_id: escolaId || profile.escola_id, risco: 0 }]).select().single();
    if (!error && data) onSave(data);
    setSaving(false); onClose();
  };
  const thS = { padding: "8px 10px", background: "#f1f5f9", fontSize: 12, fontWeight: 700, color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 1 };
  const tdS = { padding: "2px 4px", borderBottom: "1px solid #f1f5f9" };
  const inpS = (d) => ({ width: "100%", padding: "7px 10px", border: `1.5px solid ${d ? "#2563eb" : "transparent"}`, borderRadius: 6, fontSize: 13, outline: "none", background: d ? "#eff6ff" : "#fafafa", color: "#1e293b", fontFamily: "inherit", boxSizing: "border-box" });
  return (
    <Overlay onClose={onClose}>
      <MBox width={820}>
        <MHead title="Cadastrar Alunos" subtitle="Individual ou importação em massa." icon="👨‍🎓" onClose={onClose} />
        <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9", padding: "0 24px" }}>
          {[["massa", "📋 Importação em Massa"], ["individual", "➕ Individual"]].map(([m, l]) => (
            <button key={m} onClick={() => setModo(m)} style={{ padding: "10px 18px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: modo === m ? 800 : 500, color: modo === m ? "#2563eb" : "#64748b", borderBottom: modo === m ? "2px solid #2563eb" : "2px solid transparent", marginBottom: -1 }}>{l}</button>
          ))}
        </div>
        <MBody>
          {modo === "massa" && (<>
            <div style={{ padding: "10px 14px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe", fontSize: 13, color: "#1d4ed8" }}>
              💡 <b>Dica:</b> Copie e cole direto de uma planilha Excel na ordem: <b>Nome → Responsável → Turma → Telefone</b>
            </div>
            <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead><tr>
                  <th style={{ ...thS, width: 36, textAlign: "center" }}>#</th>
                  <th style={{ ...thS, width: "32%" }}>Nome do Aluno *</th>
                  <th style={{ ...thS, width: "28%" }}>Nome do Responsável</th>
                  <th style={{ ...thS, width: "18%" }}>Turma</th>
                  <th style={{ ...thS, width: "22%" }}>Telefone</th>
                </tr></thead>
                <tbody>
                  {linhas.map((l, i) => {
                    const ok = l.nome.trim().length > 0;
                    return (<tr key={i} style={{ background: ok ? "#fafffe" : "#fff" }}>
                      <td style={{ ...tdS, textAlign: "center", fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>{i + 1}</td>
                      <td style={tdS}><input value={l.nome} onChange={e => updLinha(i, "nome", e.target.value)} onPaste={e => handlePaste(e, i, "nome")} placeholder="Nome completo" style={inpS(ok)} /></td>
                      <td style={tdS}><input value={l.responsavel} onChange={e => updLinha(i, "responsavel", e.target.value)} onPaste={e => handlePaste(e, i, "responsavel")} placeholder="Nome do responsável" style={inpS(false)} /></td>
                      <td style={tdS}><input value={l.turma} onChange={e => updLinha(i, "turma", e.target.value)} onPaste={e => handlePaste(e, i, "turma")} placeholder="Ex: 3º A" style={inpS(false)} /></td>
                      <td style={tdS}><input value={l.telefone} onChange={e => updLinha(i, "telefone", e.target.value)} onPaste={e => handlePaste(e, i, "telefone")} placeholder="(00) 00000-0000" style={inpS(false)} /></td>
                    </tr>);
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={addLinhas} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#2563eb", fontWeight: 600, padding: 0 }}>+ Adicionar 5 linhas</button>
              <span style={{ fontSize: 13, color: linhasValidas.length > 0 ? "#16a34a" : "#64748b", fontWeight: linhasValidas.length > 0 ? 700 : 400 }}>
                {linhasValidas.length > 0 ? `✓ ${linhasValidas.length} aluno(s) prontos` : "Preencha pelo menos o nome"}
              </span>
            </div>
          </>)}
          {modo === "individual" && (<>
            <Input label="Nome completo *" value={f.nome} onChange={e => upd("nome", e.target.value)} placeholder="Nome do aluno" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Turma" value={f.turma} onChange={e => upd("turma", e.target.value)} placeholder="Ex: 3º A" />
              <Input label="RM / Matrícula" value={f.rm} onChange={e => upd("rm", e.target.value)} placeholder="Ex: 2024001" />
            </div>
            <Input label="Nome do Responsável" value={f.responsavel} onChange={e => upd("responsavel", e.target.value)} placeholder="Nome completo do responsável" />
            <Input label="Telefone do Responsável" value={f.telefone} onChange={e => upd("telefone", e.target.value)} placeholder="(00) 00000-0000" />
          </>)}
        </MBody>
        <MFoot>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          {modo === "massa" ? (
            <Btn onClick={handleSalvarMassa} disabled={saving || linhasValidas.length === 0} icon="📋">
              {saving ? "Salvando..." : `Cadastrar ${linhasValidas.length > 0 ? linhasValidas.length + " " : ""}Aluno(s)`}
            </Btn>
          ) : (
            <Btn onClick={handleSalvarIndividual} disabled={saving || !f.nome.trim()}>
              {saving ? "Salvando..." : "Cadastrar Aluno"}</Btn>
          )}
        </MFoot>
      </MBox>
    </Overlay>
  );
}

// ── MODAL EDITAR ALUNO ─────────────────────────────────────────────────────────
function ModalEditarAluno({ aluno, onClose, onSave }) {
  const [f, setF] = useState({ nome: aluno.nome || "", turma: aluno.turma || "", rm: aluno.rm || "", responsavel: aluno.responsavel || "", telefone: aluno.telefone || "" });
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const handle = async () => {
    if (!f.nome.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("alunos").update(f).eq("id", aluno.id).select().single();
    if (!error && data) onSave(data);
    setSaving(false); onClose();
  };
  return (
    <Overlay onClose={onClose}>
      <MBox width={500}>
        <MHead title="Editar Cadastro do Aluno" icon="✏️" subtitle={aluno.nome} onClose={onClose} />
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
          <Btn onClick={handle} disabled={saving}>{saving ? "Salvando..." : "Salvar Alterações"}</Btn>
        </MFoot>
      </MBox>
    </Overlay>
  );
}

// ── PERFIL ALUNO ───────────────────────────────────────────────────────────────
function PerfilAluno({ aluno: alunoInicial, comunicacoes, reunioes, onClose, profile, onAlunoAtualizado }) {
  const [aluno, setAluno] = useState(alunoInicial);
  const [tab, setTab] = useState("timeline");
  const [analisando, setAnalisando] = useState(false);
  const [analise, setAnalise] = useState(null);
  const [editando, setEditando] = useState(false);
  const podeEditar = profile.perfil === "DIRECAO" || profile.perfil === "SECRETARIA" || profile.perfil === "SUPER_ADMIN";
  const isCan = (c) => profile.perfil === "DIRECAO" || profile.perfil === "SUPER_ADMIN" || c.autor_id === profile.id || c.enc_responsavel_id === profile.id;
  const coms = comunicacoes.filter(c => c.aluno_id === aluno.id && isCan(c));
  const reunioesA = reunioes.filter(r => r.convocados?.some(c => c.aluno_id === aluno.id));
  const totalP = reunioesA.reduce((s, r) => s + (r.convocados?.find(c => c.aluno_id === aluno.id)?.compareceu ? 1 : 0), 0);
  const timeline = [...coms.map(c => ({ tipo: "com", data: c.data_registro, item: c })), ...reunioesA.map(r => ({ tipo: "reu", data: r.data_reuniao, item: r }))]
    .sort((a, b) => (b.data || "").split("/").reverse().join("").localeCompare((a.data || "").split("/").reverse().join("")));

  const nivelColor = { "BAIXO": "#22c55e", "MÉDIO": "#f59e0b", "ALTO": "#ef4444", "CRÍTICO": "#7c3aed" };

  const analisarRisco = async () => {
    setAnalisando(true);
    setAnalise(null);
    try {
      const res = await fetch("/api/analisar-risco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aluno, comunicacoes: coms, reunioes: reunioesA, score: aluno.risco }),
      });
      const data = await res.json();
      if (data.analise) {
        setAnalise(data.analise);
        // Salvar análise no banco
        await supabase.from("analises_risco").insert([{
          escola_id: aluno.escola_id, aluno_id: aluno.id,
          nivel: data.analise.nivel, justificativa: data.analise.justificativa,
          acao_sugerida: data.analise.acao_sugerida, score_calculado: aluno.risco,
          gerado_por: profile.id,
        }]);
      }
    } catch { setAnalise({ nivel: "MÉDIO", justificativa: "Erro ao conectar com a IA.", acao_sugerida: "Verifique manualmente." }); }
    setAnalisando(false);
  };
  return (
    <>
    <Overlay onClose={onClose}>
      <MBox width={720}>
        <MHead title={aluno.nome} subtitle={`${aluno.turma} · RM: ${aluno.rm}`} onClose={onClose} />
        <MBody>
          {/* Botão editar — só para direção e secretaria */}
          {podeEditar && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Btn small variant="ghost" icon="✏️" onClick={() => setEditando(true)}>Editar Cadastro</Btn>
            </div>
          )}
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

          {/* Análise IA — só para Direção */}
          {(profile.perfil === "DIRECAO" || profile.perfil === "SUPER_ADMIN") && <div style={{ background: "#faf5ff", borderRadius: 12, border: "1px solid #e9d5ff", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: analise ? 14 : 0, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#7c3aed" }}>🧠 Análise de Risco com IA</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Parecer inteligente baseado em todo o histórico do aluno</div>
              </div>
              <Btn small onClick={analisarRisco} disabled={analisando} style={{ background: "#7c3aed", color: "#fff", border: "none" }}>
                {analisando ? "Analisando..." : analise ? "🔄 Reanalisar" : "🧠 Analisar com IA"}
              </Btn>
            </div>
            {analisando && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
                <div style={{ width: 20, height: 20, border: "2px solid #e9d5ff", borderTop: "2px solid #7c3aed", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 13, color: "#7c3aed" }}>Analisando histórico completo do aluno...</span>
              </div>
            )}
            {analise && !analisando && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ padding: "6px 16px", borderRadius: 20, background: (nivelColor[analise.nivel] || "#94a3b8") + "20", color: nivelColor[analise.nivel] || "#94a3b8", fontWeight: 900, fontSize: 14 }}>
                    {analise.nivel === "CRÍTICO" ? "🚨" : analise.nivel === "ALTO" ? "⚠️" : analise.nivel === "MÉDIO" ? "🔶" : "✅"} RISCO {analise.nivel}
                  </div>
                </div>
                <div style={{ padding: "10px 14px", background: "#fff", borderRadius: 8, border: "1px solid #e9d5ff" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", marginBottom: 4 }}>JUSTIFICATIVA</div>
                  <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6 }}>{analise.justificativa}</div>
                </div>
                <div style={{ padding: "10px 14px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fef3c7" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", marginBottom: 4 }}>AÇÃO SUGERIDA</div>
                  <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6 }}>{analise.acao_sugerida}</div>
                </div>
              </div>
            )}
          </div>}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
                    {r.ata && <div style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>{r.ata}</div>}
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
    {editando && (
      <ModalEditarAluno
        aluno={aluno}
        onClose={() => setEditando(false)}
        onSave={(atualizado) => {
          setAluno(atualizado);
          if (onAlunoAtualizado) onAlunoAtualizado(atualizado);
          setEditando(false);
        }}
      />
    )}
    </>
  );
}

// ── SCHOOL APP ─────────────────────────────────────────────────────────────────
function SchoolApp({ user, profile, escola, onLogout, onVoltarAdmin, onVoltarHub }) {
  const [pagina, setPagina] = useState("dashboard");
  const [alunos, setAlunos] = useState([]);
  const [comunicacoes, setComunicacoes] = useState([]);
  const [reunioes, setReunioes] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNovaCom, setModalNovaCom] = useState(false);
  const [modalNovaReuniao, setModalNovaReuniao] = useState(false);
  const [modalNovoAluno, setModalNovoAluno] = useState(false);
  const [alunoSel, setAlunoSel] = useState(null);

  useEffect(() => { carregarTudo(); }, [escola.id]);

  const carregarTudo = async () => {
    setLoading(true);
    const [{ data: al }, { data: co }, { data: re }, { data: eq }, { data: mo }] = await Promise.all([
      supabase.from("alunos").select("*").eq("escola_id", escola.id).order("nome"),
      supabase.from("comunicacoes").select("*").eq("escola_id", escola.id).order("created_at", { ascending: false }),
      supabase.from("reunioes").select("*, reuniao_convocados(*)").eq("escola_id", escola.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("escola_id", escola.id),
      supabase.from("motivos").select("*").or(`escola_id.eq.${escola.id},escola_id.is.null`).order("nome"),
    ]);
    setAlunos(al || []);
    setComunicacoes(co || []);
    setReunioes((re || []).map(r => ({ ...r, convocados: r.reuniao_convocados || [] })));
    setEquipe(eq || []);
    setMotivos(mo || []);
    setLoading(false);
  };

  const addCom = (c) => setComunicacoes(p => [c, ...p]);
  const addReuniao = (r) => setReunioes(p => [r, ...p]);
  const addAluno = (a) => setAlunos(p => [...p, a].sort((x, y) => (x.nome || "").localeCompare(y.nome || "")));
  const atualizarAluno = (a) => setAlunos(p => p.map(x => x.id === a.id ? a : x));
  const resolveEnc = (id, status, resolucao) => setComunicacoes(p => p.map(c => c.id === id ? { ...c, enc_status: status, status, resolucao } : c));

  const isCan = (c) => profile.perfil === "DIRECAO" || profile.perfil === "SUPER_ADMIN" || c.autor_id === profile.id || c.enc_responsavel_id === profile.id;
  const comsVisiveis = comunicacoes.filter(c => isCan(c));

  const nav = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "alunos", icon: "👨‍🎓", label: "Alunos" },
    { id: "turmas", icon: "🏫", label: "Turmas" },
    { id: "comunicacoes", icon: "💬", label: "Comunicações" },
    { id: "encaminhamentos", icon: "📨", label: "Encaminhamentos" },
    { id: "reunioes", icon: "📅", label: "Reuniões" },
    { id: "retencao", icon: "📉", label: "Retenção" },
    ...(profile.perfil === "DIRECAO" || profile.perfil === "SUPER_ADMIN" ? [{ id: "equipe", icon: "👥", label: "Equipe" }] : []),
  ];

  if (loading) return <Loading msg="Carregando dados da escola..." />;

  // ── DASHBOARD ──
  const DashboardPage = () => {
    const alto = alunos.filter(a => a.risco >= 60);
    const medio = alunos.filter(a => a.risco >= 30 && a.risco < 60);
    const baixo = alunos.filter(a => a.risco < 30);
    const pendentes = comsVisiveis.filter(c => c.encaminhamento && c.enc_status === "PENDENTE");
    const total = alunos.length;
    const r = 58, cx = 80, cy = 80, sw = 16, circ = 2 * Math.PI * r;
    const segs = [{ n: baixo.length, color: "#22c55e", label: "Estáveis" }, { n: medio.length, color: "#f59e0b", label: "Atenção" }, { n: alto.length, color: "#ef4444", label: "Risco Alto" }];
    let off = 0;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            {escola.logo_url && <img src={escola.logo_url} alt="" style={{ height: 36, objectFit: "contain", marginBottom: 8 }} />}
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>Dashboard Estratégico</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Visão 360° de risco, engajamento e ações preventivas.</p>
          </div>
          <Btn icon="+" onClick={() => setModalNovaCom(true)}>Nova Comunicação</Btn>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[{ label: "Total de Alunos", value: total, icon: "👨‍🎓", color: "#2563eb" }, { label: "Enc. Pendentes", value: pendentes.length, icon: "📨", color: "#f59e0b" }, { label: "Em Risco Alto", value: alto.length, icon: "⚠️", color: "#ef4444" }, { label: "Comunicações", value: comsVisiveis.length, icon: "💬", color: "#7c3aed" }].map(m => (
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
                {alto.slice(0, 5).map(a => (<div key={a.id} onClick={() => setAlunoSel(a)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, border: "1px solid #fef2f2", background: "#fff5f5", cursor: "pointer" }}><div><div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{a.nome}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{a.turma}</div></div><div style={{ fontWeight: 900, fontSize: 16, color: "#ef4444" }}>{a.risco}</div></div>))}
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
              {comsVisiveis.slice(0, 5).map(c => { const aluno = alunos.find(a => a.id === c.aluno_id); return (<div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #f1f5f9" }}><div><div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{c.titulo}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{aluno?.nome} · {c.data_registro}</div></div><Badge color={getStColor(c.status)}>{getStLabel(c.status)}</Badge></div>); })}
              {comsVisiveis.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: 20 }}>Nenhuma comunicação ainda.</div>}
            </div>
          </Card>
        </div>
        {(profile.perfil === "DIRECAO" || profile.perfil === "SUPER_ADMIN") && equipe.filter(u => u.perfil !== "DIRECAO").length > 0 && (
          <Card>
            <div style={{ marginBottom: 16 }}><h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>👥 Desempenho por Usuário</h3><p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>Visão individual de cada profissional da equipe</p></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
              {equipe.filter(u => u.perfil !== "DIRECAO" && u.perfil !== "SUPER_ADMIN").map((u, i) => {
                const cores = ["#2563eb", "#7c3aed", "#059669", "#f59e0b", "#ef4444"];
                const cor = cores[i % cores.length];
                const uComs = comunicacoes.filter(c => c.autor_id === u.id);
                const uRes = comunicacoes.filter(c => c.enc_responsavel_id === u.id && c.enc_status === "RESOLVIDO").length;
                return (
                  <div key={u.id} style={{ background: "#fafafa", borderRadius: 12, padding: 16, border: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <Av initials={u.avatar || (u.nome || "?").slice(0, 2).toUpperCase()} color={cor} size={40} />
                      <div><div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{u.nome}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{perfilLabel(u.perfil)}</div></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[{ label: "Comunicações", value: uComs.length, color: cor }, { label: "Alunos", value: new Set(uComs.map(c => c.aluno_id)).size, color: cor }, { label: "Enc. enviados", value: uComs.filter(c => c.encaminhamento).length, color: "#f59e0b" }, { label: "Resolvidos", value: uRes, color: "#22c55e" }].map(m => (
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
  };

  // ── ALUNOS ──
  const AlunosPage = () => {
    const [busca, setBusca] = useState("");
    const [ord, setOrd] = useState("risco");
    const filtrados = alunos.filter(a => !busca || a.nome?.toLowerCase().includes(busca.toLowerCase()) || a.turma?.toLowerCase().includes(busca.toLowerCase())).sort((a, b) => ord === "risco" ? b.risco - a.risco : (a.nome || "").localeCompare(b.nome || ""));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div><h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>👨‍🎓 Alunos</h1><p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Base de estudantes com score de risco e histórico.</p></div>
          {(profile.perfil === "DIRECAO" || profile.perfil === "SECRETARIA" || profile.perfil === "SUPER_ADMIN") && <Btn icon="+" onClick={() => setModalNovoAluno(true)}>Cadastrar Aluno</Btn>}
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
                  <div key={a.id} onClick={() => setAlunoSel(a)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, border: "1px solid #f1f5f9", background: "#fafafa", cursor: "pointer", flexWrap: "wrap" }}>
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
  };

  // ── COMUNICAÇÕES ──
  const ComunicacoesPage = () => {
    const [busca, setBusca] = useState("");
    const [resolving, setResolving] = useState(null);
    const [expandido, setExpandido] = useState(null);
    const visiveis = comsVisiveis.filter(c => !busca || alunos.find(a => a.id === c.aluno_id)?.nome?.toLowerCase().includes(busca.toLowerCase()) || c.titulo?.toLowerCase().includes(busca.toLowerCase()));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div><h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>💬 Comunicações</h1><p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Gerencie os registros de interação.</p></div>
          <Btn icon="+" onClick={() => setModalNovaCom(true)}>Nova Comunicação</Btn>
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
              const podeAtualizar = (profile.perfil === "DIRECAO" || profile.perfil === "SUPER_ADMIN" || c.enc_responsavel_id === profile.id) && c.encaminhamento && c.enc_status !== "RESOLVIDO";
              return (
                <div key={c.id} style={{ border: "1px solid #f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                  <div onClick={() => setExpandido(exp ? null : c.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fafafa", cursor: "pointer", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, color: "#94a3b8", minWidth: 90 }}>{c.data_registro}</div>
                    <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{aluno?.nome}</div><div style={{ fontSize: 12, color: "#64748b" }}>{aluno?.turma ? `${aluno.turma} · ` : ""}{c.titulo}</div></div>
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
                      {c.com_quem && <div style={{ fontSize: 12, color: "#94a3b8" }}>Com: {c.com_quem}</div>}
                      {c.encaminhamento && <div style={{ fontSize: 12, color: "#7c3aed", marginTop: 4 }}>→ {c.enc_destino} / {c.enc_responsavel}</div>}
                      {c.resolucao && <div style={{ marginTop: 10, padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, fontSize: 13, color: "#16a34a", borderLeft: "3px solid #22c55e" }}>✓ {c.resolucao}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
        {resolving && <ModalResolucao item={resolving} alunos={alunos} onClose={() => setResolving(null)} onResolve={resolveEnc} />}
      </div>
    );
  };

  // ── ENCAMINHAMENTOS ──
  const EncaminhamentosPage = () => {
    const [resolving, setResolving] = useState(null);
    const [filtro, setFiltro] = useState("TODOS");
    const encs = comsVisiveis.filter(c => c.encaminhamento);
    const filtrados = filtro === "TODOS" ? encs : encs.filter(c => c.enc_status === filtro);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div><h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>📨 Encaminhamentos</h1><p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Acompanhe os casos encaminhados.</p></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["TODOS", "PENDENTE", "EM_ANALISE", "RESOLVIDO"].map(f => (<button key={f} onClick={() => setFiltro(f)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: filtro === f ? "#2563eb" : "#f1f5f9", color: filtro === f ? "#fff" : "#64748b" }}>{getStLabel(f)} ({f === "TODOS" ? encs.length : encs.filter(c => c.enc_status === f).length})</button>))}
        </div>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtrados.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>Nenhum encaminhamento encontrado.</div>}
            {filtrados.map(c => {
              const aluno = alunos.find(a => a.id === c.aluno_id);
              const podeAtualizar = (profile.perfil === "DIRECAO" || profile.perfil === "SUPER_ADMIN" || c.enc_responsavel_id === profile.id) && c.enc_status !== "RESOLVIDO";
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
        {resolving && <ModalResolucao item={resolving} alunos={alunos} onClose={() => setResolving(null)} onResolve={resolveEnc} />}
      </div>
    );
  };

  // ── REUNIÕES ──
  const ReunioesPage = () => {
    const [expandido, setExpandido] = useState(null);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div><h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>📅 Reuniões</h1><p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Registro e controle de presença familiar.</p></div>
          <Btn icon="+" onClick={() => setModalNovaReuniao(true)}>Nova Reunião</Btn>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[{ label: "Total", value: reunioes.length, color: "#2563eb" }, { label: "Convocados", value: reunioes.reduce((s, r) => s + (r.convocados?.length || 0), 0), color: "#7c3aed" }, { label: "Presenças", value: reunioes.reduce((s, r) => s + (r.convocados?.filter(c => c.compareceu).length || 0), 0), color: "#22c55e" }, { label: "Ausências", value: reunioes.reduce((s, r) => s + (r.convocados?.filter(c => !c.compareceu).length || 0), 0), color: "#ef4444" }].map(m => (
            <Card key={m.label} style={{ flex: 1, minWidth: 130 }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{m.label}</div><div style={{ fontSize: 26, fontWeight: 900, color: m.color }}>{m.value}</div></Card>
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
  };

  // ── TURMAS ──
  const TurmasPage = () => {
    const [novaT, setNovaT] = useState("");
    const [turmasList, setTurmasList] = useState(() => {
      const ts = [...new Set(alunos.map(a => a.turma).filter(Boolean))].sort();
      return ts;
    });
    const [turmaExpand, setTurmaExpand] = useState(null);
    const [modalNovaT, setModalNovaT] = useState(false);

    const alunosDaTurma = (t) => alunos.filter(a => a.turma === t).sort((a, b) => a.nome.localeCompare(b.nome));
    const todasTurmas = [...new Set([...turmasList, ...alunos.map(a => a.turma).filter(Boolean)])].sort();

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>🏫 Turmas</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Visualize e gerencie os alunos por turma.</p>
          </div>
        </div>

        {/* Métricas */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Total de Turmas", value: todasTurmas.length, color: "#2563eb" },
            { label: "Total de Alunos", value: alunos.length, color: "#7c3aed" },
            { label: "Média por Turma", value: todasTurmas.length > 0 ? Math.round(alunos.length / todasTurmas.length) : 0, color: "#059669" },
            { label: "Sem Turma", value: alunos.filter(a => !a.turma).length, color: "#f59e0b" },
          ].map(m => (
            <Card key={m.label} style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: m.color }}>{m.value}</div>
            </Card>
          ))}
        </div>

        {/* Lista de turmas */}
        {todasTurmas.length === 0 ? (
          <Card>
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏫</div>
              <p style={{ fontSize: 15, fontWeight: 600 }}>Nenhuma turma cadastrada ainda</p>
              <p style={{ fontSize: 13 }}>As turmas aparecem automaticamente quando você cadastrar alunos com a turma preenchida.</p>
              <Btn onClick={() => setModalNovoAluno(true)} icon="+" style={{ marginTop: 8 }}>Cadastrar Alunos</Btn>
            </div>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {todasTurmas.map(turma => {
              const alunosT = alunosDaTurma(turma);
              const exp = turmaExpand === turma;
              const riscoAlto = alunosT.filter(a => a.risco >= 60).length;
              const riscoMedio = alunosT.filter(a => a.risco >= 30 && a.risco < 60).length;
              return (
                <Card key={turma} style={{ padding: 0, overflow: "hidden" }}>
                  <div onClick={() => setTurmaExpand(exp ? null : turma)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: "pointer", background: exp ? "#fafeff" : "#fff" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "#2563eb18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🏫</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 17, color: "#1e293b" }}>{turma}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>{alunosT.length} aluno(s)</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {riscoAlto > 0 && <Badge color="#ef4444">⚠️ {riscoAlto} risco alto</Badge>}
                      {riscoMedio > 0 && <Badge color="#f59e0b">🔶 {riscoMedio} atenção</Badge>}
                      <Badge color="#22c55e">{alunosT.filter(a => a.risco < 30).length} estáveis</Badge>
                      <span style={{ color: "#94a3b8", fontSize: 18 }}>{exp ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  {exp && (
                    <div style={{ borderTop: "1px solid #f1f5f9" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8, padding: 16 }}>
                        {alunosT.map(a => (
                          <div key={a.id} onClick={() => setAlunoSel(a)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: `1px solid ${getRiscoColor(a.risco)}20`, background: getRiscoBg(a.risco), cursor: "pointer" }}>
                            <Av initials={(a.nome || "?").split(" ").map(n => n[0]).slice(0, 2).join("")} color={getRiscoColor(a.risco)} size={36} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.nome}</div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>Resp.: {a.responsavel || "—"}</div>
                            </div>
                            <div style={{ textAlign: "center", flexShrink: 0 }}>
                              <div style={{ fontSize: 15, fontWeight: 900, color: getRiscoColor(a.risco) }}>{a.risco}</div>
                              <div style={{ fontSize: 9, color: getRiscoColor(a.risco), fontWeight: 700 }}>RISCO</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── RETENÇÃO ──
  const EquipePage = () => {
    const [equipeLocal, setEquipeLocal] = useState(equipe);
    const [modalNovo, setModalNovo] = useState(false);
    const [editando, setEditando] = useState(null);
    const [busca, setBusca] = useState("");
    const [salvando, setSalvando] = useState(null);
    const filtrados = equipeLocal.filter(u => !busca || u.nome?.toLowerCase().includes(busca.toLowerCase()) || u.perfil?.toLowerCase().includes(busca.toLowerCase()));
    const desativar = async (u) => { setSalvando(u.id); await supabase.from("profiles").update({ ativo: false }).eq("id", u.id); setEquipeLocal(p => p.map(x => x.id === u.id ? { ...x, ativo: false } : x)); setSalvando(null); };
    const ativar = async (u) => { setSalvando(u.id); await supabase.from("profiles").update({ ativo: true }).eq("id", u.id); setEquipeLocal(p => p.map(x => x.id === u.id ? { ...x, ativo: true } : x)); setSalvando(null); };
    const salvarEdicao = async (dados) => { await supabase.from("profiles").update({ nome: dados.nome, perfil: dados.perfil, cargo: dados.cargo, avatar: dados.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() }).eq("id", dados.id); setEquipeLocal(p => p.map(x => x.id === dados.id ? { ...x, ...dados } : x)); setEditando(null); };
    const criarUsuario = async (f) => { const { data: signData, error } = await supabase.auth.signUp({ email: f.email, password: f.senha, options: { data: { nome: f.nome, perfil: f.perfil } } }); if (error) return error.message; if (signData.user) { const novo = { id: signData.user.id, nome: f.nome, perfil: f.perfil, cargo: f.cargo, escola_id: escola.id, ativo: true, avatar: f.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() }; await supabase.from("profiles").upsert(novo); setEquipeLocal(p => [...p, { ...novo, email: f.email }].sort((a, b) => (a.nome||"").localeCompare(b.nome||""))); } return null; };
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>👥 Equipe</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>{equipeLocal.length} usuário(s)</p></div>
          <Btn icon="+" onClick={() => setModalNovo(true)}>Novo Usuário</Btn>
        </div>
        <div style={{ marginBottom: 16 }}><Input placeholder="🔍 Buscar por nome ou perfil..." value={busca} onChange={e => setBusca(e.target.value)} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtrados.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}><div style={{ fontSize: 32, marginBottom: 12 }}>👥</div><p>Nenhum usuário encontrado.</p></div>}
          {filtrados.map(u => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 12, border: `1.5px solid ${u.ativo === false ? "#fecaca" : "#e9d5ff"}`, background: u.ativo === false ? "#fef2f2" : "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <Av initials={u.avatar || (u.nome||"?").slice(0,2).toUpperCase()} color={u.ativo === false ? "#ef4444" : "#7c3aed"} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: u.ativo === false ? "#94a3b8" : "#1e293b" }}>{u.nome}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{perfilLabel(u.perfil)}{u.cargo ? ` · ${u.cargo}` : ""}{u.ativo === false && <span style={{ marginLeft: 8, color: "#ef4444", fontWeight: 700 }}>• Inativo</span>}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Badge color={u.perfil === "DIRECAO" ? "#7c3aed" : "#2563eb"}>{perfilLabel(u.perfil)}</Badge>
                <Btn small variant="ghost" onClick={() => setEditando(u)}>✏️ Editar</Btn>
                {u.ativo === false ? <Btn small variant="success" disabled={salvando===u.id} onClick={() => ativar(u)}>{salvando===u.id?"...":"Ativar"}</Btn> : <Btn small variant="danger" disabled={salvando===u.id} onClick={() => desativar(u)}>{salvando===u.id?"...":"Desativar"}</Btn>}
              </div>
            </div>
          ))}
        </div>
        {modalNovo && <ModalNovoUsuario escola={escola} onClose={() => setModalNovo(false)} onSave={u => setEquipeLocal(p => [...p, u].sort((a,b) => (a.nome||"").localeCompare(b.nome||"")))} />}
        {editando && (<Overlay onClose={() => setEditando(null)}><MBox width={480}><MHead title="Editar Usuário" subtitle={editando.nome} icon="✏️" onClose={() => setEditando(null)} /><MBody><Input label="Nome completo *" value={editando.nome} onChange={e => setEditando(p=>({...p,nome:e.target.value}))} /><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Sel label="Perfil" value={editando.perfil} onChange={e => setEditando(p=>({...p,perfil:e.target.value}))}>{PERFIS.map(p=><option key={p} value={p}>{perfilLabel(p)}</option>)}</Sel><Input label="Cargo (opcional)" value={editando.cargo||""} onChange={e => setEditando(p=>({...p,cargo:e.target.value}))} placeholder="Ex: Coordenadora" /></div></MBody><MFoot><Btn variant="ghost" onClick={() => setEditando(null)}>Cancelar</Btn><Btn onClick={() => salvarEdicao(editando)}>Salvar</Btn></MFoot></MBox></Overlay>)}
      </div>
    );
  };

    const RetencaoPage = () => {
    const alto = alunos.filter(a => a.risco >= 60).sort((a, b) => b.risco - a.risco);
    const medio = alunos.filter(a => a.risco >= 30 && a.risco < 60).sort((a, b) => b.risco - a.risco);
    const PainelAluno = ({ a, nivel }) => {
      const coms = comunicacoes.filter(c => c.aluno_id === a.id);
      const aus = reunioes.reduce((s, r) => s + (!r.convocados?.find(c => c.aluno_id === a.id)?.compareceu ? 1 : 0), 0);
      return (
        <div onClick={() => setAlunoSel(a)} style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${getRiscoColor(a.risco)}30`, background: getRiscoBg(a.risco), cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div><div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>{a.nome}</div><div style={{ fontSize: 12, color: "#94a3b8" }}>{a.turma} · Resp.: {a.responsavel}</div></div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 900, color: getRiscoColor(a.risco) }}>{a.risco}</div><div style={{ fontSize: 9, fontWeight: 800, color: getRiscoColor(a.risco) }}>PONTOS</div></div>
              <Badge color={getRiscoColor(a.risco)}>{nivel}</Badge>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#475569" }}>📋 {coms.length} comunicações</span>
            <span style={{ fontSize: 12, color: "#475569" }}>📨 {coms.filter(c => c.encaminhamento).length} encaminhamentos</span>
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
        {alto.length > 0 && <div><h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#ef4444" }}>⚠️ Risco Alto</h3><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{alto.map(a => <PainelAluno key={a.id} a={a} nivel="RISCO ALTO" />)}</div></div>}
        {medio.length > 0 && <div><h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#f59e0b" }}>🔶 Risco Médio</h3><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{medio.map(a => <PainelAluno key={a.id} a={a} nivel="RISCO MÉDIO" />)}</div></div>}
        {alto.length === 0 && medio.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>🎉 Nenhum aluno em risco elevado!</div>}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui,sans-serif", background: "#f8fafc" }}>
      <div style={{ width: 210, background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #f1f5f9" }}>
          {escola.logo_url ? (
            <img src={escola.logo_url} alt={escola.nome} style={{ height: 36, objectFit: "contain", maxWidth: "100%", marginBottom: 6 }} />
          ) : (
            <svg width="120" height="28" viewBox="0 0 180 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <text x="0" y="40" fontFamily="system-ui,sans-serif" fontWeight="900" fontSize="36" fill="#a855f7">NARA</text>
              <text x="93" y="40" fontFamily="system-ui,sans-serif" fontWeight="700" fontSize="26" fill="#86efac">EDU</text>
              <text x="145" y="40" fontFamily="system-ui,sans-serif" fontWeight="900" fontSize="26" fill="#a855f7">360</text>
            </svg>
          )}
          <div style={{ fontSize: 10, fontWeight: 700, color: "#a855f7", marginTop: 4, letterSpacing: 0.5 }}>💬 NARA Relacionamento</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontWeight: 600 }}>{escola.nome}</div>
          {escola.status === "SUSPENSA" && <div style={{ marginTop: 4, padding: "2px 8px", background: "#fef2f2", borderRadius: 6, fontSize: 10, color: "#ef4444", fontWeight: 700 }}>🔴 SUSPENSA</div>}
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
          <Av initials={profile.avatar || (profile.nome || "?").slice(0, 2).toUpperCase()} color="#2563eb" />
        </div>
        <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
          {pagina === "dashboard" && <DashboardPage />}
          {pagina === "alunos" && <AlunosPage />}
          {pagina === "turmas" && <TurmasPage />}
          {pagina === "comunicacoes" && <ComunicacoesPage />}
          {pagina === "encaminhamentos" && <EncaminhamentosPage />}
          {pagina === "reunioes" && <ReunioesPage />}
          {pagina === "retencao" && <RetencaoPage />}
          {pagina === "equipe" && <EquipePage />}
        </div>
      </div>
      {modalNovaCom && <ModalNovaCom onClose={() => setModalNovaCom(false)} onSave={addCom} profile={profile} alunos={alunos} equipe={equipe} motivos={motivos} escolaId={escola.id} />}
      {modalNovaReuniao && <ModalNovaReuniao onClose={() => setModalNovaReuniao(false)} onSave={addReuniao} profile={profile} alunos={alunos} escolaId={escola.id} />}
      {modalNovoAluno && <ModalNovoAluno onClose={() => setModalNovoAluno(false)} onSave={addAluno} profile={profile} escolaId={escola.id} />}
      {alunoSel && <PerfilAluno aluno={alunoSel} comunicacoes={comunicacoes} reunioes={reunioes} profile={profile} onClose={() => setAlunoSel(null)} onAlunoAtualizado={atualizarAluno} />}
    </div>
  );
}

// ── NARA HUB — Tela de seleção de módulo ───────────────────────────────────────
function NaraHub({ user, profile, escola, onEntrarModulo, onLogout, onVoltarAdmin }) {
  const modulosAtivos = escola.modulos || ["relacionamento", "relatorios", "reunioes"];
  const permissoes = escola.permissoes || PERMS_PADRAO;

  // Filtra: módulo ativo na escola E perfil do usuário tem permissão
  const modulosEscola = NARA_MODULOS.filter(m => {
    if (!modulosAtivos.includes(m.id)) return false;
    const perfsPermitidos = permissoes[m.id] || PERMS_PADRAO[m.id] || [];
    return perfsPermitidos.includes(profile.perfil);
  });

  // Módulos ativos mas sem permissão para este perfil (não mostra)
  const semPermissao = NARA_MODULOS.filter(m => {
    if (!modulosAtivos.includes(m.id)) return false;
    const perfsPermitidos = permissoes[m.id] || PERMS_PADRAO[m.id] || [];
    return !perfsPermitidos.includes(profile.perfil);
  });
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const nome = profile.nome?.split(" ")[0] || "bem-vindo";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #faf5ff 0%, #f0fdf4 100%)", fontFamily: "system-ui,sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Topbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e9d5ff", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <svg width="150" height="38" viewBox="0 0 180 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <text x="0" y="40" fontFamily="system-ui,sans-serif" fontWeight="900" fontSize="36" fill="#a855f7">NARA</text>
          <text x="93" y="40" fontFamily="system-ui,sans-serif" fontWeight="700" fontSize="26" fill="#86efac">EDU</text>
          <text x="145" y="40" fontFamily="system-ui,sans-serif" fontWeight="900" fontSize="26" fill="#a855f7">360</text>
        </svg>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {escola.logo_url && <img src={escola.logo_url} alt={escola.nome} style={{ height: 32, objectFit: "contain" }} />}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{profile.nome}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{perfilLabel(profile.perfil)} · {escola.nome}</div>
          </div>
          <Av initials={profile.avatar || (profile.nome || "?").slice(0, 2).toUpperCase()} color="#7c3aed" />
          {onVoltarAdmin && <Btn small variant="ghost" onClick={onVoltarAdmin} style={{ color: "#7c3aed" }}>← Admin</Btn>}
          <Btn small variant="ghost" onClick={onLogout}>Sair</Btn>
        </div>
      </div>

      {/* Conteúdo central */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
          <h1 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 900, color: "#1e293b" }}>{saudacao}, {nome}!</h1>
          <p style={{ margin: 0, fontSize: 15, color: "#64748b" }}>Escolha o módulo que deseja acessar hoje</p>
        </div>

        {/* Módulos agrupados por categoria */}
        <div style={{ width: "100%", maxWidth: 980, display: "flex", flexDirection: "column", gap: 32 }}>
          {CATEGORIAS_ORDEM.map(cat => {
            const dosCat = modulosEscola.filter(m => m.categoria === cat);
            const emBreveCat = NARA_MODULOS.filter(m => m.categoria === cat && !modulosAtivos.includes(m.id));
            if (dosCat.length === 0 && emBreveCat.length === 0) return null;
            return (
              <div key={cat}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#a855f7", letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>
                  {cat}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                  {/* Módulos com acesso */}
                  {dosCat.map(m => (
                    <div key={m.id} onClick={() => m.disponivel && onEntrarModulo(m.id)}
                      style={{ background: "#fff", borderRadius: 18, padding: 24, border: `2px solid ${m.cor}30`, boxShadow: "0 4px 20px rgba(0,0,0,.06)", cursor: m.disponivel ? "pointer" : "default", transition: "all .2s", position: "relative", overflow: "hidden" }}
                      onMouseEnter={e => { if (m.disponivel) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 12px 32px ${m.cor}25`; e.currentTarget.style.borderColor = m.cor; }}}
                      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.06)"; e.currentTarget.style.borderColor = `${m.cor}30`; }}>
                      <div style={{ position: "absolute", top: -16, right: -16, width: 80, height: 80, borderRadius: "50%", background: m.cor + "12" }} />
                      <div style={{ fontSize: 36, marginBottom: 12 }}>{m.emoji}</div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b", marginBottom: 4 }}>{m.nome}</div>
                      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 14 }}>{m.desc}</div>
                      {m.disponivel
                        ? <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: m.cor, color: "#fff", fontSize: 12, fontWeight: 700 }}>Acessar →</div>
                        : <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: m.cor + "15", color: m.cor, fontSize: 12, fontWeight: 700 }}>🚧 Em breve</div>
                      }
                    </div>
                  ))}
                  {/* Módulos sem permissão ou sem contrato (em breve) */}
                  {emBreveCat.map(m => (
                    <div key={m.id} style={{ background: "#fafafa", borderRadius: 18, padding: 24, border: "2px dashed #e2e8f0", opacity: 0.55, position: "relative" }}>
                      <div style={{ position: "absolute", top: 10, right: 10, fontSize: 10, fontWeight: 700, color: "#94a3b8", background: "#f1f5f9", padding: "2px 8px", borderRadius: 20 }}>NÃO CONTRATADO</div>
                      <div style={{ fontSize: 36, marginBottom: 12, filter: "grayscale(1)" }}>{m.emoji}</div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#94a3b8", marginBottom: 4 }}>{m.nome}</div>
                      <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p style={{ textAlign: "center", paddingBottom: 20, fontSize: 11, color: "#c4b5fd" }}>© Hub de Relacionamento Escolar</p>
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
      if (event === "SIGNED_OUT") { setUser(null); setProfile(null); setEscolaAtiva(null); setModuloAtivo(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setEscolaAtiva(null); setModuloAtivo(null);
  };

  if (iniciando) return <Loading msg="Verificando sessão..." />;
  if (!user || !profile) return <LoginPage onLogin={(u, p) => { setUser(u); setProfile(p); if (p?.perfil !== "SUPER_ADMIN" && p?.escolas) setEscolaAtiva(p.escolas); }} />;
  if (profile.perfil === "SUPER_ADMIN" && !escolaAtiva) return <SuperAdminPanel onLogout={handleLogout} onEntrarEscola={setEscolaAtiva} />;

  const escola = escolaAtiva || profile.escolas;
  const voltarAdmin = profile.perfil === "SUPER_ADMIN" ? () => { setEscolaAtiva(null); setModuloAtivo(null); } : null;

  return (
    <SchoolApp
      user={user}
      profile={profile}
      escola={escola}
      onLogout={handleLogout}
      onVoltarAdmin={voltarAdmin}
    />
  );
}