/**
 * Mesclagem de três vias para edição simultânea (tela Marca).
 * - original: o que a tela carregou
 * - meus: o que a pessoa digitou
 * - deles: o que está no banco agora (outro membro salvou)
 *
 * Campos que só a outra pessoa mudou entram sozinhos; campos que só eu mudei
 * ficam; campos que os dois mudaram para valores diferentes viram "conflito"
 * e pedem escolha. Nada do que foi digitado se perde.
 */
export const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function calcularMesclagem<T extends Record<string, unknown>>(original: T, meus: T, deles: T): { mesclado: T; conflitos: (keyof T)[] } {
  const mesclado = { ...meus };
  const conflitos: (keyof T)[] = [];
  for (const k of Object.keys(original) as (keyof T)[]) {
    const elesMudaram = !igual(deles[k], original[k]);
    const euMudei = !igual(meus[k], original[k]);
    if (elesMudaram && euMudei && !igual(deles[k], meus[k])) conflitos.push(k);
    else if (elesMudaram && !euMudei) mesclado[k] = deles[k];
  }
  return { mesclado, conflitos };
}
