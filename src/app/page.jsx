"use client";
import { useState, useRef, useEffect } from "react";

// ── DADOS ──────────────────────────────────────────────────────────────────────
const ESCOLAS = [
  { id: 1, nome: "UNICA Master", cidade: "Campina Grande - PB", alunos: 825, status: "ATIVA", plano: "PRO" },
  { id: 2, nome: "Colégio São Lucas", cidade: "João Pessoa - PB", alunos: 540, status: "ATIVA", plano: "BÁSICO" },
  { id: 3, nome: "Escola Nova Era", cidade: "Recife - PE", alunos: 310, status: "TRIAL", plano: "TRIAL" },
];

const USUARIOS_BASE = [
  { id: 1, nome: "Super Admin", email: "admin@hub.com.br", senha: "admin123", perfil: "SUPER_ADMIN", escolaId: null, avatar: "SA" },
  { id: 2, nome: "Diretor Admin", email: "diretor@unica.edu.br", senha: "123", perfil: "DIRECAO", escolaId: 1, setor: "Direção", avatar: "DA" },
  { id: 3, nome: "Maria Luiza", email: "maria@unica.edu.br", senha: "123", perfil: "PSICOLOGO", escolaId: 1, setor: "Psicólogo", avatar: "ML" },
  { id: 4, nome: "Hilária Costa", email: "hilaria@unica.edu.br", senha: "123", perfil: "SECRETARIA", escolaId: 1, setor: "Secretária", avatar: "HC" },
  { id: 5, nome: "João Professor", email: "joao@unica.edu.br", senha: "123", perfil: "PROFESSOR", escolaId: 1, setor: "Professor", avatar: "JP" },
  { id: 6, nome: "Danni Silva", email: "danni@unica.edu.br", senha: "123", perfil: "NUCLEO", escolaId: 1, setor: "Núcleo Pedagógico", avatar: "DS" },
];

const ALUNOS_BASE = [
  { id: 1, escolaId: 1, nome: "Mirella de Souza Holanda Rocha", turma: "3º A", rm: "2024001", risco: 10, responsavel: "Ana Rocha", telefone: "(83) 99123-4567" },
  { id: 2, escolaId: 1, nome: "Ana Allyce da Silva", turma: "2º B", rm: "2024002", risco: 22, responsavel: "Carlos Silva", telefone: "(83) 99234-5678" },
  { id: 3, escolaId: 1, nome: "Davi Macedo Fernandes", turma: "1º C", rm: "2024003", risco: 48, responsavel: "Lúcia Fernandes", telefone: "(83) 99345-6789" },
  { id: 4, escolaId: 1, nome: "Heitor Luis Dantas de Medeiros", turma: "3º A", rm: "2024004", risco: 8, responsavel: "Roberto Medeiros", telefone: "(83) 99456-7890" },
  { id: 5, escolaId: 1, nome: "Isadora Soares Barros da Silva", turma: "2º A", rm: "2024005", risco: 5, responsavel: "Fernanda Barros", telefone: "(83) 99567-8901" },
  { id: 6, escolaId: 1, nome: "Elisa Xavier Dias Viana", turma: "1º B", rm: "2024006", risco: 65, responsavel: "Marcos Viana", telefone: "(83) 99678-9012" },
  { id: 7, escolaId: 1, nome: "Laura Cecilia de Medeiros Dantas", turma: "3º B", rm: "2024007", risco: 72, responsavel: "Joana Dantas", telefone: "(83) 99789-0123" },
  { id: 8, escolaId: 1, nome: "Maria Luiza Almeida de Castro", turma: "2º C", rm: "2024008", risco: 30, responsavel: "Paulo Castro", telefone: "(83) 99890-1234" },
  { id: 9, escolaId: 1, nome: "Isabella Meneses Araujo Almeida", turma: "1º A", rm: "2024009", risco: 18, responsavel: "Beatriz Almeida", telefone: "(83) 99901-2345" },
  { id: 10, escolaId: 1, nome: "Raul Felix Borges Lopes Filho", turma: "3º C", rm: "2024010", risco: 58, responsavel: "Edson Lopes", telefone: "(83) 99012-3456" },
  { id: 11, escolaId: 1, nome: "Pedro Henrique Lima", turma: "1º C", rm: "2024011", risco: 82, responsavel: "Sandra Lima", telefone: "(83) 98123-4567" },
  { id: 12, escolaId: 1, nome: "Beatriz Santos Ferreira", turma: "2º A", rm: "2024012", risco: 5, responsavel: "Ricardo Ferreira", telefone: "(83) 98234-5678" },
];

const COMUNICACOES_BASE = [
  { id: 1, escolaId: 1, data: "30/03/2026", alunoId: 7, titulo: "INGLES", detalhes: "Aluna com dificuldade severa em inglês. Não acompanha o ritmo da turma.", urgencia: "ALTA", autorId: 4, encaminhamento: true, encDestino: "Psicólogo", encResponsavel: "Maria Luiza", encStatus: "PENDENTE", status: "PENDENTE", comQuem: "Aluno" },
  { id: 2, escolaId: 1, data: "30/03/2026", alunoId: 1, titulo: "Escuta psicológica individual", detalhes: "Aluna demonstrou sinais de ansiedade durante a aula.", urgencia: null, autorId: 3, encaminhamento: false, status: "PENDENTE", comQuem: "Aluno" },
  { id: 3, escolaId: 1, data: "30/03/2026", alunoId: 2, titulo: "Escuta Psicológica Individual", detalhes: "Conversa de rotina com a aluna.", urgencia: null, autorId: 3, encaminhamento: false, status: "PENDENTE", comQuem: "Responsável" },
  { id: 4, escolaId: 1, data: "30/03/2026", alunoId: 3, titulo: "RETENÇÃO", detalhes: "Aluno com alto índice de faltas — 38% de ausência no bimestre.", urgencia: "ALTA", autorId: 4, encaminhamento: true, encDestino: "Núcleo Pedagógico", encResponsavel: "Danni Silva", encStatus: "EM_ANALISE", status: "EM_ANALISE", comQuem: "Responsável", resolucao: "Reunião agendada para dia 05/04." },
  { id: 5, escolaId: 1, data: "27/03/2026", alunoId: 10, titulo: "RETENÇÃO NEGATIVA", detalhes: "Responsável não respondeu ao contato. Terceira tentativa.", urgencia: "MEDIA", autorId: 5, encaminhamento: true, encDestino: "Secretária", encResponsavel: "Hilária Costa", encStatus: "PENDENTE", status: "PENDENTE", comQuem: "Responsável" },
  { id: 6, escolaId: 1, data: "25/03/2026", alunoId: 11, titulo: "Agressividade", detalhes: "Aluno envolvido em conflito físico com colega no intervalo.", urgencia: "ALTA", autorId: 3, encaminhamento: true, encDestino: "Psicólogo", encResponsavel: "Maria Luiza", encStatus: "RESOLVIDO", status: "RESOLVIDO", comQuem: "Aluno", resolucao: "Sessão realizada. Mediação com as famílias concluída." },
  { id: 7, escolaId: 1, data: "20/03/2026", alunoId: 6, titulo: "Aluno não quer vir à escola", detalhes: "Mãe relatou que aluna está recusando ir à escola há 2 semanas.", urgencia: "ALTA", autorId: 4, encaminhamento: true, encDestino: "Psicólogo", encResponsavel: "Maria Luiza", encStatus: "EM_ANALISE", status: "EM_ANALISE", comQuem: "Responsável", resolucao: "Aguardando avaliação psicológica." },
  { id: 8, escolaId: 1, data: "18/03/2026", alunoId: 8, titulo: "Dificuldade de aprendizagem", detalhes: "Professor reportou dificuldades em matemática.", urgencia: "BAIXA", autorId: 5, encaminhamento: false, status: "PENDENTE", comQuem: "Professor" },
  { id: 9, escolaId: 1, data: "15/03/2026", alunoId: 9, titulo: "Retenção", detalhes: "Frequência abaixo do mínimo exigido.", urgencia: "MEDIA", autorId: 6, encaminhamento: true, encDestino: "Secretária", encResponsavel: "Hilária Costa", encStatus: "RESOLVIDO", status: "RESOLVIDO", comQuem: "Responsável", resolucao: "Família notificada formalmente. Assinatura de termo realizada." },
];

