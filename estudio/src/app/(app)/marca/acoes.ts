"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { cifrar } from "@/lib/cripto";
import { testarConexao } from "@/lib/metricool/importar";
import { ESQUEMAS_SECOES, esquemaCampanha, esquemaIntegracao, type EntradaCampanha, type SecaoMarca } from "@/lib/validacao/empresa";
import type { Empresa } from "@/lib/tipos/database";
import { MENSAGEM_MIGRACAO_LINKEDIN, faltaMigracaoLinkedin } from "@/lib/redes";

type Erro = { ok: false; erro: string };

function mensagemErro(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return "Algo deu errado. Tente de novo.";
  if (faltaMigracaoLinkedin(e)) return MENSAGEM_MIGRACAO_LINKEDIN;
  if (e.code === "42501" || /row-level security|permission denied/i.test(e.message ?? "")) {
    return e.message && !/row-level security|permission denied/i.test(e.message) ? e.message : "Você não tem permissão para fazer isso.";
  }
  return e.message ?? "Algo deu errado. Tente de novo.";
}

/**
 * Salva uma seção da marca com bloqueio otimista: só grava se o registro
 * ainda estiver na versão (atualizado_em) que a tela carregou. Se outro
 * membro salvou antes, devolve a versão atual para a tela mesclar sem
 * perder o que estava sendo digitado.
 */
export async function atualizarMarca(
  empresaId: string,
  secao: SecaoMarca,
  dados: unknown,
  baseAtualizadoEm: string,
): Promise<{ ok: true; empresa: Empresa } | { ok: false; erro: string } | { ok: false; conflito: Empresa }> {
  const parse = ESQUEMAS_SECOES[secao].safeParse(dados);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("empresas")
    .update(parse.data)
    .eq("id", empresaId)
    .eq("atualizado_em", baseAtualizadoEm)
    .select("*");
  if (error) return { ok: false, erro: mensagemErro(error) };

  if (!data?.length) {
    const { data: atual } = await supabase.from("empresas").select("*").eq("id", empresaId).maybeSingle();
    if (!atual) return { ok: false, erro: "Empresa não encontrada ou sem permissão." };
    if (atual.atualizado_em !== baseAtualizadoEm) return { ok: false, conflito: atual };
    return { ok: false, erro: "Você não tem permissão para editar a marca." };
  }

  revalidatePath("/", "layout");
  return { ok: true, empresa: data[0] };
}

// ---------------- Campanhas ----------------

export async function salvarCampanha(empresaId: string, entrada: EntradaCampanha): Promise<{ ok: true; id: string } | Erro> {
  const parse = esquemaCampanha.safeParse(entrada);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await criarClienteServidor();
  const { id, ...campos } = parse.data;
  const consulta = id
    ? supabase.from("campanhas").update(campos).eq("id", id).eq("empresa_id", empresaId).select("id")
    : supabase.from("campanhas").insert({ ...campos, empresa_id: empresaId }).select("id");
  const { data, error } = await consulta;
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para editar campanhas." };
  revalidatePath("/marca");
  return { ok: true, id: data[0].id };
}

export async function excluirCampanha(empresaId: string, id: string): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("campanhas").delete().eq("id", id).eq("empresa_id", empresaId).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para excluir campanhas." };
  revalidatePath("/marca");
  return { ok: true };
}

// ---------------- Integração Metricool (só Dono) ----------------

export async function salvarIntegracao(
  empresaId: string,
  entrada: { metricool_user_id?: string; metricool_brand_id?: string; metricool_token?: string },
): Promise<{ ok: true; tokenFinal: string | null } | Erro> {
  const parse = esquemaIntegracao.safeParse(entrada);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await criarClienteServidor();

  const campos: { metricool_user_id: string | null; metricool_brand_id: string | null; metricool_token_cifrado?: string } = {
    metricool_user_id: parse.data.metricool_user_id,
    metricool_brand_id: parse.data.metricool_brand_id,
  };
  if (parse.data.metricool_token) {
    try {
      campos.metricool_token_cifrado = cifrar(parse.data.metricool_token);
    } catch (e) {
      return { ok: false, erro: (e as Error).message.includes("ESTUDIO_CRYPTO_KEY") ? "Falta configurar ESTUDIO_CRYPTO_KEY no servidor para guardar o token com segurança." : "Não foi possível proteger o token." };
    }
  }

  const { data, error } = await supabase.from("empresas_integracoes").upsert({ empresa_id: empresaId, ...campos }, { onConflict: "empresa_id" }).select("empresa_id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Somente o dono configura a integração." };
  revalidatePath("/marca");
  return { ok: true, tokenFinal: parse.data.metricool_token ? parse.data.metricool_token.slice(-4) : null };
}

export async function testarConexaoMetricool(empresaId: string): Promise<{ ok: true; marca: { label: string; id: number; instagram: string | null; timezone?: string } } | Erro> {
  const supabase = await criarClienteServidor();
  try {
    const marca = await testarConexao(supabase, empresaId);
    return { ok: true, marca: { label: marca.label, id: marca.id, instagram: marca.instagram ?? null, timezone: marca.timezone } };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function removerTokenMetricool(empresaId: string): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("empresas_integracoes").update({ metricool_token_cifrado: null }).eq("empresa_id", empresaId).select("empresa_id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Somente o dono configura a integração." };
  revalidatePath("/marca");
  return { ok: true };
}
