import { FormularioEmpresa } from "@/components/empresas/FormularioEmpresa";

export const metadata = { title: "Nova empresa" };

export default function PaginaNovaEmpresa() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Nova empresa</h1>
        <p className="mt-1 text-sm text-texto-2">Dois passos: dados da marca (com a logo) e público e objetivos. Você fica com o papel de Dono e pode convidar a equipe depois. Metas e horários são sugeridos pelo sistema na tela Marca, a partir dos dados reais.</p>
      </header>
      <FormularioEmpresa />
    </div>
  );
}
