import { NextResponse, type NextRequest } from "next/server";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { autorizarIA, respostaErro } from "@/lib/ia/autorizar";
import { ErroIA, MODELO_IA, obterClienteIA, traduzirErroIA } from "@/lib/ia/cliente";
import { montarPromptBriefing } from "@/lib/ia/prompts";
import { SaidaBriefing, formatarOrientacao, formatarRoteiro, problemasBriefing, type ModoReels } from "@/lib/ia/briefing";
import { FORMATOS } from "@/lib/validacao/conteudo";
import type { FormatoConteudo } from "@/lib/tipos/database";

export const runtime = "nodejs";
export const maxDuration = 300;

const texto = (v: unknown, max = 8000) => (typeof v === "string" ? v.slice(0, max) : null);

/**
 * POST /api/ia/briefing  { empresaId, modoReels, conteudo: { data, formato, tipo, … } }
 * Gera o briefing de produção (como devem ser as imagens ou o roteiro completo
 * do vídeo) a partir do que está no editor. Não grava: devolve os textos para
 * preencher o formulário; quem salva é a pessoa, no botão Salvar.
 */
export async function POST(req: NextRequest) {
  let corpo: { empresaId?: unknown; modoReels?: unknown; conteudo?: Record<string, unknown> } = {};
  try { corpo = await req.json(); } catch { /* corpo vazio */ }
  const auth = await autorizarIA(corpo.empresaId);
  if (auth instanceof NextResponse) return auth;
  const { empresa } = auth;

  const c = corpo.conteudo ?? {};
  const formato = c.formato as FormatoConteudo;
  if (!(FORMATOS as readonly string[]).includes(formato)) return respostaErro(new ErroIA("Formato inválido.", 400));
  if (!texto(c.tema, 200)?.trim()) return respostaErro(new ErroIA("Escreva o tema do conteúdo antes de pedir o briefing.", 400));
  const modoReels: ModoReels = corpo.modoReels === "com_pessoa" ? "com_pessoa" : "sem_pessoa";

  try {
    const { system, usuario } = montarPromptBriefing(empresa, modoReels, {
      data: texto(c.data, 10) ?? "",
      formato,
      tipo: texto(c.tipo, 120),
      pilar: texto(c.pilar, 80),
      tema: texto(c.tema, 200) ?? "",
      objetivo: texto(c.objetivo, 120),
      roteiro: texto(c.roteiro),
      legenda: texto(c.legenda),
      cta: texto(c.cta, 300),
      orientacao_arte: texto(c.orientacao_arte),
      ganchos: Array.isArray(c.ganchos) ? c.ganchos.filter((g): g is string => typeof g === "string").slice(0, 3) : [],
    });
    const stream = obterClienteIA().messages.stream(
      {
        model: MODELO_IA,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content: usuario }],
        output_config: { format: zodOutputFormat(SaidaBriefing), effort: "medium" },
      },
      { signal: req.signal },
    );
    const mensagem = await stream.finalMessage();
    if (mensagem.stop_reason === "max_tokens") throw new ErroIA("A resposta da IA ficou longa demais e foi cortada. Tente de novo.", 502);
    if (mensagem.stop_reason === "refusal") throw new ErroIA("A IA recusou gerar este briefing.", 502);
    const b = mensagem.parsed_output;
    if (!b) throw new ErroIA("A IA devolveu um JSON inválido. Tente de novo.", 502);
    const problemas = problemasBriefing(formato, b);
    if (problemas.length) throw new ErroIA("O briefing gerado veio incompleto. Tente de novo.", 502, problemas);

    return NextResponse.json({
      roteiro: formatarRoteiro(formato, b),
      orientacao_arte: formatarOrientacao(b),
      legenda: b.legenda.trim(),
      cta: b.cta.trim().slice(0, 300),
      ganchos: formato === "Reels" ? b.ganchos.map((g) => g.trim().slice(0, 300)).filter(Boolean).slice(0, 3) : [],
    });
  } catch (e) {
    return respostaErro(traduzirErroIA(e));
  }
}
