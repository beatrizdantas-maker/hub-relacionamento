"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Home, Lightbulb, ListChecks, LogOut, Palette } from "lucide-react";
import { SeletorTema } from "./SeletorTema";

const NAV = [
  { href: "/", rotulo: "Início", Icone: Home },
  { href: "/calendario", rotulo: "Calendário", Icone: CalendarDays },
  { href: "/tarefas", rotulo: "Tarefas", Icone: ListChecks },
  { href: "/painel", rotulo: "Painel", Icone: BarChart3 },
  { href: "/sugestoes", rotulo: "Sugestões", Icone: Lightbulb },
  { href: "/marca", rotulo: "Marca", Icone: Palette },
];

export interface UsuarioCasca {
  id: string;
  email: string;
  nome: string | null;
}

/**
 * Casca do app: barra lateral no computador, barra inferior com 6 ícones no
 * celular. O seletor de empresa (Etapa 2) entra no topo.
 */
export function Casca({ usuario, children }: { usuario: UsuarioCasca; children: React.ReactNode }) {
  const pathname = usePathname();
  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      {/* Barra lateral (computador) */}
      <aside className="hidden border-r border-borda bg-superficie md:flex md:flex-col">
        <div className="px-5 py-5">
          <Link href="/" className="font-titulo text-2xl font-semibold text-primaria">Estúdio</Link>
        </div>
        <nav aria-label="Principal" className="flex-1 space-y-1 px-3">
          {NAV.map(({ href, rotulo, Icone }) => (
            <Link
              key={href}
              href={href}
              aria-current={ativo(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                ativo(href) ? "bg-primaria/10 text-primaria" : "text-texto-2 hover:bg-superficie-2 hover:text-texto"
              }`}
            >
              <Icone className="h-5 w-5" aria-hidden />
              {rotulo}
            </Link>
          ))}
        </nav>
        <div className="space-y-3 border-t border-borda p-4">
          <SeletorTema />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{usuario.nome ?? usuario.email}</p>
              <p className="truncate text-xs text-texto-3">{usuario.email}</p>
            </div>
            <form action="/auth/sair" method="post">
              <button type="submit" className="rounded-lg p-2 text-texto-2 hover:bg-superficie-2" aria-label="Sair">
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        {/* Topo: seletor de empresa entra aqui na Etapa 2 */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-borda bg-superficie/90 px-4 backdrop-blur md:px-6">
          <Link href="/" className="font-titulo text-xl font-semibold text-primaria md:hidden">Estúdio</Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2 md:hidden">
            <SeletorTema compacto />
            <form action="/auth/sair" method="post">
              <button type="submit" className="rounded-lg p-2 text-texto-2 hover:bg-superficie-2" aria-label="Sair">
                <LogOut className="h-5 w-5" aria-hidden />
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-8">{children}</main>

        {/* Barra inferior (celular) */}
        <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-borda bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          {NAV.map(({ href, rotulo, Icone }) => (
            <Link
              key={href}
              href={href}
              aria-current={ativo(href) ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${ativo(href) ? "text-primaria" : "text-texto-3"}`}
            >
              <Icone className="h-5 w-5" aria-hidden />
              {rotulo}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
