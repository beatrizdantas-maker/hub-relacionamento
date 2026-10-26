"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Plus, Trash2, X } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Selo } from "@/components/ui/Selo";
import { Confirmacao } from "@/components/ui/Confirmacao";
import { CampoArea, CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { STATUS_CONTEUDO, TIPOS_TELA } from "@/lib/validacao/conteudo";
import { permissoes } from "@/lib/papeis";
import { excluirStory, salvarStory } from "@/app/(app)/calendario/acoes";
import type { Conteudo, Papel, StatusConteudo, Story, TelaStory, TipoTelaStory } from "@/lib/tipos/database";
import { Painel } from "./Painel";
import { ORIGEM, STATUS } from "./rotulos";

type Form = { data: string; objetivo: string; status: StatusConteudo; conteudo_id: string; telas: TelaStory[] };

const TELAS_PADRAO: TelaStory[] = [
  { tipo: "Foto ou vídeo", texto: "Abertura: contexto do dia em uma frase.", interacao: null },
  { tipo: "Compartilhar post", texto: "Compartilhe o post de hoje com um convite para ver.", interacao: null },
  { tipo: "Enquete", texto: "Pergunta ligada ao tema do post.", interacao: { pergunta: "", opcoes: ["Sim", "Não"] } },
  { tipo: "Texto", texto: "Fechamento com chamada para o direct.", interacao: null },
];

function formDe(s: Story | null, data: string): Form {
  if (s) return { data: s.data, objetivo: s.objetivo ?? "", status: s.status, conteudo_id: s.conteudo_id ?? "", telas: Array.isArray(s.telas) ? s.telas.map((t) => ({ ...t })) : [] };
  return { data, objetivo: "", status: "aprovado", conteudo_id: "", telas: TELAS_PADRAO.map((t) => ({ ...t, interacao: t.interacao ? { ...t.interacao } : null })) };
}

const TEM_INTERACAO: Partial<Record<TipoTelaStory, ("pergunta" | "opcoes" | "emoji" | "url" | "data")[]>> = {
  Enquete: ["pergunta", "opcoes"],
  "Caixa de pergunta": ["pergunta"],
  Quiz: ["pergunta", "opcoes"],
  "Slider de emoji": ["pergunta", "emoji"],
  Slider: ["pergunta"],
  "Contagem regressiva": ["pergunta", "data"],
  Link: ["url"],
};

export function EditorStories({
  empresaId, story, dataInicial, conteudosDoDia, papel, onFechar,
}: { empresaId: string; story: Story | null; dataInicial: string; conteudosDoDia: Conteudo[]; papel: Papel; onFechar: () => void }) {
  const router = useRouter();
  const podeEditar = permissoes.podeEditar(papel);
  const podeColaborar = permissoes.podeColaborar(papel);
  const [atual, setAtual] = useState<Story | null>(story);
  const [form, setForm] = useState<Form>(() => formDe(story, dataInicial));
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const novo = !atual;

  const alterar = (parcial: Partial<Form>) => { setForm((f) => ({ ...f, ...parcial })); setAviso(null); };
  const alterarTela = (i: number, parcial: Partial<TelaStory>) => alterar({ telas: form.telas.map((t, j) => (j === i ? { ...t, ...parcial } : t)) });
  const alterarInteracao = (i: number, parcial: NonNullable<TelaStory["interacao"]>) =>
    alterarTela(i, { interacao: { ...(form.telas[i].interacao ?? {}), ...parcial } });

  function mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= form.telas.length) return;
    const telas = [...form.telas];
    [telas[i], telas[j]] = [telas[j], telas[i]];
    alterar({ telas });
  }

  function salvar(status?: StatusConteudo) {
    setErro(null); setAviso(null);
    iniciar(async () => {
      const r = await salvarStory(empresaId, { ...form, id: atual?.id, status: status ?? form.status, conteudo_id: form.conteudo_id || null });
      if (!r.ok) return setErro(r.erro);
      setAtual(r.story);
      setForm(formDe(r.story, r.story.data));
      setAviso(status === "aprovado" ? "Stories aprovados" : novo ? "Stories criados" : "Salvo");
      router.refresh();
    });
  }

  function excluir() {
    if (!atual) return;
    iniciar(async () => {
      const r = await excluirStory(empresaId, atual.id);
      if (!r.ok) { setErro(r.erro); setExcluindo(false); return; }
      router.refresh();
      onFechar();
    });
  }

  const somenteStatus = !podeEditar && podeColaborar;
  const rodape = (podeEditar || somenteStatus) && !excluindo ? (
    <div className="flex flex-wrap items-center gap-2">
      <Botao carregando={pendente} onClick={() => salvar()}>
        <Check className="h-4 w-4" aria-hidden /> {novo ? "Criar stories" : somenteStatus ? "Salvar status" : "Salvar"}
      </Botao>
      {podeEditar && form.status === "sugestao" && <Botao variante="secundaria" carregando={pendente} onClick={() => salvar("aprovado")}>Aprovar</Botao>}
      {podeEditar && atual && (
        <Botao variante="fantasma" className="ml-auto text-atrasado" onClick={() => setExcluindo(true)} disabled={pendente}>
          <Trash2 className="h-4 w-4" aria-hidden /> Excluir
        </Botao>
      )}
    </div>
  ) : null;

  return (
    <Painel titulo={novo ? "Novos stories" : "Stories do dia"} onFechar={onFechar} rodape={rodape}>
      <div className="space-y-4">
        {atual && (
          <div className="flex flex-wrap gap-1">
            <Selo tom={ORIGEM[atual.origem].tom}>{ORIGEM[atual.origem].rotulo}</Selo>
            <Selo tom={STATUS[atual.status].tom}>{STATUS[atual.status].rotulo}</Selo>
          </div>
        )}
        {!podeColaborar && <Aviso tipo="info">Você pode ver estes stories, mas não alterá-los.</Aviso>}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}
        {excluindo && <Confirmacao titulo="Excluir esta sequência de stories?" rotuloConfirmar="Excluir" carregando={pendente} onConfirmar={excluir} onCancelar={() => setExcluindo(false)} />}

        <fieldset disabled={!podeEditar} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto rotulo="Data" type="date" value={form.data} onChange={(e) => alterar({ data: e.target.value })} className="tabular" />
            <CampoSelecao rotulo="Status" value={form.status} disabled={!podeColaborar} onChange={(e) => alterar({ status: e.target.value as StatusConteudo })}>
              {STATUS_CONTEUDO.map((s) => <option key={s} value={s}>{STATUS[s].rotulo}</option>)}
            </CampoSelecao>
          </div>
          <CampoTexto rotulo="Objetivo" value={form.objetivo} onChange={(e) => alterar({ objetivo: e.target.value })} placeholder="Ex.: levar para o post do dia e abrir conversa no direct" maxLength={200} />
          {conteudosDoDia.length > 0 && (
            <CampoSelecao rotulo="Post ligado" value={form.conteudo_id} onChange={(e) => alterar({ conteudo_id: e.target.value })}>
              <option value="">Nenhum</option>
              {conteudosDoDia.map((c) => <option key={c.id} value={c.id}>{c.formato} · {c.tema || "sem tema"}</option>)}
            </CampoSelecao>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Telas <span className="font-normal text-texto-3 tabular">({form.telas.length})</span></h3>
            {podeEditar && (
              <Botao tamanho="sm" variante="secundaria" onClick={() => alterar({ telas: [...form.telas, { tipo: "Texto", texto: "", interacao: null }] })} disabled={form.telas.length >= 20}>
                <Plus className="h-4 w-4" aria-hidden /> Adicionar tela
              </Botao>
            )}
          </div>
          {form.telas.length === 0 && <p className="text-sm text-texto-3">Nenhuma tela. Adicione a primeira: abertura, compartilhar o post, interação e fechamento.</p>}
          <ol className="space-y-3">
            {form.telas.map((t, i) => {
              const campos = TEM_INTERACAO[t.tipo] ?? [];
              const inter = t.interacao ?? {};
              return (
                <li key={i} className="rounded-xl border border-borda p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primaria/10 text-xs font-semibold text-primaria tabular">{i + 1}</span>
                    <CampoSelecao rotulo="Tipo de tela" className="flex-1 [&>label]:sr-only" value={t.tipo} onChange={(e) => alterarTela(i, { tipo: e.target.value as TipoTelaStory, interacao: TEM_INTERACAO[e.target.value as TipoTelaStory] ? (t.interacao ?? {}) : null })}>
                      {TIPOS_TELA.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                    </CampoSelecao>
                    {podeEditar && (
                      <div className="flex shrink-0 gap-0.5">
                        <button type="button" className="rounded-lg p-1.5 text-texto-2 hover:bg-superficie-2 disabled:opacity-40" aria-label="Subir tela" disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUp className="h-4 w-4" aria-hidden /></button>
                        <button type="button" className="rounded-lg p-1.5 text-texto-2 hover:bg-superficie-2 disabled:opacity-40" aria-label="Descer tela" disabled={i === form.telas.length - 1} onClick={() => mover(i, 1)}><ArrowDown className="h-4 w-4" aria-hidden /></button>
                        <button type="button" className="rounded-lg p-1.5 text-atrasado hover:bg-superficie-2" aria-label="Remover tela" onClick={() => alterar({ telas: form.telas.filter((_, j) => j !== i) })}><X className="h-4 w-4" aria-hidden /></button>
                      </div>
                    )}
                  </div>
                  <CampoArea rotulo="Texto da tela" className="[&>label]:sr-only" rows={2} value={t.texto} onChange={(e) => alterarTela(i, { texto: e.target.value })} placeholder="O que aparece ou é dito nesta tela" maxLength={1000} />
                  {campos.length > 0 && (
                    <div className="mt-2 space-y-2 rounded-lg bg-superficie-2 p-2">
                      {campos.includes("pergunta") && <CampoTexto rotulo={t.tipo === "Contagem regressiva" ? "Título" : "Pergunta"} value={inter.pergunta ?? ""} onChange={(e) => alterarInteracao(i, { pergunta: e.target.value })} maxLength={300} />}
                      {campos.includes("opcoes") && (
                        <div>
                          <span className="rotulo">Opções {t.tipo === "Quiz" ? "(a primeira é a correta)" : ""}</span>
                          <div className="space-y-1">
                            {(inter.opcoes ?? ["", ""]).map((op, k) => (
                              <div key={k} className="flex gap-1">
                                <input className="campo" value={op} maxLength={60} aria-label={`Opção ${k + 1}`} onChange={(e) => { const ops = [...(inter.opcoes ?? ["", ""])]; ops[k] = e.target.value; alterarInteracao(i, { opcoes: ops }); }} />
                                {podeEditar && (inter.opcoes?.length ?? 2) > 2 && <button type="button" className="rounded-lg px-2 text-texto-3 hover:bg-superficie" aria-label="Remover opção" onClick={() => alterarInteracao(i, { opcoes: (inter.opcoes ?? []).filter((_, m) => m !== k) })}><X className="h-4 w-4" aria-hidden /></button>}
                              </div>
                            ))}
                            {podeEditar && (inter.opcoes?.length ?? 2) < 4 && <button type="button" className="text-xs text-primaria underline-offset-2 hover:underline" onClick={() => alterarInteracao(i, { opcoes: [...(inter.opcoes ?? ["", ""]), ""] })}>Adicionar opção</button>}
                          </div>
                        </div>
                      )}
                      {campos.includes("emoji") && <CampoTexto rotulo="Emoji do slider" value={inter.emoji ?? ""} onChange={(e) => alterarInteracao(i, { emoji: e.target.value })} maxLength={8} placeholder="🔥" />}
                      {campos.includes("url") && <CampoTexto rotulo="Link" type="url" value={inter.url ?? ""} onChange={(e) => alterarInteracao(i, { url: e.target.value })} maxLength={500} placeholder="https://" />}
                      {campos.includes("data") && <CampoTexto rotulo="Data e hora do fim" type="datetime-local" value={inter.data ?? ""} onChange={(e) => alterarInteracao(i, { data: e.target.value })} className="tabular" />}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </fieldset>
      </div>
    </Painel>
  );
}
