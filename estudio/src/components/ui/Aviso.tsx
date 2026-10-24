import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type Tipo = "erro" | "sucesso" | "info";

const estilos: Record<Tipo, { classe: string; Icone: typeof Info }> = {
  erro: { classe: "border-atrasado/40 bg-atrasado/10 text-atrasado", Icone: AlertCircle },
  sucesso: { classe: "border-real/40 bg-real/10 text-real", Icone: CheckCircle2 },
  info: { classe: "border-ia/40 bg-ia/10 text-ia", Icone: Info },
};

export function Aviso({ tipo = "info", children }: { tipo?: Tipo; children: ReactNode }) {
  const { classe, Icone } = estilos[tipo];
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${classe}`}>
      <Icone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="text-texto">{children}</div>
    </div>
  );
}
