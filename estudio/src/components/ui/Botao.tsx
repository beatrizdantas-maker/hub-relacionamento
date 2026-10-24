import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Variante = "primaria" | "secundaria" | "fantasma" | "perigo";
type Tamanho = "sm" | "md" | "lg";

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
}

const variantes: Record<Variante, string> = {
  primaria: "bg-primaria text-sobre-primaria hover:opacity-90 shadow-sm",
  secundaria: "bg-superficie border border-borda text-texto hover:bg-superficie-2",
  fantasma: "text-texto-2 hover:bg-superficie-2 hover:text-texto",
  perigo: "bg-atrasado text-white hover:opacity-90",
};
const tamanhos: Record<Tamanho, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-12 px-5 text-base",
};

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  { variante = "primaria", tamanho = "md", carregando, className = "", children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || carregando}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variantes[variante]} ${tamanhos[tamanho]} ${className}`}
      {...rest}
    >
      {carregando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
