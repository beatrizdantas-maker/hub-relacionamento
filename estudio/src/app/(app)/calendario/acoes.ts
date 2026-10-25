"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { esquemaConteudo, esquemaStory, type EntradaConteudo, type EntradaStory } from "@/lib/validacao/conteudo";
import { gerarTarefasPadrao } from "@/lib/tarefasPadrao";
import { hojeNaEmpresa, somarDias } from "@/lib/datas";
import { deslocarPrazos } from "@/lib/reagendar";
import type { Conteudo, Story, Tarefa, TelaStory } from "@/lib/tipos/database";

type Erro = { ok: false; erro: string };

function mensagemErro(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return "Algo deu errado. Tente de novo.";
  if (e.code === "42501" || /row-level security|permission denied/i.test(e.message ?? "")) {
    return e.message && !/row-level security|permission denied/i.test(e.message) ? e.message : "Você não tem permissão para fazer isso.";
  }
  return e.message ?? "Algo deu errado. Tente de novo.";
}

async function fusoDaEmpresa(empresaId: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("empresas").select("fuso_horario").eq("id", empresaId).maybeSingle();
  return data?.fuso_horario ?? "America/Sao_Paulo";
}

function revalidar() {
  revalidatePath("/calendario");
  revalidatePath("/");
  revalidatePath("/tarefas");
}

// ---------------- Conteúdos ----------------

/**
 * Cria ou atualiza um conteúdo. Mudar a data é reagendar: as tarefas ligadas
 * continuam ligadas e os prazos das tarefas abertas deslocam junto (nunca
 * para antes de hoje).
 */
export async function salvarConteudo(
  empresaId: string,
  entrada: EntradaConteudo,
  opcoes: { criarTarefasPadrao?: boolean } = {},
): Promise<{ ok: true; conteudo: Conteudo; reagendadoDe: string | null; tarefasCriadas: number } | Erro> {
  const parse = esquemaConteudo.safeParse(entrada);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await criarClienteServidor();
  const { id, ...campos } = parse.data;

  let reagendadoDe: string | null = null;
  let conteudo: Conteudo;

  if (id) {
    const { data: anterior } = await supabase.from("conteudos").select("data").eq("id", id).eq("empresa_id", empresaId).maybeSingle();
    if (!anterior) return { ok: false, erro: "Conteúdo não encontrado." };
    const { data, error } = await supabase.from("conteudos").update(campos).eq("id", id).eq("empresa_id", empresaId).select("*");
    if (error) return { ok: false, erro: mensagemErro(error) };
    if (!data?.length) return { ok: false, erro: "Você não tem permissão para editar este conteúdo." };
    conteudo = data[0];
    if (anterior.data !== conteudo.data) {
      reagendadoDe = anterior.data;
      const hoje = hojeNaEmpresa(await fusoDaEmpresa(empresaId));
      const { data: tarefas } = await supabase.from("tarefas").select("id, prazo, status").eq("conteudo_id", id);
      for (const t of deslocarPrazos(tarefas ?? [], anterior.data, conteudo.data, hoje)) {
        await supabase.from("tarefas").update({ prazo: t.prazo }).eq("id", t.id);
      }
    }
  } else {
    const { data, error } = await supabase.from("conteudos").insert({ ...campos, empresa_id: empresaId, origem: "equipe" }).select("*");
    if (error) return { ok: false, erro: mensagemErro(error) };
    if (!data?.length) return { ok: false, erro: "Você não tem permissão para criar conteúdo." };
    conteudo = data[0];
  }

  let tarefasCriadas = 0;
  if (opcoes.criarTarefasPadrao) {
    const r = await criarTarefasPadrao(empresaId, conteudo.id);
    if (r.ok) tarefasCriadas = r.criadas;
  }

  revalidar();
  return { ok: true, conteudo, reagendadoDe, tarefasCriadas };
}

export async function mudarStatusConteudo(empresaId: string, id: string, status: Conteudo["status"]): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("conteudos").update({ status }).eq("id", id).eq("empresa_id", empresaId).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para mudar o status." };
  revalidar();
  return { ok: true };
}

export async function excluirConteudo(empresaId: string, id: string): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("conteudos").delete().eq("id", id).eq("empresa_id", empresaId).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para excluir este conteúdo." };
  revalidar();
  return { ok: true };
}

