"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Confirmacao } from "@/components/ui/Confirmacao";
import { CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { Painel } from "@/components/calendario/Painel";
import { PRIORIDADES, STATUS_TAREFA, TIPOS_TAREFA } from "@/lib/validacao/tarefa";
import { formatarCurta } from "@/lib/datas";
import { excluirTarefa, salvarTarefa } from "@/app/(app)/tarefas/acoes";
import type { Prioridade, StatusTarefa, Tarefa, TipoTarefa } from "@/lib/tipos/database";
import { STATUS_TAREFA_ROTULO } from "./rotulos";

export interface MembroOpcao { id: string; nome: string }
export interface ConteudoOpcao { id: string; data: string; formato: string; tema: string }

type Form = { titulo: string; tipo: TipoTarefa; responsavel_id: string; prazo: string; prioridade: Prioridade; status: StatusTarefa; conteudo_id: string };

function formDe(t: Tarefa | null, padrao: Partial<Form>): Form {
  if (t) return { titulo: t.titulo, tipo: t.tipo, responsavel_id: t.responsavel_id ?? "", prazo: t.prazo ?? "", prioridade: t.prioridade, status: t.status, conteudo_id: t.conteudo_id ?? "" };
  return { titulo: "", tipo: "Outro", responsavel_id: "", prazo: "", prioridade: "Média", status: "pendente", conteudo_id: "", ...padrao };
}

export function EditorTarefa({
  empresaId, tarefa, padrao = {}, membros, conteudos, podeEditar, onFechar,
}: { empresaId: string; tarefa: Tarefa | null; padrao?: Partial<Form>; membros: MembroOpcao[]; conteudos: ConteudoOpcao[]; podeEditar: boolean; onFechar: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => formDe(tarefa, padrao));
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const alterar = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarTarefa(empresaId, { ...form, id: tarefa?.id });
      if (!r.ok) return setErro(r.erro);
      router.refresh();
      onFechar();
    });
  }

  function excluir() {
    if (!tarefa) return;
    iniciar(async () => {
      const r = await excluirTarefa(empresaId, tarefa.id);
      if (!r.ok) { setErro(r.erro); setExcluindo(false); return; }
      router.refresh();
      onFechar();
    });
  }

  const rodape = podeEditar && !excluindo ? (
    <div className="flex flex-wrap items-center gap-2">
      <Botao carregando={pendente} onClick={salvar} disabled={!form.titulo.trim()}>
        <Check className="h-4 w-4" aria-hidden /> {tarefa ? "Salvar" : "Criar tarefa"}
      </Botao>
      <Botao variante="secundaria" onClick={onFechar} disabled={pendente}>Cancelar</Botao>
      {tarefa && (
        <Botao variante="fantasma" className="ml-auto text-atrasado" onClick={() => setExcluindo(true)} disabled={pendente}>
          <Trash2 className="h-4 w-4" aria-hidden /> Excluir
        </Botao>
      )}
    </div>
  ) : null;

  return (
    <Painel titulo={tarefa ? "Editar tarefa" : "Nova tarefa"} onFechar={onFechar} rodape={rodape}>
      <div className="space-y-3">
        {!podeEditar && <Aviso tipo="info">Só Dono e Editor criam ou editam tarefas. Você pode mudar o status das suas no quadro.</Aviso>}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {excluindo && <Confirmacao titulo="Excluir esta tarefa?" rotuloConfirmar="Excluir" carregando={pendente} onConfirmar={excluir} onCancelar={() => setExcluindo(false)} />}
        <fieldset disabled={!podeEditar} className="space-y-3">
          <CampoTexto rotulo="Título" required value={form.titulo} onChange={(e) => alterar({ titulo: e.target.value })} maxLength={200} placeholder="Ex.: Gravar depoimento da Carla" />
          <div className="grid grid-cols-2 gap-3">
            <CampoSelecao rotulo="Tipo" value={form.tipo} onChange={(e) => alterar({ tipo: e.target.value as TipoTarefa })}>
              {TIPOS_TAREFA.map((t) => <option key={t} value={t}>{t}</option>)}
            </CampoSelecao>
            <CampoSelecao rotulo="Prioridade" value={form.prioridade} onChange={(e) => alterar({ prioridade: e.target.value as Prioridade })}>
              {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
            </CampoSelecao>
          </div>
          <CampoSelecao rotulo="Responsável" value={form.responsavel_id} onChange={(e) => alterar({ responsavel_id: e.target.value })}>
            <option value="">Sem responsável</option>
            {membros.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </CampoSelecao>
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto rotulo="Prazo" type="date" value={form.prazo} onChange={(e) => alterar({ prazo: e.target.value })} className="tabular" />
            <CampoSelecao rotulo="Status" value={form.status} onChange={(e) => alterar({ status: e.target.value as StatusTarefa })}>
              {STATUS_TAREFA.map((s) => <option key={s} value={s}>{STATUS_TAREFA_ROTULO[s]}</option>)}
            </CampoSelecao>
          </div>
          <CampoSelecao rotulo="Conteúdo ligado" value={form.conteudo_id} onChange={(e) => alterar({ conteudo_id: e.target.value })} ajuda="Conteúdos de 30 dias atrás até 90 dias à frente.">
            <option value="">Nenhum</option>
            {conteudos.map((c) => <option key={c.id} value={c.id}>{formatarCurta(c.data)} · {c.formato} · {c.tema || "sem tema"}</option>)}
            {form.conteudo_id && !conteudos.some((c) => c.id === form.conteudo_id) && <option value={form.conteudo_id}>Conteúdo ligado (fora do período)</option>}
          </CampoSelecao>
        </fieldset>
      </div>
    </Painel>
  );
}
