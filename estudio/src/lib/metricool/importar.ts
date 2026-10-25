import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/tipos/database";
import { decifrar } from "@/lib/cripto";
import { hojeNaEmpresa, inicioDaSemana, somarDias, type DataISO } from "@/lib/datas";
import { ClienteMetricool, ErroMetricool, diaNoFuso } from "./cliente";
import { agregarPorSemana, normalizarPublicacao, normalizarStory, type DiaConta, type PublicacaoNormalizada, type StoryNormalizado } from "./agregar";

type Cliente = SupabaseClient<Database, "estudio">;

export interface ResumoImportacao {
  periodo: { de: DataISO; ate: DataISO };
  semanasGravadas: number;
  semanasPuladas: number;     // ajustadas à mão, preservadas
  posts: number;
  reels: number;
  stories: number;
  avisos: string[];
}

/** Métricas diárias da conta no Metricool (subject=account) e o campo em que caem. */
const METRICAS_DIARIAS: { metrica: string; campo: keyof Omit<DiaConta, "dia"> }[] = [
  { metrica: "followers", campo: "seguidores" },
  { metrica: "followersGained", campo: "ganhos" },
  { metrica: "followersLost", campo: "perdidos" },
  { metrica: "views", campo: "visualizacoes" },
  { metrica: "reach", campo: "alcance" },
  { metrica: "stories", campo: "stories" },
];

export async function carregarConfiguracao(supabase: Cliente, empresaId: string) {
  const [{ data: integracao }, { data: empresa }] = await Promise.all([
    supabase.from("empresas_integracoes").select("*").eq("empresa_id", empresaId).maybeSingle(),
    supabase.from("empresas").select("fuso_horario").eq("id", empresaId).maybeSingle(),
  ]);
  if (!integracao) throw new ErroMetricool("Só o dono acessa a integração do Metricool desta empresa.");
  if (!integracao.metricool_brand_id || !integracao.metricool_user_id || !integracao.metricool_token_cifrado) {
    throw new ErroMetricool("Integração incompleta. Em Marca → Metricool, preencha ID de usuário, ID da marca e token.");
  }
  let token: string;
  try {
    token = decifrar(integracao.metricool_token_cifrado);
  } catch {
    throw new ErroMetricool("Não foi possível ler o token salvo (a chave ESTUDIO_CRYPTO_KEY mudou?). Salve o token de novo em Marca → Metricool.");
  }
  return {
    integracao,
    cliente: new ClienteMetricool({ token, userId: integracao.metricool_user_id, blogId: integracao.metricool_brand_id, fuso: empresa?.fuso_horario ?? "America/Sao_Paulo" }),
    fuso: empresa?.fuso_horario ?? "America/Sao_Paulo",
  };
}

/** Valida token/IDs e devolve a marca encontrada. */
export async function testarConexao(supabase: Cliente, empresaId: string) {
  const { cliente, integracao } = await carregarConfiguracao(supabase, empresaId);
  const marcas = await cliente.marcas();
  const marca = marcas.find((m) => String(m.id) === String(integracao.metricool_brand_id));
  if (!marca) {
    throw new ErroMetricool(
      marcas.length
        ? `Token válido, mas a marca ${integracao.metricool_brand_id} não está nesta conta. Marcas disponíveis: ${marcas.map((m) => `${m.label} (${m.id})`).join(", ")}.`
        : "Token válido, mas nenhuma marca foi encontrada nesta conta.",
    );
  }
  return marca;
}

/**
 * Importa do Metricool desde a última semana completa já importada (ou 12 semanas)
 * até hoje, agrega por semana e grava. Nunca sobrescreve cliques no link nem
 * mensagens no direct, nem semanas ajustadas à mão.
 */
