import { exigirEmpresaAtiva } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { decifrar, mascarar } from "@/lib/cripto";
import { rotuloPapel } from "@/lib/papeis";
import { Selo } from "@/components/ui/Selo";
import { EditorMarca, type IntegracaoResumo } from "@/components/marca/EditorMarca";
import { hojeNaEmpresa, somarDias } from "@/lib/datas";
import { analisarMetas, analisarRitmo } from "@/lib/analiseSistema";
import { ritmoOuPadrao } from "@/lib/padroes";

export const metadata = { title: "Marca" };

export default async function PaginaMarca() {
  const ctx = await exigirEmpresaAtiva();
  const empresa = ctx.empresaAtiva;
  const supabase = await criarClienteServidor();

  const hoje = hojeNaEmpresa(empresa.fuso_horario);
  const [{ data: campanhas }, { data: integracao }, { data: semanas }, { data: posts }] = await Promise.all([
    supabase.from("campanhas").select("*").eq("empresa_id", empresa.id).order("inicio", { ascending: false, nullsFirst: false }),
    ctx.papel === "dono"
      ? supabase.from("empresas_integracoes").select("*").eq("empresa_id", empresa.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("metricas_semanais").select("*").eq("empresa_id", empresa.id).lt("fim", hoje).order("semana", { ascending: false }).limit(4),
    supabase.from("resultados_posts").select("*").eq("empresa_id", empresa.id).gte("publicado_em", `${somarDias(hoje, -56)}T00:00:00`).order("publicado_em", { ascending: false }).limit(300),
  ]);
  const analise = {
    metas: analisarMetas({ hoje, semanas: semanas ?? [], posts: posts ?? [] }),
    ritmo: analisarRitmo({ hoje, posts: posts ?? [], ritmo: ritmoOuPadrao(empresa.ritmo_semanal), fuso: empresa.fuso_horario }),
  };

  let resumoIntegracao: IntegracaoResumo | null = null;
  if (ctx.papel === "dono") {
    let tokenMascarado: string | null = null;
    let tokenIlegivel = false;
    if (integracao?.metricool_token_cifrado) {
      try {
        tokenMascarado = mascarar(decifrar(integracao.metricool_token_cifrado));
      } catch {
        tokenIlegivel = true;
      }
    }
    resumoIntegracao = {
      metricool_user_id: integracao?.metricool_user_id ?? "",
      metricool_brand_id: integracao?.metricool_brand_id ?? "",
      tokenMascarado,
      tokenIlegivel,
      ultimaImportacao: integracao?.ultima_importacao_em ?? null,
    };
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Marca</h1>
          <p className="mt-1 text-sm text-texto-2">Tudo que define {empresa.nome}: identidade, público, metas, ritmo, campanhas e integrações. Cada seção salva separadamente.</p>
        </div>
        <Selo tom="neutro">Você é {rotuloPapel(ctx.papel)}</Selo>
      </header>
      <EditorMarca empresa={empresa} papel={ctx.papel} campanhas={campanhas ?? []} integracao={resumoIntegracao} analise={analise} />
    </div>
  );
}
