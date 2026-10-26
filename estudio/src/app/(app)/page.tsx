import Link from "next/link";
import { Plus } from "lucide-react";
import { obterContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNaEmpresa, somarDias } from "@/lib/datas";
import { agruparTarefasInicio, alertasInicio } from "@/lib/inicio";
import { compararUltimos, mesDe, progressoMetas, semanaParaPeriodo } from "@/lib/metricas";
import { Inicio } from "@/components/inicio/Inicio";

export const metadata = { title: "Início" };

export default async function PaginaInicio() {
  const ctx = await obterContexto();

  if (!ctx.empresaAtiva) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Bem-vinda ao Estúdio</h1>
        <div className="cartao space-y-3 border-dashed text-center">
          <p className="font-medium">Você ainda não participa de nenhuma empresa</p>
          <p className="text-sm text-texto-2">Crie a primeira empresa em 2 passos ou aceite um convite que tenha recebido por e-mail.</p>
          <Link href="/empresas/nova" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primaria px-4 font-medium text-sobre-primaria">
            <Plus className="h-5 w-5" aria-hidden /> Nova empresa
          </Link>
        </div>
      </div>
    );
  }

  const empresa = ctx.empresaAtiva;
  const papel = ctx.papel!;
  const hoje = hojeNaEmpresa(empresa.fuso_horario);
  const fim7 = somarDias(hoje, 6);
  const mes = mesDe(hoje);
  const supabase = await criarClienteServidor();

  const [{ data: conteudos }, { data: stories }, { data: tarefas }, { data: membros }, { data: semanas }, { data: postsMes }, { data: ultimaSugestao }, sugestoesC, sugestoesS, integracao] = await Promise.all([
    supabase.from("conteudos").select("*").eq("empresa_id", empresa.id).gte("data", hoje).lte("data", fim7).order("data").order("hora", { nullsFirst: false }),
    supabase.from("stories").select("*").eq("empresa_id", empresa.id).gte("data", hoje).lte("data", fim7).order("data"),
    supabase.from("tarefas").select("*").eq("empresa_id", empresa.id).neq("status", "concluido").lte("prazo", somarDias(hoje, 7)).order("prazo"),
    supabase.from("membros").select("user_id, nome_exibicao, email").eq("empresa_id", empresa.id),
    supabase.from("metricas_semanais").select("*").eq("empresa_id", empresa.id).order("semana", { ascending: false }).limit(12),
    supabase.from("resultados_posts").select("*").eq("empresa_id", empresa.id).gte("publicado_em", `${mes}-01T00:00:00`).limit(300),
    supabase.from("sugestoes").select("id, semana, gerado_em, resumo, ideias").eq("empresa_id", empresa.id).order("gerado_em", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("conteudos").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).eq("status", "sugestao").gte("data", hoje),
    supabase.from("stories").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).eq("status", "sugestao").gte("data", hoje),
    papel === "dono"
      ? supabase.from("empresas_integracoes").select("metricool_brand_id, metricool_user_id, metricool_token_cifrado").eq("empresa_id", empresa.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const grupos = agruparTarefasInicio(tarefas ?? [], hoje);
  const periodos = [...(semanas ?? [])].reverse().map((s) => semanaParaPeriodo(s, hoje));
  const { atual, anterior } = compararUltimos(periodos);
  const metas = progressoMetas(empresa.metas, (semanas ?? []).filter((s) => mesDe(s.semana) === mes), postsMes ?? []);
  const metricoolConfigurado = papel === "dono" ? Boolean(integracao.data?.metricool_brand_id && integracao.data?.metricool_user_id && integracao.data?.metricool_token_cifrado) : null;

  const alertas = alertasInicio({
    hoje,
    papel,
    atrasadas: grupos.atrasadas.length,
    sugestoesPendentes: (sugestoesC.count ?? 0) + (sugestoesS.count ?? 0),
    semanasRegistradas: (semanas ?? []).map((s) => s.semana),
    ritmoDefinido: (empresa.ritmo_semanal ?? []).length > 0,
    metricoolConfigurado,
    proximos7DiasVazios: (conteudos ?? []).length === 0 && (stories ?? []).length === 0,
  });

  return (
    <Inicio
      empresa={{ id: empresa.id, nome: empresa.nome }}
      usuario={{ id: ctx.usuario.id, nome: ctx.usuario.nome }}
      papel={papel}
      hoje={hoje}
      alertas={alertas}
      conteudos={conteudos ?? []}
      stories={stories ?? []}
      tarefas={grupos}
      membros={Object.fromEntries((membros ?? []).map((m) => [m.user_id, m.nome_exibicao ?? m.email ?? "Membro"]))}
      indicadores={{ atual, anterior }}
      metas={metas}
      ultimaSugestao={ultimaSugestao ? { id: ultimaSugestao.id, semana: ultimaSugestao.semana, gerado_em: ultimaSugestao.gerado_em, resumo: ultimaSugestao.resumo, ideias: Array.isArray(ultimaSugestao.ideias) ? ultimaSugestao.ideias.length : 0 } : null}
    />
  );
}
