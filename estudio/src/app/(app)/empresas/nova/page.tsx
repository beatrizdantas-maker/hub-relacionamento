import { FormularioEmpresa } from "@/components/empresas/FormularioEmpresa";

export const metadata = { title: "Nova empresa" };

export default function PaginaNovaEmpresa() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Nova empresa</h1>
        <p className="mt-1 text-sm text-texto-2">Três passos: dados da marca, público e objetivos, metas e ritmo semanal. Você vira a dona da empresa e pode convidar a equipe depois.</p>
      </header>
      <FormularioEmpresa />
    </div>
  );
}
