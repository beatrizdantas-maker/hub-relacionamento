export async function POST(request) {
  try {
    const { texto } = await request.json();
    if (!texto?.trim()) {
      return Response.json({ error: "Texto vazio" }, { status: 400 });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: "Você é um assistente escolar. Resuma transcrições de conversas sobre alunos de forma clara e objetiva em português brasileiro. Se o texto for curto (até 500 palavras), use no máximo 8 frases. Se o texto for longo (mais de 500 palavras, como reuniões longas), use até 12 frases. Foque no problema central, na situação do aluno e nas ações sugeridas ou combinadas.",
        messages: [{ role: "user", content: `Resuma este relato:\n\n${texto}` }],
      }),
    });

    const data = await res.json();
    const resumo = data.content?.[0]?.text || "Não foi possível gerar o resumo.";
    return Response.json({ resumo });
  } catch (err) {
    return Response.json({ error: "Erro interno: " + err.message }, { status: 500 });
  }
}
