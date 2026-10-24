import { exigirEmpresaAtiva } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNaEmpresa, inicioDaSemana, somarDias } from "@/lib/datas";
import { QuadroTarefas } from "@/components/tarefas/QuadroTarefas";
import { FILTROS_TAREFA, type FiltroTarefa } from "@/components/tarefas/rotulos";

export const metadata = { title: "Tarefas" };

export default async function PaginaTarefas({ searchParams }: { searchParams: Promise<{ filtro?: string; responsavel?: string; abrir?: string }> }) {
  const sp = await searchParams;
  const ctx = await exigirEmpresaAtiva();
  const empresa = ctx.empresaAtiva;
  const hoje = hojeNaEmpresa(empresa.fuso_horario);
  const filtro: FiltroTarefa = FILTROS_TAREFA.some((f) => f.chave === sp.filtro) ? (sp.filtro as FiltroTarefa) : "abertas";
  const segunda = inicioDaSemana(hoje);

  const supabase = await criarClienteServidor();
  const [{ data: abertas }, { data: entregues }, { data: membros }, { data: conteudos }] = await Promise.all([
    supabase.from("tarefas").select("*").eq("empresa_id", empresa.id).neq("status", "concluido").order("prazo", { nullsFirst: false }).order("prioridade"),
    supabase.from("tarefas").select("*").eq("empresa_id", empresa.id).eq("status", "concluido").gte("concluido_em", `${somarDias(hoje, -60)}T00:00:00`).order("concluido_em", { ascending: false }).limit(200),
    supabase.from("membros").select("*").eq("empresa_id", empresa.id),
    supabase.from("conteudos").select("id, data, formato, tema").eq("empresa_id", empresa.id).gte("data", somarDias(hoje, -30)).lte("data", somarDias(hoje, 90)).order("data"),
  ]);

  return (
    <QuadroTarefas
      empresaId={empresa.id}
      papel={ctx.papel}
      usuarioId={ctx.usuario.id}
      hoje={hoje}
      segunda={segunda}
      filtro={filtro}
      responsavel={sp.responsavel ?? ""}
      abrir={sp.abrir ?? null}
      tarefas={[...(abertas ?? []), ...(entregues ?? [])]}
      membros={(membros ?? []).map((m) => ({ id: m.user_id, nome: m.nome_exibicao ?? m.email ?? "Membro" }))}
      conteudos={conteudos ?? []}
    />
  );
}