export async function importarDoMetricool(supabase: Cliente, empresaId: string): Promise<ResumoImportacao> {
  const { cliente, integracao, fuso } = await carregarConfiguracao(supabase, empresaId);
  const hoje = hojeNaEmpresa(fuso);
  const avisos: string[] = [];

  // Desde a última semana completa importada (reimporta ela para fechar números), senão 12 semanas.
  const { data: ultima } = await supabase
    .from("metricas_semanais").select("semana").eq("empresa_id", empresaId).eq("fonte", "metricool").lt("fim", hoje)
    .order("semana", { ascending: false }).limit(1).maybeSingle();
  const de = ultima?.semana ?? inicioDaSemana(somarDias(hoje, -7 * 12));
  const ate = hoje;

  // ---- Séries diárias (cada métrica separada: uma faltar não derruba as outras)
  const dias = new Map<string, DiaConta>();
  const porDia = (d: string) => { const x = dias.get(d) ?? { dia: d }; dias.set(d, x); return x; };
  for (const { metrica, campo } of METRICAS_DIARIAS) {
    try {
      const serie = await cliente.serieDiaria(metrica, de, ate);
      if (serie.length === 0) avisos.push(`A métrica diária "${metrica}" não trouxe dados.`);
      for (const p of serie) if (p.dia >= de && p.dia <= ate) porDia(p.dia)[campo] = p.valor;
    } catch (e) {
      avisos.push(`Métrica diária "${metrica}": ${(e as Error).message}`);
    }
  }

  // ---- Posts, Reels e stories
  const dia = (iso: string) => diaNoFuso(iso, fuso);
  const publicacoes: PublicacaoNormalizada[] = [];
  const storiesLista: StoryNormalizado[] = [];
  const brutos: { chaves: string[] }[] = [];
  const carregar = async (nome: string, fn: () => Promise<Record<string, unknown>[]>, trata: (o: Record<string, unknown>) => void) => {
    try {
      const lista = await fn();
      if (lista[0]) brutos.push({ chaves: Object.keys(lista[0]) });
      let ignorados = 0;
      for (const o of lista) { try { trata(o); } catch { ignorados++; } }
      if (ignorados) avisos.push(`${ignorados} ${nome} vieram sem data ou id e foram ignorados.`);
    } catch (e) {
      avisos.push(`${nome}: ${(e as Error).message}`);
    }
  };
  await carregar("posts", () => cliente.posts(de, ate), (o) => { const p = normalizarPublicacao(o, "post", dia); if (p) publicacoes.push(p); else throw new Error("sem data"); });
  await carregar("Reels", () => cliente.reels(de, ate), (o) => { const p = normalizarPublicacao(o, "reel", dia); if (p) publicacoes.push(p); else throw new Error("sem data"); });
  await carregar("stories", () => cliente.stories(de, ate), (o) => { const s = normalizarStory(o, dia); if (s) storiesLista.push(s); else throw new Error("sem data"); });

  // ---- Agregação por semana
  const semanas = agregarPorSemana([...dias.values()], publicacoes, storiesLista, hoje).filter((s) => s.semana >= inicioDaSemana(de));

  const { data: existentes } = await supabase.from("metricas_semanais").select("semana, editado_manual, fonte").eq("empresa_id", empresaId).in("semana", semanas.map((s) => s.semana));
  const ajustadas = new Set((existentes ?? []).filter((e) => e.editado_manual).map((e) => e.semana));

  let gravadas = 0;
  for (const s of semanas) {
    if (ajustadas.has(s.semana)) continue; // preserva correções manuais
    const temAlgo = Object.entries(s).some(([k, v]) => !["semana", "dias_com_dados", "ultimo_dia"].includes(k) && v != null);
    if (!temAlgo) continue;
    const { error } = await supabase.from("metricas_semanais").upsert(
      { empresa_id: empresaId, fonte: "metricool", editado_manual: false, ...s },
      { onConflict: "empresa_id,semana" },
    );
    if (error) avisos.push(`Semana ${s.semana}: ${error.message}`);
    else gravadas++;
  }

  // ---- Resultados por post (upsert por id externo)
  let posts = 0, reels = 0;
  for (const p of publicacoes) {
    const { dia: _d, ...linha } = p;
    void _d;
    const { error } = await supabase.from("resultados_posts").upsert({ empresa_id: empresaId, fonte: "metricool", ...linha }, { onConflict: "empresa_id,id_externo" });
    if (error) avisos.push(`Post ${p.id_externo}: ${error.message}`);
    else if (p.formato === "Reels") reels++; else posts++;
  }

  await supabase.from("empresas_integracoes").update({
    ultima_importacao_em: new Date().toISOString(),
    ultima_semana_importada: semanas.filter((s) => somarDias(s.semana, 6) < hoje).map((s) => s.semana).sort().pop() ?? integracao.ultima_semana_importada,
  }).eq("empresa_id", empresaId);

  if (publicacoes.length === 0 && dias.size === 0) {
    avisos.push("Nada veio do Metricool no período. Confira se o Instagram está conectado à marca (via Facebook) e se o plano tem acesso à API.");
  }
  if (brutos.length && publicacoes.length === 0) {
    avisos.push(`Campos recebidos nas publicações: ${brutos[0].chaves.slice(0, 20).join(", ")}. Me mande essa lista se os números não aparecerem.`);
  }

  return { periodo: { de, ate }, semanasGravadas: gravadas, semanasPuladas: ajustadas.size, posts, reels, stories: storiesLista.length, avisos };
}
