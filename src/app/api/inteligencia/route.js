import Anthropic from "@anthropic-ai/sdk";
import { usuarioAutenticado, naoAutorizado, erroAmigavel, textoDaResposta } from "../../../lib/api-auth";

// A IA NÃO conta nada: ela recebe os números já calculados pelo navegador e
// devolve leitura e recomendação de ação. Isso mantém o custo baixo e evita
// que ela "invente" estatística.
const SISTEMA = `Você é analista de relacionamento escolar. Recebe indicadores JÁ CALCULADOS de uma escola e escreve uma leitura executiva para a direção, em português do Brasil.

REGRAS OBRIGATÓRIAS:
- Use SOMENTE os números recebidos. Nunca invente, estime ou recalcule.
- Se um dado não veio, não fale sobre ele.
- Tom profissional e direto, sem jargão corporativo e sem dramatizar.
- Ao citar um aluno, use o nome exatamente como veio.
- Toda prioridade precisa de uma AÇÃO concreta e executável, não conselho genérico.
- Nunca rotule criança. Fale de situação e de necessidade de acompanhamento.
- Pontuação positiva significa situação de atenção; negativa significa elogio ou avanço.
- Campos que terminam em "%" são VARIAÇÃO PERCENTUAL, nunca quantidade. "+139%" quer dizer
  que o volume mais que dobrou, e não que houve 139 registros a mais.
- Em turma com poucos alunos, um percentual alto pode vir de pouquíssimos registros. Diga isso
  quando acontecer, em vez de tratar como problema grave.

Responda APENAS com JSON válido, sem markdown, neste formato:
{
  "sintese": "1 frase dizendo o ponto central do período",
  "observar_agora": "2 a 4 frases sobre o que a gestão deve olhar imediatamente, citando números",
  "prioridades": [
    {"titulo":"curto","detalhe":"o dado que sustenta","acao":"o que fazer"}
  ],
  "indo_bem": ["3 a 5 destaques positivos concretos, com número"],
  "atencao_silenciosa": ["até 3 padrões que passariam despercebidos"]
}
A lista "prioridades" deve ter no máximo 5 itens, da mais urgente para a menos.`;

export async function POST(request) {
  try {
    if (!(await usuarioAutenticado(request))) return naoAutorizado();

    const { resumo } = await request.json();
    if (!resumo) return Response.json({ error: "Sem dados para analisar" }, { status: 400 });
    if (!resumo.saude || !resumo.saude.total) {
      return Response.json({ error: "Não há registros no período escolhido." }, { status: 400 });
    }

    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 6000,
      system: SISTEMA,
      messages: [{ role: "user", content: "Indicadores do período:\n\n" + JSON.stringify(resumo, null, 1) }],
    });

    const txt = textoDaResposta(msg);
    const limpo = txt.replace(/```json|```/g, "").trim();
    return Response.json({ analise: JSON.parse(limpo) });
  } catch (err) {
    const e = erroAmigavel(err);
    console.error("[inteligencia]", err);
    return Response.json({ error: e.msg }, { status: e.status });
  }
}
