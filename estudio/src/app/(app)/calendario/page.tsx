import { exigirEmpresaAtiva } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehDataISO, hojeNaEmpresa, inicioDaSemana, somarDias } from "@/lib/datas";
import { Calendario } from "@/components/calendario/Calendario";
import { chaveIAConfigurada } from "@/lib/ia/cliente";

export const metadata = { title: "Calendário" };

type Busca = { semana?: string; dia?: string; formato?: string; abrir?: string };

export default async function PaginaCalendario({ searchParams }: { searchParams: Promise<Busca> }) {
  const sp = await searchParams;
  const ctx = await exigirEmpresaAtiva();
  const empresa = ctx.empresaAtiva;
  const hoje = hojeNaEmpresa(empresa.fuso_horario);
  const dia = ehDataISO(sp.dia) ? sp.dia : null;
  const segunda = dia ? inicioDaSemana(dia) : ehDataISO(sp.semana) ? inicioDaSemana(sp.semana) : inicioDaSemana(hoje);
  const domingo = somarDias(segunda, 6);

  const supabase = await criarClienteServidor();
  const [{ data: conteudos }, { data: stories }, { data: campanhas }] = await Promise.all([
    supabase.from("conteudos").select("*").eq("empresa_id", empresa.id).gte("data", segunda).lte("data", domingo).order("data").order("hora", { nullsFirst: false }),
    supabase.from("stories").select("*").eq("empresa_id", empresa.id).gte("data", segunda).lte("data", domingo).order("data"),
    supabase.from("campanhas").select("id, nome").eq("empresa_id", empresa.id).order("nome"),
  ]);
  const ids = (conteudos ?? []).map((c) => c.id);
  const { data: tarefas } = ids.length
    ? await supabase.from("tarefas").select("*").in("conteudo_id", ids).order("prazo")
    : { data: [] };

  return (
    <Calendario
      empresa={{ id: empresa.id, nome: empresa.nome, fuso: empresa.fuso_horario, pilares: empresa.pilares ?? [], ritmo: empresa.ritmo_semanal ?? [] }}
      marca={{ nome: empresa.nome, perfil: empresa.perfil_instagram, primaria: empresa.cor_primaria, secundaria: empresa.cor_secundaria, logoUrl: empresa.logo_url ?? null }}
      papel={ctx.papel}
      usuarioId={ctx.usuario.id}
      hoje={hoje}
      segunda={segunda}
      dia={dia}
      filtro={sp.formato ?? "todos"}
      abrir={sp.abrir ?? null}
      iaConfigurada={chaveIAConfigurada()}
      conteudos={conteudos ?? []}
      stories={stories ?? []}
      tarefas={tarefas ?? []}
      campanhas={campanhas ?? []}
    />
  );
}
