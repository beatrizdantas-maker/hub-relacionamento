import Link from "next/link";
import { Plus } from "lucide-react";
import { obterContexto } from "@/lib/contexto";
import { rotuloPapel } from "@/lib/papeis";
import { Selo } from "@/components/ui/Selo";

export default async function PaginaInicio() {
  const ctx = await obterContexto();
  const hojeBruto = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: ctx.empresaAtiva?.fuso_horario ?? "America/Sao_Paulo" });
  const hoje = hojeBruto.charAt(0).toUpperCase() + hojeBruto.slice(1);

  if (!ctx.empresaAtiva) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Bem-vinda ao Estúdio</h1>
        <div className="cartao space-y-3 border-dashed text-center">
          <p className="font-medium">Você ainda não participa de nenhuma empresa</p>
          <p className="text-sm text-texto-2">Crie a primeira empresa em 3 passos ou aceite um convite que tenha recebido por e-mail.</p>
          <Link href="/empresas/nova" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primaria px-4 font-medium text-sobre-primaria">
            <Plus className="h-5 w-5" aria-hidden /> Nova empresa
          </Link>
        </div>
      </div>
    );
  }

  const e = ctx.empresaAtiva;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-texto-2">{hoje}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{e.nome}</h1>
        </div>
        <Selo tom="neutro">Você é {rotuloPapel(ctx.papel)}</Selo>
      </header>

      <section className="cartao space-y-3">
        <h2 className="text-lg font-semibold">Etapa 2 concluída</h2>
        <p className="text-sm text-texto-2">
          Empresas, seletor no topo, cores por empresa, equipe e convites estão prontos. A tela de Início completa (programação de 7 dias, tarefas e indicadores) chega na Etapa 9.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/empresas" className="text-sm text-primaria underline-offset-2 hover:underline">Ver empresas</Link>
          <span className="text-texto-3">·</span>
          <Link href={`/empresas/${e.id}/membros`} className="text-sm text-primaria underline-offset-2 hover:underline">Equipe de {e.nome}</Link>
        </div>
      </section>
    </div>
  );
}
