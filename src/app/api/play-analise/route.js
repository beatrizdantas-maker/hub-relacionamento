import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req) {
  const { totalAlunos, comPontos, semPontos, media, desengajados, bimestre, nomeMoeda } = await req.json();
  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 500,
      messages: [{ role: "user", content: `Analise estes dados de engajamento escolar do ${bimestre}º bimestre: Total: ${totalAlunos}, Com pontos: ${comPontos}, Sem pontos: ${semPontos}, Média: ${media}, Em risco: ${desengajados}. Escreva análise pedagógica em português, máximo 4 frases, com sugestão prática.` }]
    });
    return NextResponse.json({ analise: msg.content[0].text });
  } catch {
    return NextResponse.json({ analise: "Não foi possível gerar a análise." });
  }
}