const REUNIOES_BASE = [
  { id: 1, escolaId: 1, data: "28/03/2026", tipo: "Reunião Pedagógica", titulo: "Conselho de Classe — 3º Bimestre", descricao: "Análise de desempenho geral e casos prioritários.", convocados: [{ alunoId: 6, responsavel: "Marcos Viana", compareceu: false }, { alunoId: 7, responsavel: "Joana Dantas", compareceu: true }, { alunoId: 10, responsavel: "Edson Lopes", compareceu: false }, { alunoId: 11, responsavel: "Sandra Lima", compareceu: false }], ata: "Discutido plano de ação para alunos em risco. Próxima reunião em abril.", proximaAcao: "Contato individual com famílias ausentes.", autorId: 2 },
  { id: 2, escolaId: 1, data: "10/03/2026", tipo: "Reunião Individual", titulo: "Acompanhamento — Elisa Viana", descricao: "Reunião para tratar recusa escolar da aluna.", convocados: [{ alunoId: 6, responsavel: "Marcos Viana", compareceu: true }], ata: "Família ciente. Acordado acompanhamento psicológico.", autorId: 3 },
  { id: 3, escolaId: 1, data: "01/03/2026", tipo: "Reunião de Pais", titulo: "Reunião Geral de Pais — 1º Bimestre", descricao: "Apresentação do plano pedagógico.", convocados: [{ alunoId: 1, responsavel: "Ana Rocha", compareceu: true }, { alunoId: 2, responsavel: "Carlos Silva", compareceu: false }, { alunoId: 3, responsavel: "Lúcia Fernandes", compareceu: false }, { alunoId: 4, responsavel: "Roberto Medeiros", compareceu: true }, { alunoId: 5, responsavel: "Fernanda Barros", compareceu: true }, { alunoId: 6, responsavel: "Marcos Viana", compareceu: false }, { alunoId: 7, responsavel: "Joana Dantas", compareceu: true }, { alunoId: 8, responsavel: "Paulo Castro", compareceu: true }, { alunoId: 9, responsavel: "Beatriz Almeida", compareceu: false }, { alunoId: 10, responsavel: "Edson Lopes", compareceu: false }, { alunoId: 11, responsavel: "Sandra Lima", compareceu: false }, { alunoId: 12, responsavel: "Ricardo Ferreira", compareceu: true }], ata: "Apresentação realizada. Boa recepção dos presentes.", autorId: 2 },
];

const SETORES = ["Psicólogo", "Psicopedagogo", "Secretária", "Professor", "Recepção", "Núcleo Pedagógico", "Direção"];

// ── HELPERS ────────────────────────────────────────────────────────────────────
const getRiscoColor = (r) => r >= 60 ? "#ef4444" : r >= 30 ? "#f59e0b" : "#22c55e";
const getRiscoBg = (r) => r >= 60 ? "#fef2f2" : r >= 30 ? "#fffbeb" : "#f0fdf4";
const getRiscoNivel = (r) => r >= 60 ? "ALTO" : r >= 30 ? "MÉDIO" : "BAIXO";
const getUrgColor = (u) => u === "ALTA" ? "#ef4444" : u === "MEDIA" ? "#f59e0b" : u === "BAIXA" ? "#22c55e" : "#94a3b8";
const getStColor = (s) => s === "RESOLVIDO" ? "#22c55e" : s === "EM_ANALISE" ? "#3b82f6" : "#f59e0b";
const getStLabel = (s) => s === "EM_ANALISE" ? "EM ANÁLISE" : s;
const fmtDate = () => new Date().toLocaleDateString("pt-BR");
const canSee = (user, item) => {
  if (!user) return false;
  if (user.perfil === "SUPER_ADMIN" || user.perfil === "DIRECAO") return true;
  return item.autorId === user.id || item.encResponsavel === user.nome;
};
const perfilLabel = (p) => ({ SUPER_ADMIN: "Super Admin", DIRECAO: "Direção", PSICOLOGO: "Psicólogo", SECRETARIA: "Secretária", PROFESSOR: "Professor", NUCLEO: "Núcleo Pedagógico" }[p] || p);

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

