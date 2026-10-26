/* eslint-disable @next/next/no-img-element */

/** Logo da empresa; sem logo, mostra a inicial na cor primária. */
export function LogoEmpresa({ nome, logoUrl, cor, tamanho = 24, className = "" }: { nome: string; logoUrl?: string | null; cor: string; tamanho?: number; className?: string }) {
  const estilo = { width: tamanho, height: tamanho };
  if (logoUrl) {
    return <img src={logoUrl} alt="" style={estilo} className={`shrink-0 rounded-md border border-borda bg-white object-contain ${className}`} />;
  }
  return (
    // A inicial é desenhada por CSS (::before) para não entrar no nome acessível de quem usa o componente.
    <span
      aria-hidden
      data-letra={nome.trim().charAt(0).toUpperCase() || "?"}
      style={{ ...estilo, background: cor, fontSize: Math.max(10, Math.round(tamanho * 0.45)) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-semibold text-white before:content-[attr(data-letra)] ${className}`}
    />
  );
}
