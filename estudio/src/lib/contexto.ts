import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Empresa, Papel, Perfil } from "@/lib/tipos/database";

export interface EmpresaDoUsuario extends Empresa {
  papel: Papel;
}

export interface Contexto {
  usuario: { id: string; email: string; nome: string | null };
  perfil: Perfil | null;
  empresas: EmpresaDoUsuario[];           // todas (ativas e arquivadas) em que é membro
  empresaAtiva: EmpresaDoUsuario | null;  // a selecionada no topo
  papel: Papel | null;                    // papel na empresa ativa
}

/**
 * Contexto de uma requisição autenticada: usuário, perfil, empresas e a
 * empresa ativa. Em cache por requisição (React cache) para que layout e
 * página não repitam as consultas.
 */
export const obterContexto = cache(async (): Promise<Contexto> => {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // Garante o perfil (usuários anteriores ao Estúdio não passaram pelo trigger de auth.users).
  let { data: perfil } = await supabase.from("perfis").select("*").eq("id", user.id).maybeSingle();
  if (!perfil) {
    const nome =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email?.split("@")[0] ??
      null;
    const { data: criado } = await supabase
      .from("perfis")
      .upsert({ id: user.id, nome, email: user.email ?? null }, { onConflict: "id", ignoreDuplicates: true })
      .select("*")
      .maybeSingle();
    perfil = criado;
  }

  const { data: vinculos } = await supabase.from("membros").select("empresa_id, papel").eq("user_id", user.id);
  const ids = (vinculos ?? []).map((v) => v.empresa_id);
  const { data: linhas } = ids.length ? await supabase.from("empresas").select("*").in("id", ids) : { data: [] };
  const papelPor = new Map((vinculos ?? []).map((v) => [v.empresa_id, v.papel]));

  const empresas: EmpresaDoUsuario[] = (linhas ?? [])
    .map((e) => ({ ...e, papel: papelPor.get(e.id) ?? "leitor" }))
    .sort((a, b) => Number(a.arquivada) - Number(b.arquivada) || a.nome.localeCompare(b.nome, "pt-BR"));

  const ativas = empresas.filter((e) => !e.arquivada);
  const lembrada = empresas.find((e) => e.id === perfil?.empresa_ativa_id);
  const empresaAtiva = (lembrada && !lembrada.arquivada ? lembrada : ativas[0]) ?? null;

  return {
    usuario: { id: user.id, email: user.email ?? "", nome: perfil?.nome ?? null },
    perfil,
    empresas,
    empresaAtiva,
    papel: empresaAtiva?.papel ?? null,
  };
});

/** Para páginas que exigem uma empresa ativa: redireciona para "Empresas" se não houver. */
export async function exigirEmpresaAtiva() {
  const ctx = await obterContexto();
  if (!ctx.empresaAtiva) redirect("/empresas?motivo=sem-empresa");
  return { ...ctx, empresaAtiva: ctx.empresaAtiva, papel: ctx.papel! };
}
