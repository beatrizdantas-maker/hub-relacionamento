import { notFound } from "next/navigation";
import { obterContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Equipe } from "@/components/empresas/Equipe";

export const metadata = { title: "Equipe" };

export default async function PaginaMembros({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await obterContexto();
  const empresa = ctx.empresas.find((e) => e.id === id);
  if (!empresa) notFound();

  const supabase = await criarClienteServidor();
  const [{ data: membros }, { data: convites }] = await Promise.all([
    supabase.from("membros").select("*").eq("empresa_id", id).order("convidado_em"),
    empresa.papel === "dono"
      ? supabase.from("convites").select("*").eq("empresa_id", id).is("aceito_em", null).order("criado_em", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Equipe de {empresa.nome}</h1>
        <p className="mt-1 text-sm text-texto-2">Quem participa desta empresa e com qual papel. Convites chegam por e-mail e valem por 7 dias.</p>
      </header>
      <Equipe empresaId={id} meuId={ctx.usuario.id} meuPapel={empresa.papel} membros={membros ?? []} convites={convites ?? []} />
    </div>
  );
}
