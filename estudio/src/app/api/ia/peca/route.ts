import { NextResponse, type NextRequest } from "next/server";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { autorizarIA, respostaErro } from "@/lib/ia/autorizar";
import { ErroIA, MODELO_IA, obterClienteIA, traduzirErroIA } from "@/lib/ia/cliente";
import { montarPromptPeca } from "@/lib/ia/prompts";
import { SAIDAS, modosPossiveis, normalizarPeca, type ModoPeca } from "@/lib/pecas/esquemas";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/ia/peca  { empresaId, conteudoId, modo }
 * Gera a peça pronta do conteúdo (texto estruturado de carrossel, estático,
 * vídeo ou roteiro falado) e grava em conteudos.pecas. As imagens e o vídeo
 * são desenhados depois, no navegador, a partir desse texto.
 */
export async function POST(req: NextRequest) {
  let corpo: { empresaId?: unknown; conteudoId?: unknown; modo?: unknown } = {};
  try { corpo = await req.json(); } catch { /* corpo vazio */ }
  const auth = await autorizarIA(corpo.empresaId);
  if (auth instanceof NextResponse) return auth;
  const { supabase, empresa } = auth;

  if (typeof corpo.conteudoId !== "string" || !/^[0-9a-f-]{36}$/i.test(corpo.conteudoId)) return respostaErro(new ErroIA("Conteúdo inválido.", 400));
  const { data: conteudo } = await supabase.from("conteudos").select("*").eq("id", corpo.conteudoId).eq("empresa_id", empresa.id).maybeSingle();
  if (!conteudo) return respostaErro(new ErroIA("Conteúdo não encontrado.", 404));
  const modo = corpo.modo as ModoPeca;
  if (!modosPossiveis(conteudo.formato).includes(modo)) return respostaErro(new ErroIA("Tipo de peça não combina com o formato do conteúdo.", 400));

  try {
    const { system, usuario } = montarPromptPeca(empresa, modo, conteudo);
    const stream = obterClienteIA().messages.stream(
      {
        model: MODELO_IA,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content: usuario }],
        output_config: { format: zodOutputFormat(SAIDAS[modo]), effort: "medium" },
      },
      { signal: req.signal },
    );
    const mensagem = await stream.finalMessage();
    if (mensagem.stop_reason === "max_tokens") throw new ErroIA("A resposta da IA ficou longa demais e foi cortada. Tente de novo.", 502);
    if (mensagem.stop_reason === "refusal") throw new ErroIA("A IA recusou gerar esta peça.", 502);
    if (!mensagem.parsed_output) throw new ErroIA("A IA devolveu um JSON inválido. Tente de novo.", 502);

    const { peca, problemas } = normalizarPeca(modo, mensagem.parsed_output);
    if (!peca) throw new ErroIA("A peça gerada não passou na validação. Tente de novo.", 502, problemas);

    const { data, error } = await supabase.from("conteudos").update({ pecas: peca }).eq("id", conteudo.id).eq("empresa_id", empresa.id).select("id");
    if (error) {
      if (/pecas/.test(error.message)) throw new ErroIA("O banco ainda não tem o campo de peças. Rode a migração 0007 no Supabase.", 500);
      throw new ErroIA(error.code === "42501" ? "Você não tem permissão para salvar a peça." : error.message, 500);
    }
    if (!data?.length) throw new ErroIA("Você não tem permissão para salvar a peça.", 403);
    return NextResponse.json({ pecas: peca });
  } catch (e) {
    return respostaErro(traduzirErroIA(e));
  }
}
