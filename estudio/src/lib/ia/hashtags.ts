/**
 * Hashtags das legendas: a IA sugere a lista e o sistema limpa e junta no fim
 * da legenda, numa linha separada, depois da chamada para ação.
 */
export const MAX_HASHTAGS = 10;

/** "#Rotina de Estudos!" → "#RotinadeEstudos"; remove vazias e repetidas (sem diferenciar maiúsculas). */
export function normalizarHashtags(lista: string[], max = MAX_HASHTAGS): string[] {
  const vistas = new Set<string>();
  const saida: string[] = [];
  for (const bruta of lista) {
    const limpa = bruta.replace(/^#+/, "").normalize("NFC").replace(/[^\p{L}\p{N}_]/gu, "");
    if (!limpa || /^\d+$/.test(limpa)) continue;
    const chave = limpa.toLocaleLowerCase("pt-BR");
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    saida.push(`#${limpa}`);
    if (saida.length >= max) break;
  }
  return saida;
}

const SO_HASHTAGS = /^\s*(#[\p{L}\p{N}_]+\s*)+$/u;

/**
 * Junta legenda e hashtags. Se a legenda já terminar com linhas só de
 * hashtags, elas são aproveitadas (sem repetir) e reescritas numa linha só.
 */
export function juntarLegenda(legenda: string, hashtags: string[]): string {
  const linhas = legenda.replace(/\s+$/, "").split("\n");
  const existentes: string[] = [];
  while (linhas.length && (SO_HASHTAGS.test(linhas[linhas.length - 1]) || !linhas[linhas.length - 1].trim())) {
    const l = linhas.pop()!;
    existentes.unshift(...(l.match(/#[\p{L}\p{N}_]+/gu) ?? []));
  }
  const texto = linhas.join("\n").trim();
  const tags = normalizarHashtags([...existentes, ...hashtags]);
  return tags.length ? `${texto}\n\n${tags.join(" ")}` : texto;
}
