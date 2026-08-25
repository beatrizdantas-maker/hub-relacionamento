import Anthropic from "@anthropic-ai/sdk";
import { usuarioAutenticado, naoAutorizado, erroAmigavel, textoDaResposta } from "../../../lib/api-auth";

// A IA lê uma amostra dos relatos e devolve os TEMAS com os termos que os
// identificam. Ela não conta nada: quem conta é o navegador, sobre todos os
// relatos do período. Por isso o custo não cresce com o volume de registros.
const SISTEMA = `Você analisa relatos escritos por profissionais de uma escola sobre situações com estudantes, em português do Brasil.

Sua tarefa: ler os relatos e identificar os TEMAS REAIS que aparecem no texto, ignorando qualquer rótulo ou categoria pré-existente.

REGRAS OBRIGATÓRIAS:
- Os temas devem sair do CONTEÚDO do que foi escrito, não de categorias genéricas.
- Prefira temas específicos e acionáveis ("atraso na entrega de tarefas", "conflito entre colegas no intervalo") a temas vagos ("problemas", "questões escolares").
- Entre 5 e 10 temas em cada lista. Se um assunto aparece uma vez só, não vire tema.
- Para cada tema, liste de 4 a 10 TERMOS que servem para reconhecê-lo em outro texto.
- Os termos devem ser trechos curtos em minúsculas, sem acento, que apareceriam literalmente no relato
  (ex: "nao entregou", "faltou", "briga", "chorou", "sem uniforme"). Prefira raízes de palavras
  ("atras" pega atraso, atrasos, atrasado). Evite termos genéricos demais como "aluno", "aula", "mae".
- "atencao" = situações de dificuldade, risco ou problema. "positivo" = elogios, avanços e conquistas.
- Nunca invente conteúdo que não esteja nos relatos. Nunca cite nome de estudante.

Responda APENAS com JSON válido, sem markdown:
{
  "atencao":  [ {"nome":"nome curto do tema","descricao":"uma frase do que é","termos":["termo","termo"]} ],
  "positivo": [ {"nome":"...","descricao":"...","termos":["...","..."]} ]
}`;

export async function POST(request) {
  try {
    if (!(await usuarioAutenticado(request))) return naoAutorizado();

    const { relatos } = await request.json();
    if (!Array.isArray(relatos) || relatos.length < 5)
      return Response.json({ error: "Poucos relatos com texto no período para identificar temas." }, { status: 400 });

    const atencao = relatos.filter(r => !r.positivo).map(r => r.texto);
    const positivo = relatos.filter(r => r.positivo).map(r => r.texto);

    const entrada =
      `RELATOS DE ATENÇÃO (${atencao.length}):\n` +
      atencao.map((t, i) => `${i + 1}. ${t}`).join("\n") +
      `\n\nRELATOS POSITIVOS (${positivo.length}):\n` +
      (positivo.length ? positivo.map((t, i) => `${i + 1}. ${t}`).join("\n") : "(nenhum na amostra)");

    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 8000,
      system: SISTEMA,
      messages: [{ role: "user", content: entrada }],
    });

    const limpo = textoDaResposta(msg).replace(/```json|```/g, "").trim();
    const temas = JSON.parse(limpo);
    return Response.json({ temas });
  } catch (err) {
    const e = erroAmigavel(err);
    console.error("[temas]", err);
    return Response.json({ error: e.msg }, { status: e.status });
  }
}
