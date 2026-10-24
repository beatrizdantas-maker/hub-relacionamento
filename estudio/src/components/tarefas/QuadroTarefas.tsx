"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Pencil, Plus, User } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Selo } from "@/components/ui/Selo";
import { formatarCurta, somarDias } from "@/lib/datas";
import { permissoes } from "@/lib/papeis";
import { mudarStatusTarefa } from "@/app/(app)/tarefas/acoes";
import type { Papel, StatusTarefa, Tarefa } from "@/lib/tipos/database";
import { EditorTarefa, type ConteudoOpcao, type MembroOpcao } from "./EditorTarefa";
import { FILTROS_TAREFA, PRIORIDADE_TOM, STATUS_TAREFA_ROTULO, type FiltroTarefa } from "./rotulos";

const COLUNAS: StatusTarefa[] = ["pendente", "em_producao", "aguardando", "concluido"];

export interface QuadroProps {
  empresaId: string;
  papel: Papel;
  usuarioId: string;
  hoje: string;
  segunda: string;
  filtro: FiltroTarefa;
  responsavel: string;        // "" = todos, "sem" = sem responsável, ou user_id
  abrir: string | null;       // "nova" ou id da tarefa
  tarefas: Tarefa[];
  membros: MembroOpcao[];
  conteudos: ConteudoOpcao[];
}

