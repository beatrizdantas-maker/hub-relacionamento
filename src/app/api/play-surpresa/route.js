import { NextResponse } from "next/server";
import Anthropic from "@anthropic/sdk";

const client = new Anthropic();

export async function POST(req) {
  const { tema, nomeMoneda = "moedas" } = await req.json();
  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Crie uma missão surpresa gamificada para uma aula escolar sobre "${tema}".
Responda APENAS em JSON válido, sem markdown, no formato:
{"nome":"nome criativo da missão","pontos":número entre 15 e 50,"descricao":"descrição curta e motivadora em 1 frase"}
O nome deve ser empolgante e relacionado ao tema. A descrição deve deixar o aluno animado.`
      }]
    });
    const missao = JSON.parse(msg.content[0].text);
    return NextResponse.json({ missao });
  } catch {
    return NextResponse.json({ missao: { nome: "Desafio da aula!", pontos: 20, descricao: "Participe ativamente e genha pontos!" } });
  }
}