"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { criarClienteServidor } from "@/lib/supabase/server";
import { esquemaConvite, esquemaEmpresa, type EntradaEmpresa } from "@/lib/validacao/empresa";
import type { Json, Papel } from "@/lib/tipos/database";

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

/** Traduz erros do Postgres/RLS em mensagens claras. */
function mensagemErro(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return "Algo deu errado. Tente de novo.";
  if (e.code === "42501" || /row-level security/i.test(e.message ?? "")) {
    return e.message && !/row-level security|permission denied/i.test(e.message)
      ? e.message
      : "Você não tem permissão para fazer isso.";
  }
  if (e.code === "23505") return "Já existe um registro igual.";
  return e.message ?? "Algo deu errado. Tente de novo.";
}

async function urlBase() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || `${proto}://${host}`;
}

function revalidarTudo() {
  revalidatePath("/", "layout");
}

// ---------------- Empresas ----------------

export async function criarEmpresa(entrada: EntradaEmpresa): Promise<Resultado<{ id: string }>> {
  const parse = esquemaEmpresa.safeParse(entrada);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("criar_empresa", { p_dados: parse.data as unknown as Json });
  if (error || !data) return { ok: false, erro: mensagemErro(error) };
  revalidarTudo();
  return { ok: true, id: data };
}

export async function atualizarEmpresa(id: string, entrada: EntradaEmpresa): Promise<Resultado> {
  const parse = esquemaEmpresa.safeParse(entrada);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("empresas").update(parse.data).eq("id", id).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para editar esta empresa." };
  revalidarTudo();
  return { ok: true };
}

export async function arquivarEmpresa(id: string, arquivada: boolean): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("empresas").update({ arquivada }).eq("id", id).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Somente o dono pode arquivar a empresa." };
  revalidarTudo();
  return { ok: true };
}

export async function excluirEmpresa(id: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("empresas").delete().eq("id", id).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Somente o dono pode excluir a empresa." };
  revalidarTudo();
  return { ok: true };
}

export async function definirEmpresaAtiva(id: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await supabase.from("perfis").update({ empresa_ativa_id: id }).eq("id", user.id);
  if (error) return { ok: false, erro: mensagemErro(error) };
  revalidarTudo();
  return { ok: true };
}

// ---------------- Membros e convites ----------------

export async function convidarMembro(
  empresaId: string,
  entrada: { email: string; papel: Papel },
): Promise<Resultado<{ link: string; emailEnviado: boolean }>> {
  const parse = esquemaConvite.safeParse(entrada);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await criarClienteServidor();

  // Já é membro?
  const { data: existente } = await supabase.from("membros").select("user_id").eq("empresa_id", empresaId).eq("email", parse.data.email).maybeSingle();
  if (existente) return { ok: false, erro: "Essa pessoa já faz parte da equipe." };

  const { data, error } = await supabase
    .from("convites")
    .insert({ empresa_id: empresaId, email: parse.data.email, papel: parse.data.papel })
    .select("token")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { ok: false, erro: "Já existe um convite pendente para esse e-mail." };
    return { ok: false, erro: mensagemErro(error) };
  }

  const link = `${await urlBase()}/convite/${data.token}`;

  // Envia o e-mail pelo próprio Supabase (link de acesso que cai direto na página do convite).
  let emailEnviado = false;
  const { error: erroEmail } = await supabase.auth.signInWithOtp({
    email: parse.data.email,
    options: { shouldCreateUser: true, emailRedirectTo: `${await urlBase()}/auth/callback?proximo=${encodeURIComponent(`/convite/${data.token}`)}` },
  });
  emailEnviado = !erroEmail;

  revalidatePath(`/empresas/${empresaId}/membros`);
  return { ok: true, link, emailEnviado };
}

export async function revogarConvite(empresaId: string, conviteId: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("convites").delete().eq("id", conviteId).eq("empresa_id", empresaId);
  if (error) return { ok: false, erro: mensagemErro(error) };
  revalidatePath(`/empresas/${empresaId}/membros`);
  return { ok: true };
}

export async function alterarPapel(empresaId: string, userId: string, papel: Papel): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("membros").update({ papel }).eq("empresa_id", empresaId).eq("user_id", userId).select("user_id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Somente o dono altera papéis." };
  revalidarTudo();
  return { ok: true };
}

export async function removerMembro(empresaId: string, userId: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("membros").delete().eq("empresa_id", empresaId).eq("user_id", userId).select("user_id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Não foi possível remover. Só o dono remove membros." };
  revalidarTudo();
  return { ok: true };
}

export async function atualizarMeuNome(empresaId: string, nome: string): Promise<Resultado> {
  const limpo = nome.trim().slice(0, 80);
  if (!limpo) return { ok: false, erro: "Informe um nome." };
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada." };
  const { error } = await supabase.from("membros").update({ nome_exibicao: limpo }).eq("empresa_id", empresaId).eq("user_id", user.id);
  if (error) return { ok: false, erro: mensagemErro(error) };
  await supabase.from("perfis").update({ nome: limpo }).eq("id", user.id);
  revalidarTudo();
  return { ok: true };
}

export async function aceitarConvite(token: string): Promise<Resultado<{ empresaId: string }>> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("aceitar_convite", { p_token: token });
  if (error || !data) return { ok: false, erro: mensagemErro(error) };
  revalidarTudo();
  return { ok: true, empresaId: data };
}
