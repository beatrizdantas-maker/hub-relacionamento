import { exigirEmpresaAtiva } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNaEmpresa, inicioDaSemana, somarDias } from "@/lib/datas";
import { calcularDadosReais } from "@/lib/ia/dadosReais";
import { chaveIAConfigurada } from "@/lib/ia/cliente";
import { Sugestoes } from "@/components/sugestoes/Sugestoes";

export const metadata = { title: "Sugestões" };

export default async function PaginaSugestoes() {
  const ctx = await exigirEmpresaAtiva();
  const empresa = ctx.empresaAtiva;
  const hoje = hojeNaEmpresa(empresa.fuso_horario);
  const proximaSemana = somarDias(inicioDaSemana(hoje), 7);
  const supabase = await criarClienteServidor();

  const [{ data: semanas }, { data: posts }, { data: sugestoes }] = await Promise.all([
    supabase.from("metricas_semanais").select("*").eq("empresa_id", empresa.id).lt("fim", hoje).order("semana", { ascending: false }).limit(8),
    supabase.from("resultados_posts").select("*").eq("empresa_id", empresa.id).order("publicado_em", { ascending: false }).limit(15),
    supabase.from("sugestoes").select("*").eq("empresa_id", empresa.id).order("gerado_em", { ascending: false }).limit(8),
  ]);

  const dadosReais = calcularDadosReais({ hoje, semanas: semanas ?? [], posts: posts ?? [], metas: empresa.metas });

  return (
    <Sugestoes
      empresa={{ id: empresa.id, nome: empresa.nome }}
      papel={ctx.papel}
      hoje={hoje}
      proximaSemana={proximaSemana}
      dadosReais={{ vazio: dadosReais.vazio, linhas: dadosReais.linhas }}
      sugestoes={sugestoes ?? []}
      iaConfigurada={chaveIAConfigurada()}
    />
  );
}
