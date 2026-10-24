"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Tema = "claro" | "escuro" | "sistema";
const OPCOES: { valor: Tema; rotulo: string; Icone: typeof Sun }[] = [
  { valor: "claro", rotulo: "Claro", Icone: Sun },
  { valor: "escuro", rotulo: "Escuro", Icone: Moon },
  { valor: "sistema", rotulo: "Sistema", Icone: Monitor },
];

function aplicar(tema: Tema) {
  const efetivo = tema === "sistema" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro") : tema;
  document.documentElement.setAttribute("data-tema", efetivo);
}

export function SeletorTema({ compacto = false }: { compacto?: boolean }) {
  const [tema, setTema] = useState<Tema>("sistema");

  useEffect(() => {
    try {
      const salvo = localStorage.getItem("estudio:tema") as Tema | null;
      if (salvo) setTema(salvo);
    } catch {}
  }, []);

  function escolher(novo: Tema) {
    setTema(novo);
    try { localStorage.setItem("estudio:tema", novo); } catch {}
    aplicar(novo);
  }

  if (compacto) {
    const proximo: Tema = tema === "claro" ? "escuro" : tema === "escuro" ? "sistema" : "claro";
    const { Icone, rotulo } = OPCOES.find((o) => o.valor === tema)!;
    return (
      <button type="button" onClick={() => escolher(proximo)} className="rounded-lg p-2 text-texto-2 hover:bg-superficie-2" aria-label={`Tema: ${rotulo}. Trocar`}>
        <Icone className="h-5 w-5" aria-hidden />
      </button>
    );
  }

  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 rounded-xl border border-borda bg-superficie-2 p-1">
      {OPCOES.map(({ valor, rotulo, Icone }) => (
        <button
          key={valor}
          type="button"
          role="radio"
          aria-checked={tema === valor}
          onClick={() => escolher(valor)}
          className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium ${tema === valor ? "bg-superficie text-texto shadow-sm" : "text-texto-3"}`}
        >
          <Icone className="h-3.5 w-3.5" aria-hidden />
          {rotulo}
        </button>
      ))}
    </div>
  );
}
