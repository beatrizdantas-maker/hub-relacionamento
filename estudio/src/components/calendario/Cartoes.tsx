"use client";

import { Selo } from "@/components/ui/Selo";
import { horaCurta } from "@/lib/datas";
import type { Conteudo, Story } from "@/lib/tipos/database";
import { ICONE_FORMATO, ORIGEM, STATUS } from "./rotulos";

export function CartaoConteudo({ conteudo, onAbrir, compacto = true }: { conteudo: Conteudo; onAbrir: () => void; compacto?: boolean }) {
  const Icone = ICONE_FORMATO[conteudo.formato];
  const st = STATUS[conteudo.status];
  const or = ORIGEM[conteudo.origem];
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={`w-full rounded-xl border border-borda bg-superficie p-2.5 text-left shadow-sm transition hover:border-primaria/60 hover:shadow ${conteudo.status === "sugestao" ? "border-dashed border-ia/50" : ""}`}
    >
      <div className="flex items-center gap-1.5 text-xs text-texto-2">
        <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 truncate font-medium md:hidden xl:inline">{conteudo.formato}</span>
        {conteudo.hora && <span className="ml-auto shrink-0 tabular">{horaCurta(conteudo.hora)}</span>}
      </div>
      <p className={`mt-1 text-sm font-medium ${compacto ? "line-clamp-2" : ""}`}>{conteudo.tema || <span className="text-texto-3">Sem tema</span>}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Selo tom={st.tom}>{st.rotulo}</Selo>
        <Selo tom={or.tom}>{or.rotulo}</Selo>
      </div>
    </button>
  );
}

export function CartaoStories({ story, onAbrir }: { story: Story; onAbrir: () => void }) {
  const Icone = ICONE_FORMATO.Stories;
  const st = STATUS[story.status];
  const or = ORIGEM[story.origem];
  const n = Array.isArray(story.telas) ? story.telas.length : 0;
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={`w-full rounded-xl border border-borda bg-superficie-2 p-2.5 text-left transition hover:border-primaria/60 ${story.status === "sugestao" ? "border-dashed border-ia/50" : ""}`}
    >
      <div className="flex items-center gap-1.5 text-xs text-texto-2">
        <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 truncate font-medium md:hidden xl:inline">Stories</span>
        <span className="ml-auto shrink-0 whitespace-nowrap tabular">{n} {n === 1 ? "tela" : "telas"}</span>
      </div>
      {story.objetivo && <p className="mt-1 line-clamp-2 text-sm">{story.objetivo}</p>}
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Selo tom={st.tom}>{st.rotulo}</Selo>
        <Selo tom={or.tom}>{or.rotulo}</Selo>
      </div>
    </button>
  );
}
