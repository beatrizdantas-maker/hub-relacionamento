import type { Metadata } from "next";
import { FormularioEntrar } from "./FormularioEntrar";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string; erro?: string }>;
}) {
  const { proximo, erro } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-titulo text-4xl font-semibold tracking-tight text-primaria">Estúdio</p>
          <p className="mt-2 text-sm text-texto-2">Planejamento de Instagram, tarefas e resultados da sua equipe.</p>
        </div>
        <FormularioEntrar proximo={proximo} erroInicial={erro} />
      </div>
    </main>
  );
}
