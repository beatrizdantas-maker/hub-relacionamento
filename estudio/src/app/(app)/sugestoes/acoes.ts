"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { gerarTarefasPadrao } from "@/lib/tarefasPadrao";
import { diaDaSemana, ehDataISO, hojeNaEmpresa } from "@/lib/datas";
import type { IdeiaSugestao, RitmoDia } from "@/lib/tipos/database";

type Erro = { ok: false; erro: string };

function revalidar() {
  revalidatePath("/sugestoes");
  revalidatePath("/calendario");
  revalidatePath("/tarefas");
  revalidatePath("/");
}

/**
 * Transforma uma ideia da sugestão em item do calendário: entra como sugestão
 * da IA (status "sugestao", origem "ia"), com as tarefas padrão do formato.
 */
export async function adicionarIdeiaAoCalendario(
  empresaId: string,
  sugestaoId: string,
  indice: number,
  data: string,
): Promise<{ ok: true; conteudoId: string; tarefas: number } | Erro> {
  if (!ehDataISO(data)) return { ok: false, erro: "Escolha uma data válida." };
  const supabase = await criarClienteServidor();
  const [{ data: sugestao }, { data: empresa }] = await Promise.all([
    supabase.from("sugestoes").select("id, ideias").eq("id", sugestaoId).eq("empresa_id", empresaId).maybeSingle(),
    supabase.from("empresas").select("fuso_horario, ritmo_semanal").eq("id", empresaId).maybeSingle(),
  ]);
  if (!sugestao || !empresa) return { ok: false, erro: "Sugestão não encontrada." };
  const ideias = (sugestao.ideias ?? []) as IdeiaSugestao[];
  const ideia = ideias[indice];
  if (!ideia) return { ok: false, erro: "Ideia não encontrada." };
  if (ideia.conteudo_id) return { ok: false, erro: "Esta ideia já está no calendário." };
  const hoje = hojeNaEmpresa(empresa.fuso_horario);
  if (data < hoje) return { ok: false, erro: "A data não pode ser antes de hoje." };

  const slot = ((empresa.ritmo_semanal ?? []) as RitmoDia[]).find((r) => r.dia === diaDaSemana(data) && r.formato === ideia.formato);
  const { data: conteudo, error } = await supabase
    .from("conteudos")
    .insert({
      empresa_id: empresaId,
      data,
      hora: slot?.hora ?? null,
      formato: ideia.formato,
      tipo: slot?.tipo ?? null,
      pilar: slot?.pilar ?? null,
      tema: ideia.titulo.slice(0, 200),
      objetivo: slot?.objetivo ?? null,
      legenda: ideia.legenda,
      cta: ideia.cta.slice(0, 300),
      notas: `Sugestão da IA para a semana: ${ideia.motivo}`,
      status: "sugestao",
      origem: "ia",
    })
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, erro: error.code === "42501" ? "Você não tem permissão para adicionar ao calendário." : error.message };
  if (!conteudo) return { ok: false, erro: "Não foi possível criar o conteúdo." };

  const tarefas = gerarTarefasPadrao({ formato: ideia.formato, tipo: slot?.tipo, data, hoje, tema: ideia.titulo });
  const { error: erroTarefas } = await supabase.from("tarefas").insert(tarefas.map((t) => ({ ...t, empresa_id: empresaId, conteudo_id: conteudo.id, origem: "ia" as const })));

  const novas = ideias.map((i, n) => (n === indice ? { ...i, dia: data, conteudo_id: conteudo.id } : i));
  await supabase.from("sugestoes").update({ ideias: novas }).eq("id", sugestaoId).eq("empresa_id", empresaId);

  revalidar();
  return { ok: true, conteudoId: conteudo.id, tarefas: erroTarefas ? 0 : tarefas.length };
}

export async function excluirSugestao(empresaId: string, sugestaoId: string): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("sugestoes").delete().eq("id", sugestaoId).eq("empresa_id", empresaId).select("id");
  if (error) return { ok: false, erro: error.message };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para excluir sugestões." };
  revalidar();
  return { ok: true };
}
