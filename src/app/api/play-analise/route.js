import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { usuarioAutenticado, naoAutorizado, textoDaResposta } from "../../../lib/api-auth";

const client = new Anthropic();

export async function POST(req) {
  if (!(await usuarioAutenticado(req))) return naoAutorizado();

  const { totalAlunos, comPontos, semPontos, media, desengajados, bimestre } = await req.json();
  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: `Analise estes dados de engajamento escolar do ${bimestre}º bimestre: Total: ${totalAlunos}, Com pontos: ${comPontos}, Sem pontos: ${semPontos}, Média: ${media}, Em risco: ${desengajados}. Escreva análise pedagógica em português, máximo 4 frases, com sugestão prática.` }]
    });
    return NextResponse.json({ analise: textoDaResposta(msg) });
  } catch {
    return NextResponse.json({ analise: "Não foi possível gerar a análise." });
  }
}
