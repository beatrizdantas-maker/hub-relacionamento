"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { LogoEmpresa } from "@/components/empresas/LogoEmpresa";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { definirEmpresaAtiva } from "@/app/(app)/empresas/acoes";
import type { EmpresaResumo } from "./Casca";

/** Seletor de empresa no topo. Trocar de empresa troca TODO o conteúdo exibido. */
export function SeletorEmpresa({ empresas, ativaId }: { empresas: EmpresaResumo[]; ativaId: string | null }) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const ativa = empresas.find((e) => e.id === ativaId) ?? null;
  const visiveis = empresas.filter((e) => !e.arquivada);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e instanceof MouseEvent && ref.current?.contains(e.target as Node)) return;
      setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    document.addEventListener("keydown", fechar);
    return () => {
      document.removeEventListener("mousedown", fechar);
      document.removeEventListener("keydown", fechar);
    };
  }, [aberto]);

  function escolher(id: string) {
    setAberto(false);
    if (id === ativaId) return;
    iniciar(async () => {
      await definirEmpresaAtiva(id);
      router.refresh();
    });
  }

  if (visiveis.length === 0) {
    return (
      <Link href="/empresas/nova" className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-borda px-3 text-sm font-medium text-texto-2 hover:bg-superficie-2">
        <Plus className="h-4 w-4" aria-hidden /> Criar empresa
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={ativa ? `Empresa ativa: ${ativa.nome}. Trocar de empresa` : "Escolher empresa"}
        onClick={() => setAberto((v) => !v)}
        disabled={pendente}
        className="flex h-10 max-w-[70vw] items-center gap-2 rounded-xl border border-borda bg-superficie px-3 text-sm font-medium hover:bg-superficie-2 disabled:opacity-60 md:max-w-xs"
      >
        {ativa ? <LogoEmpresa nome={ativa.nome} logoUrl={ativa.logo_url} cor={ativa.cor_primaria} tamanho={22} /> : <span className="h-3 w-3 shrink-0 rounded-full bg-texto-3" aria-hidden />}
        <span className="truncate">{pendente ? "Trocando…" : ativa?.nome ?? "Escolher empresa"}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-texto-3" aria-hidden />
      </button>

      {aberto && (
        <div className="fixed inset-x-4 top-14 z-30 mt-1 overflow-hidden rounded-xl border border-borda bg-superficie shadow-lg md:absolute md:inset-x-auto md:left-0 md:top-auto md:w-72">
          <ul role="listbox" aria-label="Empresas" className="max-h-72 overflow-y-auto p-1">
            {visiveis.map((e) => (
              <li key={e.id} role="option" aria-selected={e.id === ativaId}>
                <button
                  type="button"
                  onClick={() => escolher(e.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-superficie-2 ${e.id === ativaId ? "font-semibold" : ""}`}
                >
                  <LogoEmpresa nome={e.nome} logoUrl={e.logo_url} cor={e.cor_primaria} tamanho={22} />
                  <span className="min-w-0 flex-1 truncate">{e.nome}</span>
                  {e.id === ativaId && <Check className="h-4 w-4 text-primaria" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-borda p-1">
            <Link href="/empresas" onClick={() => setAberto(false)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-texto-2 hover:bg-superficie-2">
              <Building2 className="h-4 w-4" aria-hidden /> Todas as empresas
            </Link>
            <Link href="/empresas/nova" onClick={() => setAberto(false)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-texto-2 hover:bg-superficie-2">
              <Plus className="h-4 w-4" aria-hidden /> Nova empresa
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