export function QuadroTarefas(p: QuadroProps) {
  const router = useRouter();
  const podeEditar = permissoes.podeEditar(p.papel);
  const [selecao, setSelecao] = useState<{ tipo: "nova" } | { tipo: "editar"; id: string } | null>(() =>
    p.abrir === "nova" ? { tipo: "nova" } : p.abrir && p.tarefas.some((t) => t.id === p.abrir) ? { tipo: "editar", id: p.abrir } : null,
  );
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [otimista, setOtimista] = useState<Record<string, StatusTarefa>>({});
  const fechar = useCallback(() => setSelecao(null), []);
  const nomeDe = (id: string | null) => (id ? p.membros.find((m) => m.id === id)?.nome ?? "Membro" : null);
  const domingo = somarDias(p.segunda, 6);

  const filtradas = useMemo(() => {
    const comStatus = p.tarefas.map((t) => ({ ...t, status: otimista[t.id] ?? t.status }));
    return comStatus.filter((t) => {
      const aberta = t.status !== "concluido";
      const atrasada = aberta && !!t.prazo && t.prazo < p.hoje;
      if (p.responsavel === "sem" && t.responsavel_id) return false;
      if (p.responsavel && p.responsavel !== "sem" && t.responsavel_id !== p.responsavel) return false;
      switch (p.filtro) {
        case "hoje": return aberta && (t.prazo === p.hoje || atrasada);
        case "atrasadas": return atrasada;
        case "semana": return aberta && !!t.prazo && t.prazo >= p.segunda && t.prazo <= domingo;
        case "abertas": return aberta;
        case "entregues": return !aberta;
      }
    });
  }, [p.tarefas, p.filtro, p.responsavel, p.hoje, p.segunda, domingo, otimista]);

  const contagens = useMemo(() => {
    const abertas = p.tarefas.filter((t) => (otimista[t.id] ?? t.status) !== "concluido");
    return {
      hoje: abertas.filter((t) => t.prazo === p.hoje || (!!t.prazo && t.prazo < p.hoje)).length,
      atrasadas: abertas.filter((t) => !!t.prazo && t.prazo < p.hoje).length,
      semana: abertas.filter((t) => !!t.prazo && t.prazo >= p.segunda && t.prazo <= domingo).length,
      abertas: abertas.length,
      entregues: p.tarefas.length - abertas.length,
    } as Record<FiltroTarefa, number>;
  }, [p.tarefas, p.hoje, p.segunda, domingo, otimista]);

  const url = (q: Partial<{ filtro: string; responsavel: string }>) => {
    const sp = new URLSearchParams();
    const f = q.filtro ?? p.filtro;
    const r = q.responsavel ?? p.responsavel;
    if (f !== "abertas") sp.set("filtro", f);
    if (r) sp.set("responsavel", r);
    const s = sp.toString();
    return `/tarefas${s ? `?${s}` : ""}`;
  };

  const podeMudar = (t: Tarefa) => podeEditar || (p.papel === "colaborador" && t.responsavel_id === p.usuarioId);

  function mudarStatus(t: Tarefa, status: StatusTarefa) {
    setErro(null);
    setOtimista((o) => ({ ...o, [t.id]: status }));
    iniciar(async () => {
      const r = await mudarStatusTarefa(p.empresaId, t.id, status);
      if (!r.ok) {
        setOtimista((o) => { const c = { ...o }; delete c[t.id]; return c; });
        setErro(r.erro);
        return;
      }
      router.refresh();
    });
  }

  const tarefaSelecionada = selecao?.tipo === "editar" ? p.tarefas.find((t) => t.id === selecao.id) ?? null : null;
  const colunasVisiveis = p.filtro === "entregues" ? (["concluido"] as StatusTarefa[]) : COLUNAS;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tarefas</h1>
          <p className="mt-1 text-sm text-texto-2">
            {contagens.abertas} {contagens.abertas === 1 ? "aberta" : "abertas"}
            {contagens.atrasadas > 0 && <> · <span className="font-medium text-atrasado">{contagens.atrasadas} {contagens.atrasadas === 1 ? "atrasada" : "atrasadas"}</span></>}
          </p>
        </div>
        {podeEditar && (
          <Botao onClick={() => setSelecao({ tipo: "nova" })}>
            <Plus className="h-5 w-5" aria-hidden /> Nova tarefa
          </Botao>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por prazo">
          {FILTROS_TAREFA.map((f) => (
            <Link key={f.chave} href={url({ filtro: f.chave })} aria-current={p.filtro === f.chave ? "true" : undefined}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${p.filtro === f.chave ? "border-primaria bg-primaria/10 text-primaria" : "border-borda text-texto-2 hover:bg-superficie-2"} ${f.chave === "atrasadas" && contagens.atrasadas > 0 && p.filtro !== "atrasadas" ? "text-atrasado" : ""}`}>
              {f.rotulo} <span className="tabular opacity-70">{contagens[f.chave]}</span>
            </Link>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-texto-3" aria-hidden />
          <span className="sr-only">Responsável</span>
          <select className="campo h-9 w-auto py-1 text-sm" value={p.responsavel} onChange={(e) => router.push(url({ responsavel: e.target.value }))}>
            <option value="">Todos os responsáveis</option>
            <option value={p.usuarioId}>Minhas tarefas</option>
            <option value="sem">Sem responsável</option>
            {p.membros.filter((m) => m.id !== p.usuarioId).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </label>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {filtradas.length === 0 ? (
        <div className="cartao border-dashed text-center text-sm text-texto-2">
          {p.filtro === "atrasadas" ? "Nenhuma tarefa atrasada. Boa!" : p.filtro === "entregues" ? "Nenhuma tarefa entregue nos últimos 60 dias." : "Nenhuma tarefa aqui."}{" "}
          {podeEditar && p.filtro !== "entregues" && "Crie uma tarefa ou gere as tarefas padrão de um conteúdo no Calendário."}
        </div>
      ) : (
        <div className={`grid gap-3 ${colunasVisiveis.length === 1 ? "" : "md:grid-cols-2 xl:grid-cols-4"}`}>
          {colunasVisiveis.map((status) => {
            const doStatus = filtradas.filter((t) => t.status === status);
            return (
              <section key={status} aria-label={STATUS_TAREFA_ROTULO[status]} className="rounded-2xl border border-borda bg-superficie/50 p-2">
                <h2 className="flex items-center justify-between px-1 py-1 text-sm font-semibold">
                  {STATUS_TAREFA_ROTULO[status]} <span className="text-xs font-normal text-texto-3 tabular">{doStatus.length}</span>
                </h2>
                {doStatus.length === 0 ? (
                  <p className="px-1 py-3 text-center text-xs text-texto-3">Nada aqui</p>
                ) : (
                  <ul className="space-y-2">
                    {doStatus.map((t) => {
                      const atrasada = t.status !== "concluido" && !!t.prazo && t.prazo < p.hoje;
                      const conteudo = t.conteudo_id ? p.conteudos.find((c) => c.id === t.conteudo_id) : null;
                      const editavel = podeMudar(t);
                      return (
                        <li key={t.id} className={`rounded-xl border bg-superficie p-2.5 shadow-sm ${atrasada ? "border-atrasado/50" : "border-borda"}`}>
                          <div className="flex items-start gap-2">
                            <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" aria-label={`Concluir ${t.titulo}`} checked={t.status === "concluido"} disabled={!editavel || pendente}
                              onChange={(e) => mudarStatus(t, e.target.checked ? "concluido" : "pendente")} />
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className={`text-sm font-medium ${t.status === "concluido" ? "text-texto-3 line-through" : ""}`}>{t.titulo}</p>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-texto-2">
                                <Selo tom={PRIORIDADE_TOM[t.prioridade]}>{t.prioridade}</Selo>
                                <span className="text-texto-3">{t.tipo}</span>
                                {t.responsavel_id && <span className="inline-flex items-center gap-0.5"><User className="h-3 w-3" aria-hidden /> {nomeDe(t.responsavel_id)}</span>}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                {t.prazo ? (
                                  <span className={`inline-flex items-center gap-0.5 tabular ${atrasada ? "font-medium text-atrasado" : "text-texto-2"}`}>
                                    <CalendarDays className="h-3 w-3" aria-hidden /> {formatarCurta(t.prazo)}
                                  </span>
                                ) : <span className="text-texto-3">sem prazo</span>}
                                {atrasada && <Selo tom="atrasado">Atrasada</Selo>}
                                {t.status === "concluido" && t.concluido_em && <span className="text-texto-3">entregue {formatarCurta(t.concluido_em.slice(0, 10))}</span>}
                                {conteudo && (
                                  <Link href={`/calendario?dia=${conteudo.data}&abrir=${conteudo.id}`} className="truncate text-primaria underline-offset-2 hover:underline">
                                    {conteudo.formato} · {conteudo.tema || "sem tema"}
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-1">
                            <label className="flex-1">
                              <span className="sr-only">Status de {t.titulo}</span>
                              <select className="campo h-8 py-0 text-xs" value={t.status} disabled={!editavel || pendente} onChange={(e) => mudarStatus(t, e.target.value as StatusTarefa)}>
                                {COLUNAS.map((s) => <option key={s} value={s}>{STATUS_TAREFA_ROTULO[s]}</option>)}
                              </select>
                            </label>
                            {podeEditar && (
                              <button type="button" onClick={() => setSelecao({ tipo: "editar", id: t.id })} className="rounded-lg p-1.5 text-texto-2 hover:bg-superficie-2" aria-label={`Editar ${t.titulo}`}>
                                <Pencil className="h-4 w-4" aria-hidden />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {selecao && (
        <EditorTarefa
          key={selecao.tipo === "editar" ? selecao.id : "nova"}
          empresaId={p.empresaId}
          tarefa={tarefaSelecionada}
          padrao={{ responsavel_id: p.responsavel && p.responsavel !== "sem" ? p.responsavel : "", prazo: p.filtro === "hoje" ? p.hoje : "" }}
          membros={p.membros}
          conteudos={p.conteudos}
          podeEditar={podeEditar}
          onFechar={fechar}
        />
      )}
    </div>
  );
}
