import { NextResponse, type NextRequest } from "next/server";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { autorizarIA, respostaErro } from "@/lib/ia/autorizar";
import { ErroIA, MODELO_IA, obterClienteIA, traduzirErroIA } from "@/lib/ia/cliente";
import { montarPromptAdaptar } from "@/lib/ia/prompts";
import { SaidaAdaptacao, formatarOrientacao, formatarRoteiro, problemasBriefing } from "@/lib/ia/briefing";
import { juntarLegenda } from "@/lib/ia/hashtags";
import { gerarTarefasPadrao } from "@/lib/tarefasPadrao";
import { diaDaSemana } from "@/lib/datas";
import { OBJETIVOS_RITMO } from "@/lib/validacao/empresa";
import { MENSAGEM_MIGRACAO_LINKEDIN, faltaMigracaoLinkedin, redeDe, redesDaEmpresa, ritmoLinkedinOuPadrao } from "@/lib/redes";

export const runtime = "nodejs";
export const maxDuration = 300;

export interface ResultadoAdaptar { id: string; data: string; formato: string; tema: string; tarefas: number }

/**
 * POST /api/ia/adaptar  { empresaId, conteudoId }
 * Cria a versão para o LinkedIn de um conteúdo do Instagram, como sugestão da
 * IA, na mesma data (ou hoje, se a data já passou), no horário do ritmo do
 * LinkedIn, com as tarefas padrão do formato escolhido.
 */
export async function POST(req: NextRequest) {
  let corpo: { empresaId?: unknown; conteudoId?: unknown } = {};
  try { corpo = await req.json(); } catch { /* corpo vazio */ }
  const auth = await autorizarIA(corpo.empresaId);
  if (auth instanceof NextResponse) return auth;
  const { supabase, empresa, hoje } = auth;

  if (!redesDaEmpresa(empresa).includes("linkedin")) return respostaErro(new ErroIA("Ative o LinkedIn em Marca → LinkedIn antes de adaptar.", 400));
  if (typeof corpo.conteudoId !== "string") return respostaErro(new ErroIA("Conteúdo inválido.", 400));
  const { data: origem } = await supabase.from("conteudos").select("*").eq("id", corpo.conteudoId).eq("empresa_id", empresa.id).maybeSingle();
  if (!origem) return respostaErro(new ErroIA("Conteúdo não encontrado.", 404));
  if (redeDe(origem) !== "instagram") return respostaErro(new ErroIA("Este conteúdo já é do LinkedIn.", 400));
  if (!origem.tema?.trim()) return respostaErro(new ErroIA("Escreva o tema do conteúdo antes de adaptar.", 400));

  const data = origem.data < hoje ? hoje : origem.data;
  const slot = ritmoLinkedinOuPadrao(empresa.ritmo_linkedin).find((r) => r.dia === diaDaSemana(data)) ?? null;

  try {
    const { system, usuario } = montarPromptAdaptar(empresa, origem, slot);
    const stream = obterClienteIA().messages.stream(
      {
        model: MODELO_IA,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content: usuario }],
        output_config: { format: zodOutputFormat(SaidaAdaptacao), effort: "medium" },
      },
      { signal: req.signal },
    );
    const mensagem = await stream.finalMessage();
    if (mensagem.stop_reason === "max_tokens") throw new ErroIA("A resposta da IA ficou longa demais e foi cortada. Tente de novo.", 502);
    if (mensagem.stop_reason === "refusal") throw new ErroIA("A IA recusou adaptar este conteúdo.", 502);
    const b = mensagem.parsed_output;
    if (!b) throw new ErroIA("A IA devolveu um JSON inválido. Tente de novo.", 502);
    const problemas = problemasBriefing(b.formato, b);
    if (problemas.length) throw new ErroIA("A adaptação veio incompleta. Tente de novo.", 502, problemas);

    const objetivo = OBJETIVOS_RITMO.some((o) => o.valor === b.objetivo.trim()) ? b.objetivo.trim() : slot?.objetivo ?? origem.objetivo;
    const tema = (b.tema.trim() || origem.tema).slice(0, 200);
    const { data: novo, error } = await supabase
      .from("conteudos")
      .insert({
        empresa_id: empresa.id,
        rede: "linkedin",
        data,
        hora: slot?.hora ?? "08:00",
        formato: b.formato,
        tipo: (b.tipo.trim() || slot?.tipo || "").slice(0, 120) || null,
        pilar: origem.pilar,
        tema,
        objetivo: objetivo?.slice(0, 120) ?? null,
        roteiro: formatarRoteiro(b.formato, b),
        legenda: juntarLegenda(b.legenda, b.hashtags, 3),
        cta: b.cta.trim().slice(0, 300),
        orientacao_arte: formatarOrientacao(b),
        ganchos: b.formato === "Reels" ? b.ganchos.map((g) => g.trim().slice(0, 300)).filter(Boolean).slice(0, 3) : [],
        campanha_id: origem.campanha_id,
        notas: `Adaptado do Instagram de ${origem.data.split("-").reverse().join("/")}: ${origem.tema}`.slice(0, 4000),
        status: "sugestao",
        origem: "ia",
      })
      .select("id")
      .maybeSingle();
    if (error || !novo) {
      if (faltaMigracaoLinkedin(error)) throw new ErroIA(MENSAGEM_MIGRACAO_LINKEDIN, 409);
      throw new ErroIA(`Não foi possível gravar a versão do LinkedIn (${error?.code === "42501" ? "sem permissão" : error?.message ?? "erro"}).`, 500);
    }

    const tarefas = gerarTarefasPadrao({ formato: b.formato, tipo: b.tipo, data, hoje, tema });
    const { error: erroTarefas } = await supabase.from("tarefas").insert(tarefas.map((t) => ({ ...t, empresa_id: empresa.id, conteudo_id: novo.id, origem: "ia" as const })));

    const resultado: ResultadoAdaptar = { id: novo.id, data, formato: b.formato, tema, tarefas: erroTarefas ? 0 : tarefas.length };
    return NextResponse.json(resultado);
  } catch (e) {
    return respostaErro(traduzirErroIA(e));
  }
}
