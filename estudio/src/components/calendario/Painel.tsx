"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Painel lateral no computador, folha de baixo no celular.
 * Fecha com Esc ou clicando fora. Bloqueia a rolagem da página enquanto aberto.
 */
export function Painel({ titulo, onFechar, children, rodape }: { titulo: string; onFechar: () => void; children: ReactNode; rodape?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", tecla);
    const foco = ref.current?.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea:not([disabled])") ?? ref.current?.querySelector<HTMLElement>("button");
    foco?.focus();
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", tecla);
    };
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label="Fechar painel" className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-borda bg-superficie shadow-xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[540px] md:rounded-none md:border-l md:border-t-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-borda px-4 py-3">
          <h2 className="truncate text-lg font-semibold">{titulo}</h2>
          <button type="button" onClick={onFechar} className="rounded-lg p-2 text-texto-2 hover:bg-superficie-2" aria-label="Fechar">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {rodape && <div className="border-t border-borda bg-superficie px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{rodape}</div>}
      </div>
    </div>
  );
}
