import { supabase } from "./supabase";

const BUCKET = "comunicacoes-anexos";

/**
 * O bucket de anexos e PRIVADO (contem documentos sensiveis de alunos).
 * Por isso nao existe link publico: o link precisa ser assinado na hora.
 *
 * Registros antigos guardaram a URL publica inteira (que nunca funcionou);
 * os novos guardam apenas o caminho. Esta funcao aceita os dois formatos.
 */
export function caminhoDoAnexo(arquivoUrl) {
  if (!arquivoUrl) return null;
  const marcador = `/${BUCKET}/`;
  const i = arquivoUrl.indexOf(marcador);
  return i >= 0 ? arquivoUrl.slice(i + marcador.length) : arquivoUrl;
}

/** Gera um link temporario (padrao: 5 minutos) para abrir o anexo. */
export async function urlAssinadaAnexo(arquivoUrl, segundos = 300) {
  const caminho = caminhoDoAnexo(arquivoUrl);
  if (!caminho) return { erro: "Anexo sem caminho salvo." };
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, segundos);
  if (error) return { erro: error.message };
  return { url: data.signedUrl };
}
