"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { esquemaTarefa, type EntradaTarefa } from "@/lib/validacao/tarefa";
import type { Tarefa } from "@/lib/tipos/database";

type Erro = { ok: false; erro: string };

function mensagemErro(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return "Algo deu errado. Tente de novo.";
  if (e.code === "42501" || /row-level security|permission denied/i.test(e.message ?? "")) {
    return e.message && !/row-level security|permission denied/i.test(e.message) ? e.message : "Você não tem permissão para fazer isso.";
  }
  return e.message ?? "Algo deu errado. Tente de novo.";
}

function revalidar() {
  revalidatePath("/", "layout");
}

export async function salvarTarefa(empresaId: string, entrada: EntradaTarefa): Promise<{ ok: true; tarefa: Tarefa } | Erro> {
  const parse = esquemaTarefa.safeParse(entrada);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await criarClienteServidor();
  const { id, ...campos } = parse.data;
  const consulta = id
    ? supabase.from("tarefas").update(campos).eq("id", id).eq("empresa_id", empresaId).select("*")
    : supabase.from("tarefas").insert({ ...campos, empresa_id: empresaId, origem: "equipe" }).select("*");
  const { data, error } = await consulta;
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para editar esta tarefa." };
  revalidar();
  return { ok: true, tarefa: data[0] };
}

export async function mudarStatusTarefa(empresaId: string, id: string, status: Tarefa["status"]): Promise<{ ok: true; tarefa: Tarefa } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("tarefas").update({ status }).eq("id", id).eq("empresa_id", empresaId).select("*");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você só pode mudar o status das suas próprias tarefas." };
  revalidar();
  return { ok: true, tarefa: data[0] };
}

export async function excluirTarefa(empresaId: string, id: string): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("tarefas").delete().eq("id", id).eq("empresa_id", empresaId).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para excluir esta tarefa." };
  revalidar();
  return { ok: true };
}
