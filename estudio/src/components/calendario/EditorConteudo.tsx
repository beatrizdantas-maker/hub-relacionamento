"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, Copy, ListChecks, MessageSquareText, ScrollText, Sparkles, Trash2 } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Selo } from "@/components/ui/Selo";
import { Confirmacao } from "@/components/ui/Confirmacao";
import { CampoArea, CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { OBJETIVOS_RITMO } from "@/lib/validacao/empresa";
import { STATUS_CONTEUDO } from "@/lib/validacao/conteudo";
import { diaDaSemana, formatarCurta, horaCurta } from "@/lib/datas";
import { permissoes } from "@/lib/papeis";
import { concluirTarefasDoConteudo, criarTarefasPadrao, excluirConteudo, mudarStatusTarefa, salvarConteudo } from "@/app/(app)/calendario/acoes";
import { copiarTexto, falasDoRoteiro } from "@/lib/copiarArtes";
import type { Conteudo, FormatoConteudo, Papel, Rede, RitmoDia, StatusConteudo, Tarefa } from "@/lib/tipos/database";
import { FORMATOS_POR_REDE, redeDe, rotuloFormato, rotuloRede } from "@/lib/redes";
import { SeloLinkedin } from "./Cartoes";
import type { ResultadoAdaptar } from "@/app/api/ia/adaptar/route";
import { Painel } from "./Painel";
import { BriefingIA } from "./BriefingIA";
import { Teleprompter } from "./Teleprompter";
import { extrairFalas } from "@/lib/ia/briefing";
import { ORIGEM, STATUS } from "./rotulos";

type Form = {
  rede: Rede; data: string; hora: string; formato: FormatoConteudo; status: StatusConteudo; tema: string; tipo: string; pilar: string; objetivo: string;
  cta: string; roteiro: string; legenda: string; orientacao_arte: string; notas: string; campanha_id: string; ganchos: string[];
};

function formDe(c: Conteudo | null, data: string, ritmo: RitmoDia[], rede: Rede = "instagram"): Form {
  if (c) {
    return {
      rede: redeDe(c), data: c.data, hora: horaCurta(c.hora), formato: c.formato, status: c.status, tema: c.tema ?? "", tipo: c.tipo ?? "", pilar: c.pilar ?? "", objetivo: c.objetivo ?? "",
      cta: c.cta ?? "", roteiro: c.roteiro ?? "", legenda: c.legenda ?? "", orientacao_arte: c.orientacao_arte ?? "", notas: c.notas ?? "", campanha_id: c.campanha_id ?? "",
      ganchos: Array.isArray(c.ganchos) ? c.ganchos : [],
    };
  }
  const r = ritmo.find((x) => x.dia === diaDaSemana(data));
  return {
    rede, data, hora: r?.hora ?? "12:00", formato: r?.formato ?? FORMATOS_POR_REDE[rede][0], status: "aprovado", tema: "", tipo: r?.tipo ?? "", pilar: r?.pilar ?? "", objetivo: r?.objetivo ?? "",
    cta: "", roteiro: "", legenda: "", orientacao_arte: "", notas: "", campanha_id: "", ganchos: [],
  };
}

const ROTULO_ROTEIRO: Record<FormatoConteudo, string> = {
  Reels: "Roteiro do vídeo",
  Carrossel: "Slides (texto e imagem de cada um)",
  "Estático": "Arte (texto e imagem)",
  Texto: "Imagem de apoio (opcional)",
  Enquete: "Pergunta e opções",
  Artigo: "Artigo (título, subtítulo e seções)",
};
const DICA_ROTEIRO: Record<FormatoConteudo, string> = {
  Reels: "Cena a cena: imagem, fala, texto na tela, áudio.",
  Carrossel: "Slide 1: … Slide 2: …",
  "Estático": "Texto da arte e descrição da imagem.",
  Texto: "O texto completo vai em “Texto do post”. Aqui, só a imagem que acompanha (se houver).",
  Enquete: "PERGUNTA: …\nOPÇÕES:\n1. …\n2. …",
  Artigo: "TÍTULO: …\nSUBTÍTULO: …\n## Intertítulo\nTexto…",
};

const STATUS_TAREFA: Record<Tarefa["status"], string> = { pendente: "Pendente", em_producao: "Em produção", aguardando: "Aguardando", concluido: "Concluída" };

export function EditorConteudo({
  empresaId, conteudo, dataInicial, ritmo: ritmoInstagram, ritmoLinkedin = null, redeInicial = "instagram", pilares, campanhas, tarefas, papel, usuarioId, hoje, onFechar,
}: {
  empresaId: string; conteudo: Conteudo | null; dataInicial: string; ritmo: RitmoDia[];
  /** Ritmo do LinkedIn; null quando a empresa não usa LinkedIn. */
  ritmoLinkedin?: RitmoDia[] | null; redeInicial?: Rede; pilares: string[]; campanhas: { id: string; nome: string }[];
  tarefas: Tarefa[]; papel: Papel; usuarioId: string; hoje: string; onFechar: () => void;
}) {
  const router = useRouter();
  const podeEditar = permissoes.podeEditar(papel);
  const podeColaborar = permissoes.podeColaborar(papel);
  const [atual, setAtual] = useState<Conteudo | null>(conteudo);
  const ritmoDa = (r: Rede) => (r === "linkedin" ? ritmoLinkedin ?? [] : ritmoInstagram);
  const redeComeco: Rede = redeInicial === "linkedin" && ritmoLinkedin ? "linkedin" : "instagram";
  const [form, setForm] = useState<Form>(() => formDe(conteudo, dataInicial, ritmoDa(conteudo ? redeDe(conteudo) : redeComeco), redeComeco));
  const [criarTarefas, setCriarTarefas] = useState(true);
  const [listaTarefas, setListaTarefas] = useState<Tarefa[]>(tarefas);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [teleprompter, setTeleprompter] = useState(false);
  const [falasCopiadas, setFalasCopiadas] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [adaptando, setAdaptando] = useState(false);
  const novo = !atual;

  async function adaptarParaLinkedin() {
    if (!atual) return;
    setErro(null); setAviso(null); setAdaptando(true);
    try {
      const r = await fetch("/api/ia/adaptar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ empresaId, conteudoId: atual.id }) });
      const corpo = (await r.json().catch(() => ({}))) as Partial<ResultadoAdaptar> & { erro?: string; detalhes?: string[] };
      if (!r.ok || !corpo.id) return setErro(`${corpo.erro ?? `Erro ${r.status} ao adaptar.`}${corpo.detalhes?.length ? ` (${corpo.detalhes.slice(0, 3).join("; ")})` : ""}`);
      setAviso(`Versão do LinkedIn criada em ${formatarCurta(corpo.data!)} (${rotuloFormato(corpo.formato as FormatoConteudo, "linkedin")}) como sugestão da IA${corpo.tarefas ? `, com ${corpo.tarefas} tarefas` : ""}. Ela aparece no calendário com a marca “in”.`);
      router.refresh();
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setAdaptando(false);
    }
  }

  const alterar = (parcial: Partial<Form>) => { setForm((f) => ({ ...f, ...parcial })); setAviso(null); };

  function salvar(status?: StatusConteudo) {
    setErro(null); setAviso(null);
    iniciar(async () => {
      const r = await salvarConteudo(
        empresaId,
        { ...form, id: atual?.id, status: status ?? form.status, hora: form.hora || null, campanha_id: form.campanha_id || null },
        { criarTarefasPadrao: novo && criarTarefas },
      );
      if (!r.ok) return setErro(r.erro);
      setAtual(r.conteudo);
      setForm(formDe(r.conteudo, r.conteudo.data, ritmoDa(redeDe(r.conteudo))));
      const partes: string[] = [];
      if (r.reagendadoDe) partes.push(`Reagendado para ${formatarCurta(r.conteudo.data)}`);
      else if (status === "aprovado") partes.push("Conteúdo aprovado");
      else partes.push(novo ? "Conteúdo criado" : "Salvo");
      if (r.tarefasCriadas) partes.push(`${r.tarefasCriadas} tarefas padrão criadas`);
      setAviso(partes.join(" · "));
      if (r.tarefasCriadas) {
        const t = await criarTarefasPadrao(empresaId, r.conteudo.id);
        if (t.ok) setListaTarefas(t.tarefas);
      }
      router.refresh();
    });
  }

  function excluir() {
    if (!atual) return;
    iniciar(async () => {
      const r = await excluirConteudo(empresaId, atual.id);
      if (!r.ok) { setErro(r.erro); setExcluindo(false); return; }
      router.refresh();
      onFechar();
    });
  }

  function gerarTarefas() {
    if (!atual) return;
    setErro(null);
    iniciar(async () => {
      const r = await criarTarefasPadrao(empresaId, atual.id);
      if (!r.ok) return setErro(r.erro);
      setListaTarefas(r.tarefas);
      setAviso(r.criadas ? `${r.criadas} tarefas padrão criadas` : "As tarefas padrão já existem para este conteúdo");
      router.refresh();
    });
  }

  function concluirTarefa(t: Tarefa, concluida: boolean) {
    iniciar(async () => {
      const r = await mudarStatusTarefa(empresaId, t.id, concluida ? "concluido" : "pendente");
      if (!r.ok) return setErro(r.erro);
      setListaTarefas((l) => l.map((x) => (x.id === t.id ? { ...x, status: concluida ? "concluido" : "pendente" } : x)));
      router.refresh();
    });
  }

  function concluirTodas() {
    if (!atual) return;
    setErro(null); setAviso(null);
    iniciar(async () => {
      const r = await concluirTarefasDoConteudo(empresaId, atual.id);
      if (!r.ok) return setErro(r.erro);
      const feitas = new Set(r.concluidas);
      setListaTarefas((l) => l.map((x) => (feitas.has(x.id) ? { ...x, status: "concluido" } : x)));
      const sobraram = listaTarefas.filter((t) => t.status !== "concluido" && !feitas.has(t.id)).length;
      setAviso(
        r.concluidas.length === 0
          ? "Nenhuma tarefa pôde ser marcada. Você só pode concluir as tarefas em que é responsável."
          : `${r.concluidas.length} ${r.concluidas.length === 1 ? "tarefa marcada" : "tarefas marcadas"} como feita${r.concluidas.length === 1 ? "" : "s"}.${sobraram ? ` ${sobraram} de outras pessoas ficaram como estavam.` : ""}`,
      );
      router.refresh();
    });
  }

  async function copiarFalas() {
    if (await copiarTexto(falasDoRoteiro(form.roteiro))) {
      setFalasCopiadas(true);
      setTimeout(() => setFalasCopiadas(false), 2000);
    }
  }

  async function copiarLegenda() {
    try {
      await navigator.clipboard.writeText(form.legenda);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  }

  const somenteStatus = !podeEditar && podeColaborar;
  const podeMudarTarefa = (t: Tarefa) => podeEditar || (papel === "colaborador" && t.responsavel_id === usuarioId);

  const rodape = (podeEditar || somenteStatus) && !excluindo ? (
    <div className="flex flex-wrap items-center gap-2">
      {podeEditar && (
        <Botao carregando={pendente} onClick={() => salvar()}>
          <Check className="h-4 w-4" aria-hidden /> {novo ? "Criar conteúdo" : "Salvar"}
        </Botao>
      )}
      {somenteStatus && atual && (
        <Botao carregando={pendente} onClick={() => salvar()}>
          <Check className="h-4 w-4" aria-hidden /> Salvar status
        </Botao>
      )}
      {podeEditar && form.status === "sugestao" && (
        <Botao variante="secundaria" carregando={pendente} onClick={() => salvar("aprovado")}>Aprovar</Botao>
      )}
      <Botao variante="secundaria" onClick={copiarLegenda} disabled={!form.legenda}>
        <Copy className="h-4 w-4" aria-hidden /> {copiado ? "Copiado" : form.rede === "linkedin" ? "Copiar texto" : "Copiar legenda"}
      </Botao>
      {podeEditar && atual && (
        <Botao variante="fantasma" className="ml-auto text-atrasado" onClick={() => setExcluindo(true)} disabled={pendente}>
          <Trash2 className="h-4 w-4" aria-hidden /> Excluir
        </Botao>
      )}
    </div>
  ) : null;

  return (
    <Painel titulo={novo ? (form.rede === "linkedin" ? "Novo conteúdo no LinkedIn" : "Novo conteúdo") : atual?.tema || "Conteúdo"} onFechar={onFechar} rodape={rodape}>
      <div className="space-y-4">
        {atual && (
          <div className="flex flex-wrap gap-1">
            {form.rede === "linkedin" && <SeloLinkedin comNome />}
            <Selo tom={ORIGEM[atual.origem].tom}>{ORIGEM[atual.origem].rotulo}</Selo>
            <Selo tom={STATUS[atual.status].tom}>{STATUS[atual.status].rotulo}</Selo>
          </div>
        )}
        {!podeColaborar && <Aviso tipo="info">Você pode ver este conteúdo, mas não alterá-lo.</Aviso>}
        {somenteStatus && <Aviso tipo="info">Como colaborador(a), você pode mudar só o status.</Aviso>}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}
        {excluindo && (
          <Confirmacao titulo="Excluir este conteúdo?" descricao="As tarefas ligadas a ele também são excluídas. Não tem volta." rotuloConfirmar="Excluir" carregando={pendente} onConfirmar={excluir} onCancelar={() => setExcluindo(false)} />
        )}

        <fieldset disabled={!podeEditar} className="space-y-3">
          {novo && ritmoLinkedin && (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-superficie-2 p-1" role="radiogroup" aria-label="Rede">
              {(["instagram", "linkedin"] as const).map((r) => (
                <button key={r} type="button" role="radio" aria-checked={form.rede === r} onClick={() => r !== form.rede && setForm((f) => ({ ...formDe(null, f.data, ritmoDa(r), r), tema: f.tema, notas: f.notas, campanha_id: f.campanha_id }))} className={`rounded-lg px-2 py-2 text-sm font-medium ${form.rede === r ? "bg-superficie text-texto shadow-sm" : "text-texto-2"}`}>
                  {rotuloRede(r)}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto rotulo="Data" type="date" value={form.data} onChange={(e) => alterar({ data: e.target.value })} className="tabular" ajuda={atual && form.data !== atual.data ? `Vai reagendar de ${formatarCurta(atual.data)}` : undefined} />
            <CampoTexto rotulo="Hora" type="time" value={form.hora} onChange={(e) => alterar({ hora: e.target.value })} className="tabular" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CampoSelecao rotulo="Formato" value={form.formato} onChange={(e) => alterar({ formato: e.target.value as FormatoConteudo })}>
              {FORMATOS_POR_REDE[form.rede].map((f) => <option key={f} value={f}>{rotuloFormato(f, form.rede)}</option>)}
              {!FORMATOS_POR_REDE[form.rede].includes(form.formato) && <option value={form.formato}>{form.formato}</option>}
            </CampoSelecao>
            <CampoSelecao rotulo="Status" value={form.status} disabled={!podeColaborar} onChange={(e) => alterar({ status: e.target.value as StatusConteudo })}>
              {STATUS_CONTEUDO.map((s) => <option key={s} value={s}>{STATUS[s].rotulo}</option>)}
            </CampoSelecao>
          </div>
          <CampoTexto rotulo="Tema" value={form.tema} onChange={(e) => alterar({ tema: e.target.value })} placeholder="Ex.: 3 erros de quem começa a falar inglês" maxLength={200} />
          <CampoTexto rotulo="Tipo" value={form.tipo} onChange={(e) => alterar({ tipo: e.target.value })} placeholder="Ex.: Reels de prova social" maxLength={120} ajuda="Define as tarefas padrão: prova social, texto na tela ou comum." />
          <div className="grid grid-cols-2 gap-3">
            {pilares.length > 0 ? (
              <CampoSelecao rotulo="Pilar" value={form.pilar} onChange={(e) => alterar({ pilar: e.target.value })}>
                <option value="">Sem pilar</option>
                {pilares.map((p) => <option key={p} value={p}>{p}</option>)}
                {form.pilar && !pilares.includes(form.pilar) && <option value={form.pilar}>{form.pilar}</option>}
              </CampoSelecao>
            ) : (
              <CampoTexto rotulo="Pilar" value={form.pilar} onChange={(e) => alterar({ pilar: e.target.value })} maxLength={80} />
            )}
            <CampoSelecao rotulo="Objetivo" value={form.objetivo} onChange={(e) => alterar({ objetivo: e.target.value })}>
              <option value="">Sem objetivo</option>
              {OBJETIVOS_RITMO.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
              {form.objetivo && !OBJETIVOS_RITMO.some((o) => o.valor === form.objetivo) && <option value={form.objetivo}>{form.objetivo}</option>}
            </CampoSelecao>
          </div>
          {campanhas.length > 0 && (
            <CampoSelecao rotulo="Campanha" value={form.campanha_id} onChange={(e) => alterar({ campanha_id: e.target.value })}>
              <option value="">Sem campanha</option>
              {campanhas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </CampoSelecao>
          )}
          {podeEditar && (
            <BriefingIA
              empresaId={empresaId}
              rede={form.rede}
              campos={{ data: form.data, formato: form.formato, tipo: form.tipo, pilar: form.pilar, tema: form.tema, objetivo: form.objetivo, roteiro: form.roteiro, legenda: form.legenda, cta: form.cta, orientacao_arte: form.orientacao_arte, ganchos: form.ganchos }}
              onAplicar={(r) => {
                alterar({ roteiro: r.roteiro, orientacao_arte: r.orientacao_arte, legenda: r.legenda || form.legenda, cta: r.cta || form.cta, ganchos: r.ganchos.length ? r.ganchos : form.ganchos });
                setAviso("Briefing preenchido pela IA. Revise e clique em Salvar.");
              }}
            />
          )}
          <CampoTexto rotulo="Chamada para ação (CTA)" value={form.cta} onChange={(e) => alterar({ cta: e.target.value })} placeholder="Ex.: Salve para rever antes da próxima aula" maxLength={300} />
          <CampoArea rotulo={ROTULO_ROTEIRO[form.formato]} value={form.roteiro} onChange={(e) => alterar({ roteiro: e.target.value })} rows={form.roteiro.length > 400 ? 14 : 6} placeholder={DICA_ROTEIRO[form.formato]} />
          {form.formato === "Reels" && (
            <div>
              <span className="rotulo">Ganchos alternativos</span>
              <div className="space-y-2">
                {["Curiosidade", "Identificação", "Provocação"].map((rot, i) => (
                  <CampoTexto key={rot} rotulo={rot} value={form.ganchos[i] ?? ""} onChange={(e) => { const g = [...form.ganchos]; g[i] = e.target.value; alterar({ ganchos: g }); }} maxLength={300} />
                ))}
              </div>
            </div>
          )}
          <CampoArea rotulo={form.rede === "linkedin" ? "Texto do post" : "Legenda"} value={form.legenda} onChange={(e) => alterar({ legenda: e.target.value })} rows={6} placeholder="Termine com uma chamada concreta: salvar, enviar, comentar…" />
          <CampoArea rotulo="Orientação de arte" value={form.orientacao_arte} onChange={(e) => alterar({ orientacao_arte: e.target.value })} rows={form.orientacao_arte.length > 300 ? 9 : 3} placeholder="Estilo, cores, tipografia, fotografia, elementos." />
          <CampoArea rotulo="Notas" value={form.notas} onChange={(e) => alterar({ notas: e.target.value })} rows={3} />
          {novo && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={criarTarefas} onChange={(e) => setCriarTarefas(e.target.checked)} />
              Criar tarefas padrão (gravar, editar, revisar…) com prazos antes da data
            </label>
          )}
        </fieldset>

        {form.formato === "Reels" && extrairFalas(form.roteiro).length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Botao type="button" tamanho="sm" variante="secundaria" onClick={() => setTeleprompter(true)}><ScrollText className="h-4 w-4" aria-hidden /> Abrir teleprompter</Botao>
            <Botao type="button" tamanho="sm" variante="secundaria" onClick={copiarFalas}>
              {falasCopiadas ? <Check className="h-4 w-4" aria-hidden /> : <MessageSquareText className="h-4 w-4" aria-hidden />} {falasCopiadas ? "Falas copiadas" : "Copiar falas"}
            </Botao>
            <span className="w-full text-xs text-texto-2">Só o que é para falar, sem imagem, texto na tela nem áudio.</span>
          </div>
        )}
        {podeEditar && atual && form.rede === "instagram" && ritmoLinkedin && (
          <section aria-label="Adaptar para o LinkedIn" className="space-y-2 rounded-xl border border-linkedin/40 bg-linkedin/5 p-3">
            <p className="text-sm"><strong>LinkedIn:</strong> a IA reescreve este conteúdo para a página da empresa (para gestores e decisores) e cria a versão como sugestão, com as tarefas.</p>
            {adaptando ? (
              <p role="status" className="flex items-center gap-2 text-sm"><span className="h-4 w-4 animate-spin rounded-full border-2 border-ia border-t-transparent" aria-hidden /> Adaptando… leva até 1 minuto.</p>
            ) : (
              <Botao type="button" tamanho="sm" variante="secundaria" onClick={adaptarParaLinkedin} disabled={pendente}><Sparkles className="h-4 w-4 text-ia" aria-hidden /> Adaptar para o LinkedIn</Botao>
            )}
          </section>
        )}
        {teleprompter && <Teleprompter falas={extrairFalas(form.roteiro)} onFechar={() => setTeleprompter(false)} />}

        {atual && (
          <section className="space-y-2 border-t border-borda pt-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold"><ListChecks className="h-4 w-4" aria-hidden /> Tarefas ligadas</h3>
              <div className="flex flex-wrap justify-end gap-2">
                {podeColaborar && listaTarefas.some((t) => t.status !== "concluido" && podeMudarTarefa(t)) && (
                  <Botao tamanho="sm" variante="secundaria" onClick={concluirTodas} disabled={pendente}><CheckCheck className="h-4 w-4" aria-hidden /> Marcar todas como feitas</Botao>
                )}
                {podeEditar && <Botao tamanho="sm" variante="secundaria" onClick={gerarTarefas} disabled={pendente}>Criar tarefas padrão</Botao>}
              </div>
            </div>
            {listaTarefas.length === 0 ? (
              <p className="text-sm text-texto-3">Nenhuma tarefa ligada. {podeEditar ? "Use “Criar tarefas padrão” ou crie na tela Tarefas." : ""}</p>
            ) : (
              <ul className="divide-y divide-borda">
                {listaTarefas.map((t) => {
                  const atrasada = t.status !== "concluido" && !!t.prazo && t.prazo < hoje;
                  return (
                    <li key={t.id} className="flex items-center gap-2 py-2">
                      <input type="checkbox" className="h-4 w-4" aria-label={`Concluir ${t.titulo}`} checked={t.status === "concluido"} disabled={!podeMudarTarefa(t) || pendente} onChange={(e) => concluirTarefa(t, e.target.checked)} />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm ${t.status === "concluido" ? "text-texto-3 line-through" : ""}`}>{t.titulo}</p>
                        <p className="text-xs text-texto-3 tabular">{t.prazo ? formatarCurta(t.prazo) : "sem prazo"} · {t.prioridade} · {STATUS_TAREFA[t.status]}</p>
                      </div>
                      {atrasada && <Selo tom="atrasado">Atrasada</Selo>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </Painel>
  );
}
