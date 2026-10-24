import { notFound } from "next/navigation";
import { obterContexto } from "@/lib/contexto";
import { permissoes } from "@/lib/papeis";
import { FormularioEmpresa } from "@/components/empresas/FormularioEmpresa";
import { Aviso } from "@/components/ui/Aviso";

export const metadata = { title: "Editar empresa" };

export default async function PaginaEditarEmpresa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await obterContexto();
  const empresa = ctx.empresas.find((e) => e.id === id);
  if (!empresa) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Editar {empresa.nome}</h1>
        <p className="mt-1 text-sm text-texto-2">Os mesmos três passos do cadastro. A tela Marca (Etapa 3) terá campanhas e a integração com o Metricool.</p>
      </header>
      {permissoes.podeEditar(empresa.papel) ? (
        <FormularioEmpresa empresa={empresa} />
      ) : (
        <Aviso tipo="info">Você é {empresa.papel === "colaborador" ? "colaborador(a)" : "leitor(a)"} nesta empresa e não pode editar os dados da marca.</Aviso>
      )}
    </div>
  );
}
