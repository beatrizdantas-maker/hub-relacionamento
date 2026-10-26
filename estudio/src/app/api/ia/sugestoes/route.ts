import { NextResponse, type NextRequest } from "next/server";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { autorizarIA, respostaErro } from "@/lib/ia/autorizar";
import { ErroIA, MODELO_IA, obterClienteIA, traduzirErroIA } from "@/lib/ia/cliente";
import { carregarContextoIA, intervaloAgendados } from "@/lib/ia/contexto";
import { SaidaSugestao, validarSugestao } from "@/lib/ia/esquemas";
import { montarPromptSugestoes } from "@/lib/ia/prompts";
import { ehDataISO, inicioDaSemana, somarDias } from "@/lib/datas";
import type { IdeiaSugestao } from "@/lib/tipos/database";
import { juntarLegenda } from "@/lib/ia/hashtags";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/ia/sugestoes  { empresaId, semana? }
 * Gera as sugestões de uma semana (padrão: a próxima) e grava em `sugestoes`.
 * Cancelar a requisição no navegador cancela a chamada à IA (nada é gravado).
 */
export async function POST(req: NextRequest) {
  let corpo: { empresaId?: unknown; semana?: unknown } = {};
  try { corpo = await req.json(); } catch { /* corpo vazio */ }
  const auth = await autorizarIA(corpo.empresaId);
  if (auth instanceof NextResponse) return auth;
  const { supabase, empresa, hoje, usuarioId } = auth;

  const estaSemana = inicioDaSemana(hoje);
  const semana = typeof corpo.semana === "string" && ehDataISO(corpo.semana) && inicioDaSemana(corpo.semana) === corpo.semana && corpo.semana >= estaSemana
    ? corpo.semana
    : somarDias(estaSemana, 7);
  const fim = somarDias(semana, 6);

  try {
    const ctx = await carregarContextoIA(supabase, empresa, hoje, { ...intervaloAgendados(hoje), ate: fim > somarDias(hoje, 42) ? fim : somarDias(hoje, 42) });
    const { system, usuario } = montarPromptSugestoes(ctx, semana);

    const stream = obterClienteIA().messages.stream(
      {
        model: MODELO_IA,
        max_tokens: 12000,
        system,
        messages: [{ role: "user", content: usuario }],
        output_config: { format: zodOutputFormat(SaidaSugestao) },
      },
      { signal: req.signal },
    );
    const mensagem = await stream.finalMessage();
    if (mensagem.stop_reason === "max_tokens") throw new ErroIA("A resposta da IA ficou longa demais e foi cortada. Tente de novo.", 502);
    if (mensagem.stop_reason === "refusal") throw new ErroIA("A IA recusou gerar este conteúdo.", 502);
    const saida = mensagem.parsed_output;
    if (!saida) throw new ErroIA("A IA devolveu um JSON inválido. Tente de novo.", 502);

    // Ideias fora da semana são descartadas; o resto precisa estar inteiro.
    const ideias = saida.ideias.filter((i) => ehDataISO(i.dia) && i.dia >= semana && i.dia <= fim && i.titulo.trim() && i.cta.trim() && i.legenda.trim());
    const problemas = validarSugestao({ ...saida, ideias }, semana, fim);
    if (problemas.length) throw new ErroIA("A resposta da IA não passou na validação. Tente de novo.", 502, problemas.map((p) => `${p.campo}: ${p.mensagem}`));

    const { data, error } = await supabase
      .from("sugestoes")
      .insert({
        empresa_id: empresa.id,
        semana,
        gerado_por: usuarioId,
        resumo: saida.resumo.trim(),
        dados_reais_usados: ctx.dadosReais.linhas,   // preenchido pelo sistema, nunca pela IA
        manter: saida.manter.map((s) => s.trim()).filter(Boolean),
        melhorar: saida.melhorar.map((s) => s.trim()).filter(Boolean),
        testar: saida.testar.map((s) => s.trim()).filter(Boolean),
        ideias: ideias.map((i) => ({ titulo: i.titulo.trim(), formato: i.formato, dia: i.dia, motivo: i.motivo.trim(), legenda: juntarLegenda(i.legenda, i.hashtags), cta: i.cta.trim(), conteudo_id: null })) satisfies IdeiaSugestao[],
      })
      .select("*")
      .maybeSingle();
    if (error) throw new ErroIA(error.code === "42501" ? "Você não tem permissão para gravar sugestões." : error.message, 500);
    if (!data) throw new ErroIA("Não foi possível gravar a sugestão.", 500);

    return NextResponse.json({ sugestao: data, uso: { entrada: mensagem.usage.input_tokens, saida: mensagem.usage.output_tokens } });
  } catch (e) {
    return respostaErro(traduzirErroIA(e));
  }
}
