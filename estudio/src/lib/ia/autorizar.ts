import "server-only";
import { NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { permissoes } from "@/lib/papeis";
import { hojeNaEmpresa } from "@/lib/datas";
import type { Empresa, Papel } from "@/lib/tipos/database";
import { ERRO_SEM_CHAVE, ErroIA, chaveIAConfigurada } from "./cliente";

export type Autorizado = {
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>;
  usuarioId: string;
  empresa: Empresa;
  papel: Papel;
  hoje: string;
};

export function respostaErro(e: ErroIA) {
  return NextResponse.json({ erro: e.message, detalhes: e.detalhes ?? [] }, { status: e.status });
}

/**
 * Garante sessão, vínculo com a empresa e papel que pode editar (Dono ou
 * Editor). A RLS repete a checagem no banco; aqui evitamos gastar a IA à toa.
 */
export async function autorizarIA(empresaId: unknown): Promise<Autorizado | NextResponse> {
  if (typeof empresaId !== "string" || !/^[0-9a-f-]{36}$/i.test(empresaId)) return respostaErro(new ErroIA("Empresa inválida.", 400));
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respostaErro(new ErroIA("Faça login para usar a IA.", 401));
  const { data: vinculo } = await supabase.from("membros").select("papel").eq("empresa_id", empresaId).eq("user_id", user.id).maybeSingle();
  if (!vinculo) return respostaErro(new ErroIA("Você não faz parte desta empresa.", 403));
  if (!permissoes.podeEditar(vinculo.papel)) return respostaErro(new ErroIA("Só Dono e Editor podem gerar com a IA.", 403));
  const { data: empresa } = await supabase.from("empresas").select("*").eq("id", empresaId).maybeSingle();
  if (!empresa) return respostaErro(new ErroIA("Empresa não encontrada.", 404));
  if (!chaveIAConfigurada()) return respostaErro(ERRO_SEM_CHAVE);
  return { supabase, usuarioId: user.id, empresa, papel: vinculo.papel, hoje: hojeNaEmpresa(empresa.fuso_horario) };
}
