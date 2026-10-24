import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

type Base = { rotulo: string; ajuda?: string; erro?: string; className?: string };

export function CampoTexto({ rotulo, ajuda, erro, className = "", id, ...rest }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const gerado = useId();
  const idFinal = id ?? gerado;
  return (
    <div className={className}>
      <label htmlFor={idFinal} className="rotulo">{rotulo}</label>
      <input id={idFinal} className="campo" aria-invalid={erro ? true : undefined} aria-describedby={ajuda || erro ? `${idFinal}-ajuda` : undefined} {...rest} />
      {(erro || ajuda) && (
        <p id={`${idFinal}-ajuda`} className={`mt-1 text-xs ${erro ? "text-atrasado" : "text-texto-3"}`}>{erro ?? ajuda}</p>
      )}
    </div>
  );
}

export function CampoArea({ rotulo, ajuda, erro, className = "", id, ...rest }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const gerado = useId();
  const idFinal = id ?? gerado;
  return (
    <div className={className}>
      <label htmlFor={idFinal} className="rotulo">{rotulo}</label>
      <textarea id={idFinal} className="campo min-h-[96px] resize-y" aria-invalid={erro ? true : undefined} aria-describedby={ajuda || erro ? `${idFinal}-ajuda` : undefined} {...rest} />
      {(erro || ajuda) && (
        <p id={`${idFinal}-ajuda`} className={`mt-1 text-xs ${erro ? "text-atrasado" : "text-texto-3"}`}>{erro ?? ajuda}</p>
      )}
    </div>
  );
}

export function CampoSelecao({ rotulo, ajuda, erro, className = "", id, children, ...rest }: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  const gerado = useId();
  const idFinal = id ?? gerado;
  return (
    <div className={className}>
      <label htmlFor={idFinal} className="rotulo">{rotulo}</label>
      <select id={idFinal} className="campo" aria-invalid={erro ? true : undefined} {...rest}>
        {children}
      </select>
      {(erro || ajuda) && <p className={`mt-1 text-xs ${erro ? "text-atrasado" : "text-texto-3"}`}>{erro ?? ajuda}</p>}
    </div>
  );
}
