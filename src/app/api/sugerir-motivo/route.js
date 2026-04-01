import Anthropic from "@anthropic-ai/sdk";

export async function POST(req) {
  try {
    const { relato, motivos } = await req.json();
    if (!relato || relato.trim().length < 5) {
      return Response.json({ error: "Relato muito curto" }, { status: 400 });
    }

    const client = new Anthropic();
    const listaMotivos = (motivos || []).map(m =>
      `- id:${m.id} nome:"${m.nome}" pontos:${m.pontos}`
    ).join("\n");

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Analise este relato escolar e identifique o motivo mais adequado da lista.

RELATO: "${relato}"

MOTIVOS DISPONÍVEIS:
${listaMotivos}

Responda APENAS com JSON puro, sem markdown:
Se encontrou motivo adequado: {"encontrado":true,"id":"id-exato","nome":"nome","pontos":numero}
Se não encontrou: {"encontrado":false,"nome":"nome curto sugerido","pontos":numero de 5 a 30}

Regra de pontos: positivo = situação de risco/problema. Negativo = situação positiva.`
      }]
    });

    const txt = msg.content[0]?.text || "";
    const clean = txt.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
