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

/** Contraste WCAG entre duas cores (1 a 21). */
export function contraste(a: [number, number, number], b: [number, number, number]): number {
  const la = luminancia(a), lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const ESCURO: [number, number, number] = [28, 25, 23];
const BRANCO: [number, number, number] = [255, 255, 255];
/** Escolhe, entre texto escuro e branco, o que tem mais contraste sobre a cor. */
const corSobreRgb = (rgb: [number, number, number]) => (contraste(rgb, ESCURO) > contraste(rgb, BRANCO) ? "28 25 23" : "255 255 255");

/** Texto branco ou escuro sobre a cor, conforme contraste. */
export function corSobre(hex: string): string {
  const rgb = hexParaRgb(hex);
  if (!rgb) return "255 255 255";
  return corSobreRgb(rgb);
}

const FUNDO_ESCURO: [number, number, number] = [20, 18, 17];

/**
 * Versão da cor para o tema escuro: clareia (mistura com branco) só o
 * necessário para ter contraste ≥ 5,5:1 sobre o fundo escuro (sobra margem
 * para os fundos tingidos a 10%), mantendo o
 * matiz da marca. Cores já claras voltam como estão.
 */
export function clarearParaEscuro(rgb: [number, number, number], minimo = 5.5): [number, number, number] {
  let atual = rgb;
  for (let passo = 0; passo < 20 && contraste(atual, FUNDO_ESCURO) < minimo; passo++) {
    atual = atual.map((v) => Math.round(v + (255 - v) * 0.12)) as [number, number, number];
  }
  return atual;
}

/**
 * Variáveis CSS para aplicar as cores da empresa num elemento. As variantes
 * "-escuro" entram no lugar das normais quando o tema escuro está ativo
 * (regra em globals.css).
 */
export function estiloEmpresa(corPrimaria?: string | null, corSecundaria?: string | null): React.CSSProperties {
  if (!corPrimaria) return {};
  const primaria = hexParaRgb(corPrimaria) ?? [124, 58, 237];
  const secundaria = hexParaRgb(corSecundaria ?? "#F59E0B") ?? [245, 158, 11];
  const primariaEscuro = clarearParaEscuro(primaria);
  const secundariaEscuro = clarearParaEscuro(secundaria);
  return {
    "--cor-primaria": primaria.join(" "),
    "--cor-secundaria": secundaria.join(" "),
    "--sobre-primaria": corSobreRgb(primaria),
    "--cor-primaria-escuro": primariaEscuro.join(" "),
    "--cor-secundaria-escuro": secundariaEscuro.join(" "),
    "--sobre-primaria-escuro": corSobreRgb(primariaEscuro),
  } as React.CSSProperties;
}
