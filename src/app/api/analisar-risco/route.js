export async function POST(request) {
  try {
    const { aluno, comunicacoes, reunioes, score } = await request.json();

    const historicoTexto = comunicacoes.map(c =>
      `- [${c.data_registro}] ${c.motivo_nome || c.titulo} (${c.motivo_pontos > 0 ? "+" : ""}${c.motivo_pontos || 0} pts) — Status: ${c.status}${c.resolucao ? ` — Resolvido: ${c.resolucao}` : ""}`
    ).join("\n");

    const reunioesTexto = reunioes.map(r => {
      const conv = r.convocados?.find(c => c.aluno_id === aluno.id);
      return `- [${r.data_reuniao}] ${r.titulo} — Família: ${conv?.compareceu ? "COMPARECEU" : "NÃO COMPARECEU"}`;
    }).join("\n");

    const prompt = `Você é um especialista em retenção escolar e psicopedagogia. Analise o histórico abaixo de um aluno e gere um parecer de risco de evasão.

ALUNO: ${aluno.nome}
TURMA: ${aluno.turma || "Não informada"}
SCORE ATUAL: ${score} pontos
RESPONSÁVEL: ${aluno.responsavel || "Não informado"}

HISTÓRICO DE COMUNICAÇÕES (${comunicacoes.length} registros):
${historicoTexto || "Nenhuma comunicação registrada."}

HISTÓRICO DE REUNIÕES (${reunioes.length} reuniões):
${reunioesTexto || "Nenhuma reunião registrada."}

Com base nesses dados, responda EXATAMENTE neste formato JSON (sem markdown, sem texto extra):
{
  "nivel": "BAIXO" ou "MÉDIO" ou "ALTO" ou "CRÍTICO",
  "justificativa": "Análise em 2-3 frases explicando o risco baseado nos dados concretos",
  "acao_sugerida": "Ação específica e prática recomendada para reduzir o risco de evasão"
}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const texto = data.content?.[0]?.text || "{}";

    let analise;
    try {
      analise = JSON.parse(texto);
    } catch {
      analise = {
        nivel: "MÉDIO",
        justificativa: "Não foi possível gerar análise detalhada. Verifique o histórico manualmente.",
        acao_sugerida: "Realizar contato direto com a família e agendar reunião.",
      };
    }

    return Response.json({ analise });
  } catch (err) {
    return Response.json({ error: "Erro interno: " + err.message }, { status: 500 });
  }
}
