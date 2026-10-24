"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { esquemaMetricaSemanal, esquemaResultadoPost, type EntradaMetricaSemanal, type EntradaResultadoPost } from "@/lib/validacao/metricas";
import { diasEntre, hojeNaEmpresa, inicioDaSemana } from "@/lib/datas";
import type { MetricaSemanal, ResultadoPost } from "@/lib/tipos/database";

type Erro = { ok: false; erro: string };

function mensagemErro(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return "Algo deu errado. Tente de novo.";
  if (e.code === "42501" || /row-level security|permission denied/i.test(e.message ?? "")) {
    return e.message && !/row-level security|permission denied/i.test(e.message) ? e.message : "Você não tem permissão para fazer isso.";
  }
  return e.message ?? "Algo deu errado. Tente de novo.";
}

function revalidar() {
  revalidatePath("/painel");
  revalidatePath("/");
  revalidatePath("/sugestoes");
}

/**
 * Registro manual de uma semana. Se a semana já veio do Metricool, mantém a
 * fonte e marca editado_manual; cliques no link e mensagens no direct são
 * sempre manuais.
 */
export async function salvarMetricaSemanal(empresaId: string, entrada: EntradaMetricaSemanal): Promise<{ ok: true; metrica: MetricaSemanal } | Erro> {
  const parse = esquemaMetricaSemanal.safeParse(entrada);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await criarClienteServidor();
  const { data: empresa } = await supabase.from("empresas").select("fuso_horario").eq("id", empresaId).maybeSingle();
  const hoje = hojeNaEmpresa(empresa?.fuso_horario);
  const semana = inicioDaSemana(parse.data.semana);
  if (semana > hoje) return { ok: false, erro: "Não dá para registrar uma semana que ainda não começou." };

  const { data: existente } = await supabase.from("metricas_semanais").select("fonte").eq("empresa_id", empresaId).eq("semana", semana).maybeSingle();
  const diasPassados = Math.min(7, Math.max(0, diasEntre(semana, hoje) + 1));
  const { semana: _s, ...campos } = parse.data;
  void _s;
  const linha = {
    empresa_id: empresaId,
    semana,
    ...campos,
    fonte: existente?.fonte ?? ("manual" as const),
    editado_manual: existente?.fonte === "metricool",
    dias_com_dados: diasPassados,
    ultimo_dia: diasPassados > 0 ? (diasPassados === 7 ? undefined : hoje) : undefined,
  };
  const { data, error } = await supabase.from("metricas_semanais").upsert(linha, { onConflict: "empresa_id,semana" }).select("*");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para registrar métricas." };
  revalidar();
  return { ok: true, metrica: data[0] };
}

export async function excluirMetricaSemanal(empresaId: string, semana: string): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("metricas_semanais").delete().eq("empresa_id", empresaId).eq("semana", semana).select("semana");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para excluir registros." };
  revalidar();
  return { ok: true };
}

export async function salvarResultadoPost(empresaId: string, entrada: EntradaResultadoPost): Promise<{ ok: true; resultado: ResultadoPost } | Erro> {
  const parse = esquemaResultadoPost.safeParse(entrada);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await criarClienteServidor();
  const { id, ...campos } = parse.data;
  const interacoes = campos.interacoes ?? ((campos.curtidas ?? campos.comentarios ?? campos.salvamentos ?? campos.compartilhamentos) != null
    ? (campos.curtidas ?? 0) + (campos.comentarios ?? 0) + (campos.salvamentos ?? 0) + (campos.compartilhamentos ?? 0)
    : null);
  const publicado_em = campos.publicado_em.length === 10 ? `${campos.publicado_em}T12:00:00` : campos.publicado_em;
  const linha = { ...campos, publicado_em, interacoes };
  const consulta = id
    ? supabase.from("resultados_posts").update(linha).eq("id", id).eq("empresa_id", empresaId).select("*")
    : supabase.from("resultados_posts").insert({ ...linha, empresa_id: empresaId, fonte: "manual" }).select("*");
  const { data, error } = await consulta;
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para registrar resultados." };
  revalidar();
  return { ok: true, resultado: data[0] };
}

export async function excluirResultadoPost(empresaId: string, id: string): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("resultados_posts").delete().eq("id", id).eq("empresa_id", empresaId).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para excluir resultados." };
  revalidar();
  return { ok: true };
}
