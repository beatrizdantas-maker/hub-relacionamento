import { exigirEmpresaAtiva } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNaEmpresa, somarDias } from "@/lib/datas";
import { PainelEvolucao } from "@/components/painel/PainelEvolucao";

export const metadata = { title: "Painel" };

export default async function PaginaPainel({ searchParams }: { searchParams: Promise<{ visao?: string; abrir?: string }> }) {
  const sp = await searchParams;
  const ctx = await exigirEmpresaAtiva();
  const empresa = ctx.empresaAtiva;
  const hoje = hojeNaEmpresa(empresa.fuso_horario);
  const supabase = await criarClienteServidor();

  const [{ data: semanas }, { data: posts }, { data: integracao }] = await Promise.all([
    supabase.from("metricas_semanais").select("*").eq("empresa_id", empresa.id).order("semana"),
    supabase.from("resultados_posts").select("*").eq("empresa_id", empresa.id).gte("publicado_em", `${somarDias(hoje, -180)}T00:00:00`).order("publicado_em", { ascending: false }).limit(300),
    ctx.papel === "dono" ? supabase.from("empresas_integracoes").select("metricool_brand_id, metricool_token_cifrado, ultima_importacao_em").eq("empresa_id", empresa.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return (
    <PainelEvolucao
      empresa={{ id: empresa.id, nome: empresa.nome, metas: empresa.metas }}
      papel={ctx.papel}
      hoje={hoje}
      visao={sp.visao === "meses" ? "meses" : "semanas"}
      abrir={sp.abrir ?? null}
      semanas={semanas ?? []}
      posts={posts ?? []}
      metricoolConfigurado={Boolean(integracao?.metricool_brand_id && integracao?.metricool_token_cifrado)}
    />
  );
}
