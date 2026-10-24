import type { ReactNode } from "react";

type Tom = "ia" | "real" | "manual" | "atrasado" | "neutro" | "primaria";

const tons: Record<Tom, string> = {
  ia: "bg-ia/10 text-ia border-ia/30",
  real: "bg-real/10 text-real border-real/30",
  manual: "bg-manual/10 text-manual border-manual/30",
  atrasado: "bg-atrasado/10 text-atrasado border-atrasado/30",
  neutro: "bg-superficie-2 text-texto-2 border-borda",
  primaria: "bg-primaria/10 text-primaria border-primaria/30",
};

/** Selo de status: sempre com texto (nunca só cor). */
export function Selo({ tom = "neutro", children, className = "" }: { tom?: Tom; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tons[tom]} ${className}`}>
      {children}
    </span>
  );
}
