"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Pencil } from "lucide-react";
import { Selo } from "@/components/ui/Selo";
import { formatarNumero } from "@/lib/metricas";
import type { ResultadoPost } from "@/lib/tipos/database";

type Coluna = "alcance" | "interacoes" | "salvamentos" | "compartilhamentos";
const COLUNAS: { chave: Coluna; rotulo: string }[] = [
  { chave: "alcance", rotulo: "Alcance" },
  { chave: "interacoes", rotulo: "Interações" },
  { chave: "salvamentos", rotulo: "Salvamentos" },
  { chave: "compartilhamentos", rotulo: "Compartilh." },
];

export function TabelaConteudos({ posts, onEditar }: { posts: ResultadoPost[]; onEditar?: (p: ResultadoPost) => void }) {
  const [ordem, setOrdem] = useState<Coluna>("alcance");
  const [desc, setDesc] = useState(true);
  const [formato, setFormato] = useState<"todos" | "Reels" | "Carrossel" | "Estático">("todos");

  const lista = useMemo(() => {
    const f = posts.filter((p) => formato === "todos" || p.formato === formato);
    return [...f].sort((a, b) => {
      const va = a[ordem], vb = b[ordem];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return desc ? vb - va : va - vb;
    }).slice(0, 20);
  }, [posts, ordem, desc, formato]);

  function ordenar(c: Coluna) {
    if (c === ordem) setDesc((d) => !d);
    else { setOrdem(c); setDesc(true); }
  }

  const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por formato">
        {(["todos", "Reels", "Carrossel", "Estático"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFormato(f)} aria-pressed={formato === f}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${formato === f ? "border-primaria bg-primaria/10 text-primaria" : "border-borda text-texto-2 hover:bg-superficie-2"}`}>
            {f === "todos" ? "Todos" : f}
          </button>
        ))}
      </div>
      {lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borda p-4 text-center text-sm text-texto-2">Nenhum post com resultado registrado. Importe do Metricool ou registre manualmente.</p>
      ) : (
        <div className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-borda text-left text-xs text-texto-3">
                <th scope="col" className="py-2 pr-2 font-medium">Post</th>
                {COLUNAS.map((c) => (
                  <th key={c.chave} scope="col" aria-sort={ordem === c.chave ? (desc ? "descending" : "ascending") : "none"} className="py-2 pr-2 text-right font-medium">
                    <button type="button" onClick={() => ordenar(c.chave)} className={`inline-flex items-center gap-0.5 ${ordem === c.chave ? "text-texto" : ""}`}>
                      {c.rotulo} {ordem === c.chave && (desc ? <ArrowDown className="h-3 w-3" aria-hidden /> : <ArrowUp className="h-3 w-3" aria-hidden />)}
                    </button>
                  </th>
                ))}
                <th scope="col" className="py-2 text-right font-medium"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {lista.map((p) => (
                <tr key={p.id}>
                  <td className="max-w-[260px] py-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <Selo tom="neutro">{p.formato ?? "—"}</Selo>
                      <span className="truncate" title={p.titulo ?? ""}>{p.titulo || "Sem título"}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-texto-3 tabular">
                      {fmtData(p.publicado_em)}
                      <Selo tom={p.fonte === "metricool" ? "real" : "manual"}>{p.fonte === "metricool" ? "Metricool" : "manual"}</Selo>
                    </div>
                  </td>
                  {COLUNAS.map((c) => <td key={c.chave} className="py-2 pr-2 text-right tabular">{formatarNumero(p[c.chave])}</td>)}
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-1">
                      {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-primaria hover:bg-superficie-2" aria-label="Abrir post"><ExternalLink className="h-4 w-4" aria-hidden /></a>}
                      {onEditar && <button type="button" onClick={() => onEditar(p)} className="rounded-lg p-1.5 text-texto-2 hover:bg-superficie-2" aria-label="Editar resultado"><Pencil className="h-4 w-4" aria-hidden /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