const Av = ({ initials, color = "#2563eb", size = 36 }) => (
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

// ── CAMPO RELATO COM MICROFONE + IA ────────────────────────────────────────────
function CampoRelato({ value, onChange }) {
  const [gravando, setGravando] = useState(false);
  const [transcricao, setTranscricao] = useState("");
  const [resumindo, setResumindo] = useState(false);
  const [resumo, setResumo] = useState("");
  const recRef = useRef(null);
  const suportado = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const iniciarGravacao = () => {
    if (!suportado) { alert("Seu navegador não suporta reconhecimento de voz. Use o Google Chrome."); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    let finalText = value || "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
      }
      setTranscricao(interim);
      onChange(finalText + interim);
    };
    rec.onend = () => { setGravando(false); setTranscricao(""); };
    rec.start();
    recRef.current = rec;
    setGravando(true);
    setResumo("");
  };

  const pararGravacao = () => { recRef.current?.stop(); setGravando(false); setTranscricao(""); };

  const resumirComIA = async () => {
    if (!value?.trim()) return;
    setResumindo(true);
    setResumo("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "Você é um assistente escolar. Sua tarefa é resumir transcrições de conversas ou relatos sobre alunos de forma clara, objetiva e estruturada. Escreva em português brasileiro. Seja direto e use no máximo 4 frases. Não use bullet points. Foque no problema central e na situação do aluno.",
          messages: [{ role: "user", content: `Resuma este relato sobre um aluno:\n\n${value}` }]
        })
      });
      const data = await res.json();
      const texto = data.content?.[0]?.text || "Não foi possível gerar o resumo.";
      setResumo(texto);
    } catch {
      setResumo("Erro ao conectar com a IA. Tente novamente.");
    }
    setResumindo(false);
  };

  const usarResumo = () => { onChange(resumo); setResumo(""); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Relato *</label>

      {/* Área de texto principal */}
      <div style={{ position: "relative" }}>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={gravando ? "🔴 Gravando... fale agora." : "Descreva o que foi conversado ou clique no microfone para gravar."}
          rows={gravando ? 5 : 4}
          style={{
            width: "100%", padding: "12px 50px 12px 14px", border: `1.5px solid ${gravando ? "#ef4444" : "#e2e8f0"}`,
            borderRadius: 8, fontSize: gravando ? 17 : 14, lineHeight: 1.6, outline: "none",
            background: gravando ? "#fff5f5" : "#fafafa", color: "#1e293b", fontFamily: "inherit",
            resize: "vertical", boxSizing: "border-box", transition: "all .2s"
          }}
        />
        {/* Botão microfone */}
        <button
          type="button"
          onClick={gravando ? pararGravacao : iniciarGravacao}
          title={gravando ? "Parar gravação" : "Iniciar gravação de voz"}
          style={{
            position: "absolute", right: 10, top: 10, width: 32, height: 32,
            borderRadius: "50%", border: "none", cursor: "pointer",
            background: gravando ? "#ef4444" : "#2563eb",
            color: "#fff", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: gravando ? "0 0 0 4px rgba(239,68,68,.2)" : "none",
            animation: gravando ? "pulse 1.5s infinite" : "none"
          }}>
          {gravando ? "⏹" : "🎤"}
        </button>
      </div>

      {/* Indicador de gravação em tempo real */}
      {gravando && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />
          <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>Gravando em tempo real</span>
          {transcricao && <span style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>"{transcricao}"</span>}
          <Btn small variant="danger" onClick={pararGravacao} style={{ marginLeft: "auto" }}>⏹ Parar</Btn>
        </div>
      )}

      {/* Botão resumir */}
      {!gravando && value?.trim().length > 40 && !resumo && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Btn small variant="secondary" onClick={resumirComIA} disabled={resumindo} icon="✨">
            {resumindo ? "Resumindo com IA..." : "Resumir com IA"}
          </Btn>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Gera um resumo limpo do que foi relatado</span>
        </div>
      )}

      {/* Resumo gerado */}
      {resumo && (
        <div style={{ padding: "14px 16px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            ✨ Resumo gerado pela IA
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#1e293b", lineHeight: 1.6 }}>{resumo}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small onClick={usarResumo} icon="✓">Usar este resumo</Btn>
            <Btn small variant="ghost" onClick={() => setResumo("")}>Manter original</Btn>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  );
}

// ── MODAL NOVA COMUNICAÇÃO ─────────────────────────────────────────────────────
function ModalNovaCom({ onClose, onSave, usuario, alunos }) {
  const [f, setF] = useState({ alunoId: "", titulo: "", detalhes: "", urgencia: "", comQuem: "", encaminhar: false, encDestino: "", encResponsavel: "", encObs: "" });
  const [err, setErr] = useState({});
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const validate = () => {
    const e = {};
    if (!f.alunoId) e.alunoId = "Obrigatório";
    if (!f.titulo.trim()) e.titulo = "Obrigatório";
    if (!f.detalhes.trim()) e.detalhes = "Descreva ou grave o relato";
    if (!f.comQuem) e.comQuem = "Obrigatório";
    if (f.encaminhar && !f.encDestino) e.encDestino = "Obrigatório";
    if (f.encaminhar && !f.encResponsavel) e.encResponsavel = "Obrigatório";
    setErr(e); return Object.keys(e).length === 0;
  };
  const handle = () => {
    if (!validate()) return;
    onSave({ id: Date.now(), escolaId: usuario.escolaId, data: fmtDate(), alunoId: Number(f.alunoId), titulo: f.titulo, detalhes: f.detalhes, urgencia: f.urgencia || null, autorId: usuario.id, encaminhamento: f.encaminhar, encDestino: f.encaminhar ? f.encDestino : null, encResponsavel: f.encaminhar ? f.encResponsavel : null, encObs: f.encObs, encStatus: f.encaminhar ? "PENDENTE" : null, status: "PENDENTE", comQuem: f.comQuem });
    onClose();
  };
  const usersEsc = USUARIOS_BASE.filter(u => u.escolaId === usuario.escolaId && u.id !== usuario.id);
  return (
    <Overlay onClose={onClose}>
      <MBox>
        <MHead title="Nova Comunicação" subtitle="Registre uma nova interação com família ou aluno." icon="📨" onClose={onClose} />
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
                  <Sel label="Responsável *" error={err.encResponsavel} value={f.encResponsavel} onChange={e => upd("encResponsavel", e.target.value)}>
                    <option value="">Selecione...</option>
                    {usersEsc.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
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
          <Btn icon="📨" onClick={handle}>Registrar Comunicação</Btn>
        </MFoot>
      </MBox>
    </Overlay>
  );
}

// ── MODAL NOVA REUNIÃO ──────────────────────────────────────────────────────────
function ModalNovaReuniao({ onClose, onSave, usuario, alunos }) {
  const [f, setF] = useState({ titulo: "", tipo: "Reunião de Pais", data: "", descricao: "", ata: "", proximaAcao: "" });
  const [convocados, setConvocados] = useState([]);
  const [err, setErr] = useState({});
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggleAluno = (a) => setConvocados(p => p.find(c => c.alunoId === a.id) ? p.filter(c => c.alunoId !== a.id) : [...p, { alunoId: a.id, responsavel: a.responsavel, compareceu: false }]);
  const toggleP = (id) => setConvocados(p => p.map(c => c.alunoId === id ? { ...c, compareceu: !c.compareceu } : c));
  const handle = () => {
    const e = {};
    if (!f.titulo.trim()) e.titulo = "Obrigatório";
    if (!f.data) e.data = "Obrigatório";
    setErr(e);
    if (Object.keys(e).length) return;
    onSave({ id: Date.now(), escolaId: usuario.escolaId, data: new Date(f.data).toLocaleDateString("pt-BR"), ...f, convocados, autorId: usuario.id });
    onClose();
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
          <Btn icon="📅" onClick={handle}>Registrar Reunião</Btn>
        </MFoot>
      </MBox>
    </Overlay>
  );
}

// ── MODAL RESOLUÇÃO ────────────────────────────────────────────────────────────
function ModalResolucao({ item, onClose, onResolve, alunos }) {
  const [status, setStatus] = useState("EM_ANALISE");
  const [resolucao, setResolucao] = useState(item.resolucao || "");
  const [err, setErr] = useState("");
  const aluno = alunos.find(a => a.id === item.alunoId);
  const handle = () => {
    if (!resolucao.trim()) { setErr("Justificativa obrigatória."); return; }
    onResolve(item.id, status, resolucao); onClose();
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
          <Btn onClick={handle}>Salvar</Btn>
        </MFoot>
      </MBox>
    </Overlay>
  );
}

// ── PERFIL DO ALUNO ────────────────────────────────────────────────────────────
function PerfilAluno({ aluno, comunicacoes, reunioes, onClose, usuario }) {
  const [tab, setTab] = useState("timeline");
  const coms = comunicacoes.filter(c => c.alunoId === aluno.id && canSee(usuario, c));
  const reunioesA = reunioes.filter(r => r.convocados.some(c => c.alunoId === aluno.id));
  const totalP = reunioesA.reduce((s, r) => s + (r.convocados.find(c => c.alunoId === aluno.id)?.compareceu ? 1 : 0), 0);
  const timeline = [...coms.map(c => ({ tipo: "com", data: c.data, item: c })), ...reunioesA.map(r => ({ tipo: "reu", data: r.data, item: r }))]
    .sort((a, b) => b.data.split("/").reverse().join("").localeCompare(a.data.split("/").reverse().join("")));
  return (
    <Overlay onClose={onClose}>
      <MBox width={720}>
        <MHead title={aluno.nome} subtitle={`${aluno.turma} · RM: ${aluno.rm}`} onClose={onClose} />
        <MBody>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {[
              { label: "Nível de Risco", value: getRiscoNivel(aluno.risco), color: getRiscoColor(aluno.risco) },
              { label: "Score", value: `${aluno.risco} pts`, color: getRiscoColor(aluno.risco) },
              { label: "Comunicações", value: coms.length, color: "#2563eb" },
              { label: "Presença Familiar", value: `${totalP}/${reunioesA.length}`, color: totalP < reunioesA.length / 2 ? "#ef4444" : "#22c55e" },
            ].map(m => (
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
                    {t.tipo === "reu" && (() => { const p = t.item.convocados.find(c => c.alunoId === aluno.id); return <div style={{ fontSize: 12, marginTop: 4, color: p?.compareceu ? "#16a34a" : "#ef4444", fontWeight: 700 }}>{p?.compareceu ? "✓ Responsável compareceu" : "✗ Responsável não compareceu"}</div>; })()}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "reunioes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reunioesA.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>Nenhuma reunião registrada.</div>}
              {reunioesA.map(r => {
                const p = r.convocados.find(c => c.alunoId === aluno.id);
                return (
                  <div key={r.id} style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid #f1f5f9", background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{r.titulo}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{r.data} · {r.tipo}</div>
                      </div>
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
                    <div style={{ display: "flex", gap: 6 }}>
                      {c.urgencia && <Badge color={getUrgColor(c.urgencia)}>{c.urgencia}</Badge>}
                      <Badge color={getStColor(c.encStatus || "PENDENTE")}>{getStLabel(c.encStatus || "PENDENTE")}</Badge>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{c.data} · {c.encDestino} → {c.encResponsavel}</div>
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

// ── MODAL DETALHE USUÁRIO (DIRETOR) ───────────────────────────────────────────
function ModalDetalheUsuario({ usuario: u, comunicacoes, alunos, onClose }) {
  const coms = comunicacoes.filter(c => c.autorId === u.id);
  const encsEnviados = coms.filter(c => c.encaminhamento);
  const encsRecebidos = comunicacoes.filter(c => c.encResponsavel === u.nome);
  const encsResolvidos = encsRecebidos.filter(c => c.encStatus === "RESOLVIDO");
  const alunosAtendidos = [...new Set(coms.map(c => c.alunoId))].length;
  const assuntos = coms.reduce((acc, c) => { acc[c.titulo] = (acc[c.titulo] || 0) + 1; return acc; }, {});
  const topAssuntos = Object.entries(assuntos).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <Overlay onClose={onClose}>
      <MBox width={580}>
        <MHead title={u.nome} subtitle={perfilLabel(u.perfil)} onClose={onClose} />
        <MBody>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
            {[
              { label: "Comunicações criadas", value: coms.length, color: "#2563eb" },
              { label: "Alunos atendidos", value: alunosAtendidos, color: "#7c3aed" },
              { label: "Encaminhamentos enviados", value: encsEnviados.length, color: "#f59e0b" },
              { label: "Recebidos / Resolvidos", value: `${encsRecebidos.length} / ${encsResolvidos.length}`, color: "#22c55e" },
            ].map(m => (
              <div key={m.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
          {topAssuntos.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10 }}>ASSUNTOS MAIS REGISTRADOS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {topAssuntos.map(([titulo, qtd]) => (
                  <div key={titulo} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f8fafc", borderRadius: 8 }}>
                    <div style={{ flex: 1, fontSize: 13, color: "#1e293b", fontWeight: 600 }}>{titulo}</div>
                    <Badge color="#2563eb">{qtd}x</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10 }}>ÚLTIMAS COMUNICAÇÕES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {coms.slice(0, 5).map(c => {
                const aluno = alunos.find(a => a.id === c.alunoId);
                return (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: 8, gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{c.titulo}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{aluno?.nome} · {c.data}</div>
                    </div>
                    <Badge color={getStColor(c.status)}>{getStLabel(c.status)}</Badge>
                  </div>
                );
              })}
              {coms.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 20, fontSize: 13 }}>Nenhuma comunicação registrada.</div>}
            </div>
          </div>
        </MBody>
      </MBox>
    </Overlay>
  );
}

// ── BLOCO DESEMPENHO POR USUÁRIO ───────────────────────────────────────────────
function BlocoUsuarios({ comunicacoes, alunos, escolaId }) {
  const [selecionado, setSelecionado] = useState(null);
  const usuarios = USUARIOS_BASE.filter(u => u.escolaId === escolaId && u.perfil !== "DIRECAO");
  const cores = ["#2563eb", "#7c3aed", "#059669", "#f59e0b", "#ef4444"];
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>👥 Desempenho por Usuário</h3>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>Visão individual de cada profissional da equipe</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {usuarios.map((u, i) => {
          const coms = comunicacoes.filter(c => c.autorId === u.id);
          const encsEnv = coms.filter(c => c.encaminhamento).length;
          const encsRec = comunicacoes.filter(c => c.encResponsavel === u.nome);
          const resolvidos = encsRec.filter(c => c.encStatus === "RESOLVIDO").length;
          const alunosAtend = new Set(coms.map(c => c.alunoId)).size;
          const cor = cores[i % cores.length];
          return (
            <div key={u.id} onClick={() => setSelecionado(u)} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #f1f5f9", cursor: "pointer", transition: "box-shadow .15s" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.1)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Av initials={u.avatar} color={cor} size={40} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{u.nome}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{perfilLabel(u.perfil)}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Comunicações", value: coms.length, color: cor },
                  { label: "Alunos", value: alunosAtend, color: cor },
                  { label: "Enc. enviados", value: encsEnv, color: "#f59e0b" },
                  { label: "Resolvidos", value: resolvidos, color: "#22c55e" },
                ].map(m => (
                  <div key={m.label} style={{ textAlign: "center", padding: "6px 4px", background: "#f8fafc", borderRadius: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>{m.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, textAlign: "center", fontSize: 11, color: cor, fontWeight: 700 }}>Ver detalhes →</div>
            </div>
          );
        })}
      </div>
      {selecionado && <ModalDetalheUsuario usuario={selecionado} comunicacoes={comunicacoes} alunos={alunos} onClose={() => setSelecionado(null)} />}
    </div>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────────
function Dashboard({ alunos, comunicacoes, reunioes, usuario, onNovaCom, onVerAluno }) {
  const alto = alunos.filter(a => a.risco >= 60);
  const medio = alunos.filter(a => a.risco >= 30 && a.risco < 60);
  const baixo = alunos.filter(a => a.risco < 30);
  const pendentes = comunicacoes.filter(c => c.encaminhamento && c.encStatus === "PENDENTE");
  const total = alunos.length;
  const r = 58, cx = 80, cy = 80, sw = 16, circ = 2 * Math.PI * r;
  const segs = [{ n: baixo.length, color: "#22c55e", label: "Estáveis" }, { n: medio.length, color: "#f59e0b", label: "Atenção" }, { n: alto.length, color: "#ef4444", label: "Risco Alto" }];
  let off = 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>Dashboard Estratégico</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Visão 360° de risco, engajamento e ações preventivas.</p>
        </div>
        <Btn icon="+" onClick={onNovaCom}>Nova Comunicação</Btn>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "Total de Alunos", value: total, icon: "👨‍🎓", color: "#2563eb" },
          { label: "Encaminhamentos Pendentes", value: pendentes.length, icon: "📨", color: "#f59e0b" },
          { label: "Em Risco Alto", value: alto.length, icon: "⚠️", color: "#ef4444" },
          { label: "Comunicações (30d)", value: comunicacoes.length, icon: "💬", color: "#7c3aed" },
        ].map(m => (
          <Card key={m.label} style={{ flex: 1, minWidth: 160 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{m.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: m.color }}>{m.value}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>📊 Radar de Risco</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <svg width={160} height={160} viewBox="0 0 160 160">
              {segs.map((s, i) => {
                const v = total > 0 ? (s.n / total) * circ : 0;
                const o = off; off += v;
                return s.n > 0 ? <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={sw} strokeDasharray={`${v} ${circ - v}`} strokeDashoffset={-o + circ / 4} /> : null;
              })}
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize={20} fontWeight="900" fill="#1e293b">{total}</text>
              <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">alunos</text>
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {segs.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                  <span style={{ fontSize: 13, color: "#64748b" }}>{s.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 900, color: "#1e293b" }}>{s.n}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>⚠️ Alunos em Risco Alto</h3>
          {alto.length === 0 ? <div style={{ color: "#94a3b8", textAlign: "center", padding: 24, fontSize: 14 }}>🎉 Nenhum aluno em risco alto!</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alto.slice(0, 5).map(a => (
                <div key={a.id} onClick={() => onVerAluno(a)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, border: "1px solid #fef2f2", background: "#fff5f5", cursor: "pointer" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{a.nome}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{a.turma}</div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 16, color: "#ef4444" }}>{a.risco}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>📋 Encaminhamentos Pendentes</h3>
          {pendentes.length === 0 ? <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: 20 }}>Nenhum pendente</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendentes.slice(0, 4).map(c => {
                const aluno = alunos.find(a => a.id === c.alunoId);
                return (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fef3c7" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{c.titulo}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{aluno?.nome} → {c.encDestino}</div>
                    </div>
                    {c.urgencia && <Badge color={getUrgColor(c.urgencia)}>{c.urgencia}</Badge>}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>💬 Últimas Comunicações</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {comunicacoes.slice(0, 5).map(c => {
              const aluno = alunos.find(a => a.id === c.alunoId);
              return (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{c.titulo}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{aluno?.nome} · {c.data}</div>
                  </div>
                  <Badge color={getStColor(c.status)}>{getStLabel(c.status)}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      {/* Bloco exclusivo do diretor */}
      {usuario.perfil === "DIRECAO" && (
        <Card>
          <BlocoUsuarios comunicacoes={comunicacoes} alunos={alunos} escolaId={usuario.escolaId} />
        </Card>
      )}
    </div>
  );
}

// ── COMUNICAÇÕES ───────────────────────────────────────────────────────────────
function Comunicacoes({ comunicacoes, alunos, usuario, onNova, onResolve }) {
  const [busca, setBusca] = useState("");
  const [resolving, setResolving] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const visiveis = comunicacoes.filter(c => canSee(usuario, c) && (!busca || alunos.find(a => a.id === c.alunoId)?.nome.toLowerCase().includes(busca.toLowerCase()) || c.titulo.toLowerCase().includes(busca.toLowerCase())));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>💬 Comunicações</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Gerencie os registros de interação da instituição.</p>
        </div>
        <Btn icon="+" onClick={onNova}>Nova Comunicação</Btn>
      </div>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ margin: 0, fontWeight: 700, color: "#1e293b" }}>Histórico de Registros</h3>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar por aluno ou assunto..." style={{ padding: "8px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", width: 260 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visiveis.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>Nenhum registro encontrado.</div>}
          {visiveis.map(c => {
            const aluno = alunos.find(a => a.id === c.alunoId);
            const exp = expandido === c.id;
            return (
              <div key={c.id} style={{ border: "1px solid #f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                <div onClick={() => setExpandido(exp ? null : c.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fafafa", cursor: "pointer", flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", minWidth: 90 }}>{c.data}</div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{aluno?.nome}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{c.titulo}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {c.urgencia ? <Badge color={getUrgColor(c.urgencia)}>{c.urgencia}</Badge> : <span style={{ fontSize: 12, color: "#cbd5e1" }}>—</span>}
                    {c.encaminhamento && <Badge color="#7c3aed">📨 Encaminhado</Badge>}
                    <Badge color={getStColor(c.status)}>{getStLabel(c.status)}</Badge>
                    {(usuario.perfil === "DIRECAO" || c.encResponsavel === usuario.nome) && c.encaminhamento && c.encStatus !== "RESOLVIDO" && (
                      <Btn small variant="success" onClick={e => { e.stopPropagation(); setResolving(c); }}>Atualizar</Btn>
                    )}
                    <span style={{ color: "#94a3b8" }}>{exp ? "▲" : "▼"}</span>
                  </div>
                </div>
                {exp && (
                  <div style={{ padding: "14px 16px", borderTop: "1px solid #f1f5f9", background: "#fff" }}>
                    <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}><b>Relato:</b> {c.detalhes}</div>
                    {c.comQuem && <div style={{ fontSize: 12, color: "#94a3b8" }}>Comunicação com: {c.comQuem}</div>}
                    {c.encaminhamento && <div style={{ fontSize: 12, color: "#7c3aed", marginTop: 4 }}>Encaminhado → {c.encDestino} / {c.encResponsavel}</div>}
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

// ── ENCAMINHAMENTOS ────────────────────────────────────────────────────────────
function Encaminhamentos({ comunicacoes, alunos, usuario, onResolve }) {
  const [resolving, setResolving] = useState(null);
  const [filtro, setFiltro] = useState("TODOS");
  const encs = comunicacoes.filter(c => c.encaminhamento && canSee(usuario, c));
  const filtrados = filtro === "TODOS" ? encs : encs.filter(c => c.encStatus === filtro);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>📨 Encaminhamentos</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Acompanhe os casos encaminhados para outros setores.</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["TODOS", "PENDENTE", "EM_ANALISE", "RESOLVIDO"].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: filtro === f ? "#2563eb" : "#f1f5f9", color: filtro === f ? "#fff" : "#64748b" }}>
            {getStLabel(f)} ({f === "TODOS" ? encs.length : encs.filter(c => c.encStatus === f).length})
          </button>
        ))}
      </div>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtrados.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>Nenhum encaminhamento encontrado.</div>}
          {filtrados.map(c => {
            const aluno = alunos.find(a => a.id === c.alunoId);
            return (
              <div key={c.id} style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid #f1f5f9", background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{c.titulo}</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{aluno?.nome} · {aluno?.turma}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{c.data} · Para: {c.encDestino} → {c.encResponsavel}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {c.urgencia && <Badge color={getUrgColor(c.urgencia)}>{c.urgencia}</Badge>}
                    <Badge color={getStColor(c.encStatus || "PENDENTE")}>{getStLabel(c.encStatus || "PENDENTE")}</Badge>
                    {(usuario.perfil === "DIRECAO" || c.encResponsavel === usuario.nome) && c.encStatus !== "RESOLVIDO" && (
                      <Btn small variant="success" onClick={() => setResolving(c)}>Atualizar Status</Btn>
                    )}
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

// ── REUNIÕES ───────────────────────────────────────────────────────────────────
function Reunioes({ reunioes, alunos, usuario, onNova }) {
  const [expandido, setExpandido] = useState(null);
  const lista = reunioes.filter(r => r.escolaId === usuario.escolaId);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>📅 Reuniões</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Registro de reuniões e controle de presença familiar.</p>
        </div>
        <Btn icon="+" onClick={onNova}>Nova Reunião</Btn>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "Total de Reuniões", value: lista.length, color: "#2563eb" },
          { label: "Total Convocados", value: lista.reduce((s, r) => s + r.convocados.length, 0), color: "#7c3aed" },
          { label: "Presenças", value: lista.reduce((s, r) => s + r.convocados.filter(c => c.compareceu).length, 0), color: "#22c55e" },
          { label: "Ausências", value: lista.reduce((s, r) => s + r.convocados.filter(c => !c.compareceu).length, 0), color: "#ef4444" },
        ].map(m => (
          <Card key={m.label} style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: m.color }}>{m.value}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lista.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>Nenhuma reunião registrada.</div>}
          {lista.map(reuniao => {
            const exp = expandido === reuniao.id;
            const presentes = reuniao.convocados.filter(c => c.compareceu).length;
            const total = reuniao.convocados.length;
            const pct = total > 0 ? Math.round((presentes / total) * 100) : 0;
            return (
              <div key={reuniao.id} style={{ border: "1px solid #f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                <div onClick={() => setExpandido(exp ? null : reuniao.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#fafafa", cursor: "pointer", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 26 }}>📅</span>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>{reuniao.titulo}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{reuniao.data} · {reuniao.tipo}</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: pct < 50 ? "#ef4444" : "#22c55e" }}>{pct}%</div>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>presença</div>
                    </div>
                    <Badge color="#22c55e">✓ {presentes}</Badge>
                    <Badge color="#ef4444">✗ {total - presentes}</Badge>
                    <span style={{ color: "#94a3b8" }}>{exp ? "▲" : "▼"}</span>
                  </div>
                </div>
                {exp && (
                  <div style={{ padding: "14px 16px", borderTop: "1px solid #f1f5f9" }}>
                    {reuniao.descricao && <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>{reuniao.descricao}</p>}
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>LISTA DE PRESENÇA</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                      {reuniao.convocados.map((c, i) => {
                        const aluno = alunos.find(a => a.id === c.alunoId);
                        return (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 8, background: c.compareceu ? "#f0fdf4" : "#fef2f2", border: `1px solid ${c.compareceu ? "#bbf7d0" : "#fecaca"}` }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{aluno?.nome}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>Resp.: {c.responsavel}</div>
                            </div>
                            <Badge color={c.compareceu ? "#16a34a" : "#ef4444"}>{c.compareceu ? "✓ Presente" : "✗ Ausente"}</Badge>
                          </div>
                        );
                      })}
                    </div>
                    {reuniao.ata && <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: 13, color: "#475569", borderLeft: "3px solid #2563eb", marginBottom: 8 }}><b>Ata:</b> {reuniao.ata}</div>}
                    {reuniao.proximaAcao && <div style={{ padding: "8px 14px", background: "#fffbeb", borderRadius: 8, fontSize: 13, color: "#92400e" }}>📌 {reuniao.proximaAcao}</div>}
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

// ── ALUNOS ─────────────────────────────────────────────────────────────────────
function Alunos({ alunos, comunicacoes, reunioes, usuario, onVerAluno }) {
  const [busca, setBusca] = useState("");
  const [ord, setOrd] = useState("risco");
  const filtrados = alunos.filter(a => !busca || a.nome.toLowerCase().includes(busca.toLowerCase()) || a.turma.toLowerCase().includes(busca.toLowerCase())).sort((a, b) => ord === "risco" ? b.risco - a.risco : a.nome.localeCompare(b.nome));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>👨‍🎓 Alunos</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Base de estudantes com score de risco e histórico completo.</p>
      </div>
      <Card>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar por nome ou turma..." style={{ flex: 1, minWidth: 200, padding: "8px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none" }} />
          <select value={ord} onChange={e => setOrd(e.target.value)} style={{ padding: "8px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none" }}>
            <option value="risco">Ordenar por risco</option>
            <option value="nome">Ordenar por nome</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtrados.map(a => {
            const nComs = comunicacoes.filter(c => c.alunoId === a.id).length;
            const reunioesA = reunioes.filter(r => r.convocados.some(c => c.alunoId === a.id));
            const pres = reunioesA.reduce((s, r) => s + (r.convocados.find(c => c.alunoId === a.id)?.compareceu ? 1 : 0), 0);
            return (
              <div key={a.id} onClick={() => onVerAluno(a)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, border: "1px solid #f1f5f9", background: "#fafafa", cursor: "pointer", flexWrap: "wrap" }}>
                <Av initials={a.nome.split(" ").map(n => n[0]).slice(0, 2).join("")} color={getRiscoColor(a.risco)} />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{a.nome}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{a.turma} · RM: {a.rm}</div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ textAlign: "center", padding: "4px 12px", borderRadius: 8, background: getRiscoBg(a.risco), border: `1px solid ${getRiscoColor(a.risco)}30` }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: getRiscoColor(a.risco) }}>{a.risco}</div>
                    <div style={{ fontSize: 10, color: getRiscoColor(a.risco), fontWeight: 700 }}>RISCO</div>
                  </div>
                  <Badge color="#2563eb">{nComs} registros</Badge>
                  <Badge color="#7c3aed">{pres}/{reunioesA.length} presenças</Badge>
                  <span style={{ color: "#94a3b8" }}>→</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── RETENÇÃO ───────────────────────────────────────────────────────────────────
function Retencao({ alunos, comunicacoes, reunioes, onVerAluno }) {
  const alto = alunos.filter(a => a.risco >= 60).sort((a, b) => b.risco - a.risco);
  const medio = alunos.filter(a => a.risco >= 30 && a.risco < 60).sort((a, b) => b.risco - a.risco);
  const PainelAluno = ({ a, nivel }) => {
    const coms = comunicacoes.filter(c => c.alunoId === a.id);
    const encs = coms.filter(c => c.encaminhamento);
    const reunioesA = reunioes.filter(r => r.convocados.some(c => c.alunoId === a.id));
    const ausentes = reunioesA.reduce((s, r) => s + (!r.convocados.find(c => c.alunoId === a.id)?.compareceu ? 1 : 0), 0);
    return (
      <div onClick={() => onVerAluno(a)} style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${getRiscoColor(a.risco)}30`, background: getRiscoBg(a.risco), cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>{a.nome}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{a.turma} · Resp.: {a.responsavel}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: getRiscoColor(a.risco) }}>{a.risco}</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: getRiscoColor(a.risco) }}>PONTOS</div>
            </div>
            <Badge color={getRiscoColor(a.risco)}>{nivel}</Badge>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#475569" }}>📋 {coms.length} comunicações</span>
          <span style={{ fontSize: 12, color: "#475569" }}>📨 {encs.length} encaminhamentos</span>
          {ausentes > 0 && <span style={{ fontSize: 12, color: "#ef4444" }}>⚠️ {ausentes} ausências em reuniões</span>}
        </div>
      </div>
    );
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1e293b" }}>📉 Retenção — Radar de Risco</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "#94a3b8" }}>Identifique e acompanhe alunos com maior risco de evasão.</p>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "Risco Alto", count: alto.length, color: "#ef4444", bg: "#fef2f2", desc: "≥ 60 pts" },
          { label: "Risco Médio", count: medio.length, color: "#f59e0b", bg: "#fffbeb", desc: "30–59 pts" },
          { label: "Estáveis", count: alunos.filter(a => a.risco < 30).length, color: "#22c55e", bg: "#f0fdf4", desc: "< 30 pts" },
        ].map(m => (
          <Card key={m.label} style={{ flex: 1, minWidth: 160, background: m.bg, border: `1px solid ${m.color}30` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: m.color, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: m.color }}>{m.count}</div>
            <div style={{ fontSize: 11, color: m.color, opacity: 0.7 }}>{m.desc}</div>
          </Card>
        ))}
      </div>
      {alto.length > 0 && <div><h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#ef4444" }}>⚠️ Risco Alto — Ação Imediata</h3><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{alto.map(a => <PainelAluno key={a.id} a={a} nivel="RISCO ALTO" />)}</div></div>}
      {medio.length > 0 && <div><h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#f59e0b" }}>🔶 Risco Médio — Monitorar</h3><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{medio.map(a => <PainelAluno key={a.id} a={a} nivel="RISCO MÉDIO" />)}</div></div>}
    </div>
  );
}

// ── SUPER ADMIN ────────────────────────────────────────────────────────────────
function SuperAdminPanel({ onLogout, onEntrarEscola }) {
  const [escolas, setEscolas] = useState(ESCOLAS);
  const [showAdd, setShowAdd] = useState(false);
  const [nova, setNova] = useState({ nome: "", cidade: "", plano: "BÁSICO" });
  const planColor = p => p === "PRO" ? "#7c3aed" : p === "BÁSICO" ? "#2563eb" : "#f59e0b";
  const add = () => {
    if (!nova.nome.trim()) return;
    setEscolas(p => [...p, { id: Date.now(), ...nova, alunos: 0, status: "TRIAL" }]);
    setNova({ nome: "", cidade: "", plano: "BÁSICO" }); setShowAdd(false);
  };
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏫</div>
          <div><div style={{ fontWeight: 900, fontSize: 15, color: "#1e293b" }}>HUB DE RELACIONAMENTO</div><div style={{ fontSize: 11, color: "#94a3b8" }}>Painel Super Admin</div></div>
        </div>
        <Btn variant="ghost" small onClick={onLogout}>Sair</Btn>
      </div>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
          {[{ label: "Escolas Ativas", value: escolas.filter(e => e.status === "ATIVA").length, color: "#2563eb" }, { label: "Total Alunos", value: escolas.reduce((s, e) => s + e.alunos, 0), color: "#7c3aed" }, { label: "Planos PRO", value: escolas.filter(e => e.plano === "PRO").length, color: "#f59e0b" }, { label: "Em Trial", value: escolas.filter(e => e.status === "TRIAL").length, color: "#059669" }].map(m => (
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {escolas.map(escola => (
              <div key={escola.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 10, border: "1px solid #f1f5f9", background: "#fafafa", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "#2563eb18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏫</div>
                  <div><div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{escola.nome}</div><div style={{ fontSize: 13, color: "#64748b" }}>{escola.cidade} · {escola.alunos} alunos</div></div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge color={planColor(escola.plano)}>{escola.plano}</Badge>
                  <Badge color={escola.status === "ATIVA" ? "#22c55e" : "#f59e0b"}>{escola.status}</Badge>
                  <Btn small variant="ghost" onClick={() => onEntrarEscola(escola)}>Acessar →</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
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
            <MFoot><Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn><Btn onClick={add}>Cadastrar</Btn></MFoot>
          </MBox>
        </Overlay>
      )}
    </div>
  );
}

// ── LOGIN ──────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const handle = () => {
    const u = USUARIOS_BASE.find(x => x.email === email && x.senha === senha);
    if (u) onLogin(u); else setErro("E-mail ou senha inválidos.");
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
          <Btn onClick={handle} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>ENTRAR</Btn>
        </div>
        <div style={{ marginTop: 18, padding: "12px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b", fontWeight: 600 }}>Acessos de teste:</p>
          {[["admin@hub.com.br","admin123","Super Admin"],["diretor@unica.edu.br","123","Diretor"],["maria@unica.edu.br","123","Psicólogo"],["hilaria@unica.edu.br","123","Secretária"]].map(([e,s,p]) => (
            <div key={e} onClick={() => { setEmail(e); setSenha(s); }} style={{ cursor: "pointer", fontSize: 11, color: "#2563eb", marginBottom: 2 }}>{p}: <b>{e}</b> / {s}</div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── SCHOOL APP ─────────────────────────────────────────────────────────────────
function SchoolApp({ usuario, escola, onLogout, onVoltarAdmin }) {
  const [pagina, setPagina] = useState("dashboard");
  const [comunicacoes, setComunicacoes] = useState(COMUNICACOES_BASE.filter(c => c.escolaId === escola.id));
  const [reunioes, setReunioes] = useState(REUNIOES_BASE.filter(r => r.escolaId === escola.id));
  const [modalNovaCom, setModalNovaCom] = useState(false);
  const [modalNovaReuniao, setModalNovaReuniao] = useState(false);
  const [alunoSel, setAlunoSel] = useState(null);
  const alunos = ALUNOS_BASE.filter(a => a.escolaId === escola.id);

  const addCom = (c) => setComunicacoes(p => [c, ...p]);
  const addReuniao = (r) => setReunioes(p => [r, ...p]);
  const resolveEnc = (id, status, resolucao) => setComunicacoes(p => p.map(c => c.id === id ? { ...c, encStatus: status, status, resolucao } : c));

  const nav = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "alunos", icon: "👨‍🎓", label: "Alunos" },
    { id: "comunicacoes", icon: "💬", label: "Comunicações" },
    { id: "encaminhamentos", icon: "📨", label: "Encaminhamentos" },
    { id: "reunioes", icon: "📅", label: "Reuniões" },
    { id: "retencao", icon: "📉", label: "Retenção" },
  ];

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
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{usuario.nome}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{perfilLabel(usuario.perfil)}</div>
          </div>
          <Av initials={usuario.avatar} color="#2563eb" />
        </div>
        <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
          {pagina === "dashboard" && <Dashboard alunos={alunos} comunicacoes={comunicacoes.filter(c => canSee(usuario, c))} reunioes={reunioes} usuario={usuario} onNovaCom={() => setModalNovaCom(true)} onVerAluno={setAlunoSel} />}
          {pagina === "alunos" && <Alunos alunos={alunos} comunicacoes={comunicacoes} reunioes={reunioes} usuario={usuario} onVerAluno={setAlunoSel} />}
          {pagina === "comunicacoes" && <Comunicacoes comunicacoes={comunicacoes} alunos={alunos} usuario={usuario} onNova={() => setModalNovaCom(true)} onResolve={resolveEnc} />}
          {pagina === "encaminhamentos" && <Encaminhamentos comunicacoes={comunicacoes} alunos={alunos} usuario={usuario} onResolve={resolveEnc} />}
          {pagina === "reunioes" && <Reunioes reunioes={reunioes} alunos={alunos} usuario={usuario} onNova={() => setModalNovaReuniao(true)} />}
          {pagina === "retencao" && <Retencao alunos={alunos} comunicacoes={comunicacoes} reunioes={reunioes} onVerAluno={setAlunoSel} />}
        </div>
      </div>
      {modalNovaCom && <ModalNovaCom onClose={() => setModalNovaCom(false)} onSave={addCom} usuario={usuario} alunos={alunos} />}
      {modalNovaReuniao && <ModalNovaReuniao onClose={() => setModalNovaReuniao(false)} onSave={addReuniao} usuario={usuario} alunos={alunos} />}
      {alunoSel && <PerfilAluno aluno={alunoSel} comunicacoes={comunicacoes} reunioes={reunioes} usuario={usuario} onClose={() => setAlunoSel(null)} />}
    </div>
  );
}

// ── ROOT ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [escolaAtiva, setEscolaAtiva] = useState(null);

  const handleLogin = (u) => {
    setUsuario(u);
    if (u.perfil !== "SUPER_ADMIN") setEscolaAtiva(ESCOLAS.find(e => e.id === u.escolaId));
  };

  if (!usuario) return <LoginPage onLogin={handleLogin} />;
  if (usuario.perfil === "SUPER_ADMIN" && !escolaAtiva) return <SuperAdminPanel onLogout={() => { setUsuario(null); setEscolaAtiva(null); }} onEntrarEscola={setEscolaAtiva} />;

  const escola = escolaAtiva || ESCOLAS.find(e => e.id === usuario.escolaId);
  const isSA = usuario.perfil === "SUPER_ADMIN";

  return (
    <SchoolApp
      usuario={isSA ? { ...USUARIOS_BASE[1], id: 99, nome: "Admin Global", avatar: "AG", perfil: "DIRECAO" } : usuario}
      escola={escola}
      onLogout={() => { setUsuario(null); setEscolaAtiva(null); }}
      onVoltarAdmin={isSA ? () => setEscolaAtiva(null) : null}
    />
  );
}
