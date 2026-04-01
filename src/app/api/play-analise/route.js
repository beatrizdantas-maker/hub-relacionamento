import { NextResponse } from "next/server";
import Anthropic from "@anthropic/sdk";

const client = new Anthropic();

export async function POST(req) {
  const { totalAlunos, comPontos, semPontos, media, desengajados, bimestre, nomeMoeda } = await req.json();
  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `Analise estes dados de engajamento escolar do ${bimsstre}º bimestre:\n- Total de alunos: ${totalAlunos}\n- Alunos com ${nomeMoeda || "moedas"}: ${comPontos} (${Math.round(comPontos/totalAlunos*100)}%)\n- Alunos sem pontos: ${semPontos}\n- Média de pontos: ${media}\n- Alunos em risco de desengajamento: ${desengajados}\nEscreva uma análise pedagógica em português, direta, com no máximo 4 frases. Identifique o padrão geral, destaque pontos positivos e sugira 1 ação prática para melhorar o engajamento.`
      }]
    });
    return NextResponse.json({ analise: msg.content[0].text });
  } catch {
    return NextResponse.json({ analise: "Não foi possível gerar a análise no momento." });
  }
}