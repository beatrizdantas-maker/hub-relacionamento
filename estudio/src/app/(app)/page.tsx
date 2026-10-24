import { criarClienteServidor } from "@/lib/supabase/server";
import { Selo } from "@/components/ui/Selo";

export default async function PaginaInicio() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { count } = await supabase.from("empresas").select("id", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Início</h1>
        <p className="mt-1 text-texto-2">Você entrou como {user?.email}.</p>
      </header>

      <section className="cartao space-y-3">
        <h2 className="text-lg font-semibold">Etapa 1 concluída</h2>
        <p className="text-sm text-texto-2">
          Autenticação, tabelas e políticas por papel estão prontas. Na Etapa 2 entram o cadastro de empresas, o seletor no topo e os convites.
        </p>
        <p className="text-sm text-texto-2 tabular">
          Empresas em que você é membro: <strong className="text-texto">{count ?? 0}</strong>
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Selo tom="ia">Sugestão da IA</Selo>
          <Selo tom="real">Dado real · Metricool</Selo>
          <Selo tom="manual">Dado real · registro manual</Selo>
          <Selo tom="atrasado">Atrasada</Selo>
          <Selo tom="neutro">Criado pela equipe</Selo>
        </div>
      </section>
    </div>
  );
}
