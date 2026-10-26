import Link from "next/link";
import { Plus } from "lucide-react";
import { obterContexto } from "@/lib/contexto";
import { Aviso } from "@/components/ui/Aviso";
import { CartaoEmpresa } from "@/components/empresas/CartaoEmpresa";
import { MinhaConta } from "@/components/empresas/MinhaConta";

export const metadata = { title: "Empresas" };

export default async function PaginaEmpresas({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const { motivo } = await searchParams;
  const ctx = await obterContexto();
  const ativas = ctx.empresas.filter((e) => !e.arquivada);
  const arquivadas = ctx.empresas.filter((e) => e.arquivada);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Empresas</h1>
          <p className="mt-1 text-sm text-texto-2">As empresas em que você participa. Trocar de empresa no topo troca todo o conteúdo.</p>
        </div>
        <Link href="/empresas/nova" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primaria px-4 text-base font-medium text-sobre-primaria shadow-sm hover:opacity-90">
          <Plus className="h-5 w-5" aria-hidden /> Nova empresa
        </Link>
      </header>

      {motivo === "sem-empresa" && <Aviso tipo="info">Para usar o Estúdio, crie a sua primeira empresa ou aceite um convite.</Aviso>}

      {ativas.length === 0 ? (
        <div className="cartao border-dashed text-center">
          <p className="font-medium">Nenhuma empresa ainda</p>
          <p className="mt-1 text-sm text-texto-2">
            Cada empresa tem o próprio calendário, equipe, métricas e sugestões. Clique em <strong>Nova empresa</strong> para começar: são 3 passos rápidos.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {ativas.map((e) => <CartaoEmpresa key={e.id} empresa={e} ativa={e.id === ctx.empresaAtiva?.id} />)}
        </ul>
      )}

      {arquivadas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-texto-2">Arquivadas</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {arquivadas.map((e) => <CartaoEmpresa key={e.id} empresa={e} ativa={false} />)}
          </ul>
        </section>
      )}

      <MinhaConta email={ctx.usuario.email} />
    </div>
  );
}