/** Aprova todas as sugestões (conteúdos e stories) de uma semana. */
export async function aprovarSugestoesDaSemana(empresaId: string, segunda: string): Promise<{ ok: true; aprovados: number } | Erro> {
  const supabase = await criarClienteServidor();
  const domingo = somarDias(segunda, 6);
  const [c, s] = await Promise.all([
    supabase.from("conteudos").update({ status: "aprovado" }).eq("empresa_id", empresaId).eq("status", "sugestao").gte("data", segunda).lte("data", domingo).select("id"),
    supabase.from("stories").update({ status: "aprovado" }).eq("empresa_id", empresaId).eq("status", "sugestao").gte("data", segunda).lte("data", domingo).select("id"),
  ]);
  if (c.error) return { ok: false, erro: mensagemErro(c.error) };
  if (s.error) return { ok: false, erro: mensagemErro(s.error) };
  revalidar();
  return { ok: true, aprovados: (c.data?.length ?? 0) + (s.data?.length ?? 0) };
}

/** Cria as tarefas padrão de um conteúdo (não duplica as que já existem com o mesmo título). */
export async function criarTarefasPadrao(empresaId: string, conteudoId: string): Promise<{ ok: true; criadas: number; tarefas: Tarefa[] } | Erro> {
  const supabase = await criarClienteServidor();
  const { data: conteudo } = await supabase.from("conteudos").select("id, formato, tipo, data, tema").eq("id", conteudoId).eq("empresa_id", empresaId).maybeSingle();
  if (!conteudo) return { ok: false, erro: "Conteúdo não encontrado." };
  const hoje = hojeNaEmpresa(await fusoDaEmpresa(empresaId));
  const padrao = gerarTarefasPadrao({ formato: conteudo.formato, tipo: conteudo.tipo, data: conteudo.data, hoje, tema: conteudo.tema });
  const { data: existentes } = await supabase.from("tarefas").select("titulo").eq("conteudo_id", conteudoId);
  const jaTem = new Set((existentes ?? []).map((t) => t.titulo));
  const novas = padrao.filter((t) => !jaTem.has(t.titulo));
  if (novas.length === 0) {
    const { data: todas } = await supabase.from("tarefas").select("*").eq("conteudo_id", conteudoId).order("prazo");
    return { ok: true, criadas: 0, tarefas: todas ?? [] };
  }
  const { error } = await supabase.from("tarefas").insert(novas.map((t) => ({ ...t, empresa_id: empresaId, conteudo_id: conteudoId, origem: "equipe" as const })));
  if (error) return { ok: false, erro: mensagemErro(error) };
  const { data: todas } = await supabase.from("tarefas").select("*").eq("conteudo_id", conteudoId).order("prazo");
  revalidar();
  return { ok: true, criadas: novas.length, tarefas: todas ?? [] };
}

export async function mudarStatusTarefa(empresaId: string, id: string, status: Tarefa["status"]): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("tarefas").update({ status }).eq("id", id).eq("empresa_id", empresaId).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você só pode mudar o status das suas próprias tarefas." };
  revalidar();
  return { ok: true };
}

// ---------------- Stories ----------------

export async function salvarStory(empresaId: string, entrada: EntradaStory): Promise<{ ok: true; story: Story } | Erro> {
  const parse = esquemaStory.safeParse(entrada);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await criarClienteServidor();
  const { id, ...campos } = parse.data;
  const telas = campos.telas as TelaStory[];
  const consulta = id
    ? supabase.from("stories").update({ ...campos, telas }).eq("id", id).eq("empresa_id", empresaId).select("*")
    : supabase.from("stories").insert({ ...campos, telas, empresa_id: empresaId, origem: "equipe" }).select("*");
  const { data, error } = await consulta;
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para editar stories." };
  revalidar();
  return { ok: true, story: data[0] };
}

export async function mudarStatusStory(empresaId: string, id: string, status: Story["status"]): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("stories").update({ status }).eq("id", id).eq("empresa_id", empresaId).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para mudar o status." };
  revalidar();
  return { ok: true };
}

export async function excluirStory(empresaId: string, id: string): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("stories").delete().eq("id", id).eq("empresa_id", empresaId).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para excluir stories." };
  revalidar();
  return { ok: true };
}
