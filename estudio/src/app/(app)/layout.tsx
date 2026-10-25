import { obterContexto } from "@/lib/contexto";
import { estiloEmpresa } from "@/lib/cores";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNaEmpresa } from "@/lib/datas";
import { Casca } from "@/components/casca/Casca";

/**
 * Layout das telas autenticadas. O middleware já redireciona quem não está
 * logado; aqui montamos a casca com o seletor de empresa e aplicamos as
 * cores da empresa ativa como destaque.
 */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const ctx = await obterContexto();
  let atrasadas = 0;
  if (ctx.empresaAtiva) {
    const supabase = await criarClienteServidor();
    const { count } = await supabase
      .from("tarefas")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", ctx.empresaAtiva.id)
      .neq("status", "concluido")
      .lt("prazo", hojeNaEmpresa(ctx.empresaAtiva.fuso_horario));
    atrasadas = count ?? 0;
  }
  return (
    <div className="marca-empresa" style={estiloEmpresa(ctx.empresaAtiva?.cor_primaria, ctx.empresaAtiva?.cor_secundaria)}>
      <Casca
        usuario={ctx.usuario}
        empresas={ctx.empresas.map((e) => ({ id: e.id, nome: e.nome, cor_primaria: e.cor_primaria, arquivada: e.arquivada }))}
        empresaAtivaId={ctx.empresaAtiva?.id ?? null}
        atrasadas={atrasadas}
      >
        {children}
      </Casca>
    </div>
  );
}
