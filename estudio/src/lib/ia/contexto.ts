import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { somarDias, type DataISO } from "@/lib/datas";
import type { Database, Empresa } from "@/lib/tipos/database";
import { calcularDadosReais } from "./dadosReais";
import type { ContextoIA } from "./prompts";

type Cliente = SupabaseClient<Database, "estudio">;

/**
 * Tudo que a IA recebe sobre a empresa: perfil, campanhas, últimas 8 semanas
 * completas, 15 posts mais recentes com resultado e o que já está programado
 * no intervalo [de, ate].
 */
export async function carregarContextoIA(supabase: Cliente, empresa: Empresa, hoje: DataISO, intervalo: { de: DataISO; ate: DataISO }): Promise<ContextoIA> {
  const [{ data: campanhas }, { data: semanas }, { data: posts }, { data: agendados }] = await Promise.all([
    supabase.from("campanhas").select("*").eq("empresa_id", empresa.id).order("inicio", { ascending: true, nullsFirst: false }),
    supabase.from("metricas_semanais").select("*").eq("empresa_id", empresa.id).lt("fim", hoje).order("semana", { ascending: false }).limit(8),
    supabase.from("resultados_posts").select("*").eq("empresa_id", empresa.id).order("publicado_em", { ascending: false }).limit(15),
    supabase.from("conteudos").select("*").eq("empresa_id", empresa.id).gte("data", intervalo.de).lte("data", intervalo.ate).order("data").order("hora", { nullsFirst: false }),
  ]);
  return {
    empresa,
    hoje,
    campanhas: campanhas ?? [],
    dadosReais: calcularDadosReais({ hoje, semanas: semanas ?? [], posts: posts ?? [], metas: empresa.metas }),
    agendados: agendados ?? [],
  };
}

/** Intervalo padrão do "já programado": de hoje até 6 semanas à frente. */
export function intervaloAgendados(hoje: DataISO) {
  return { de: somarDias(hoje, -7), ate: somarDias(hoje, 42) };
}
