/** Utilidades de cor para os tokens da empresa ativa. */

export function hexParaRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** "r g b" para usar em `rgb(var(--x) / alpha)`. */
export function hexParaToken(hex: string, padrao = "124 58 237"): string {
  const rgb = hexParaRgb(hex);
  return rgb ? rgb.join(" ") : padrao;
}

/** Luminância relativa (WCAG). */
function luminancia([r, g, b]: [number, number, number]) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Texto branco ou escuro sobre a cor, conforme contraste. */
export function corSobre(hex: string): string {
  const rgb = hexParaRgb(hex);
  if (!rgb) return "255 255 255";
  return luminancia(rgb) > 0.4 ? "28 25 23" : "255 255 255";
}

/** Variáveis CSS para aplicar as cores da empresa num elemento. */
export function estiloEmpresa(corPrimaria?: string | null, corSecundaria?: string | null): React.CSSProperties {
  if (!corPrimaria) return {};
  return {
    "--cor-primaria": hexParaToken(corPrimaria),
    "--cor-secundaria": hexParaToken(corSecundaria ?? "#F59E0B", "245 158 11"),
    "--sobre-primaria": corSobre(corPrimaria),
  } as React.CSSProperties;
}
