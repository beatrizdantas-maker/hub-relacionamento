import { NextResponse, type NextRequest } from "next/server";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { autorizarIA, respostaErro } from "@/lib/ia/autorizar";
import { ErroIA, MODELO_IA, obterClienteIA, traduzirErroIA } from "@/lib/ia/cliente";
import { carregarContextoIA, intervaloAgendados } from "@/lib/ia/contexto";
import { SaidaSemanaCalendario, SaidaSemanaLinkedin, validarSemana, type DiaGerado, type DiaGeradoLinkedin } from "@/lib/ia/esquemas";
import { MENSAGEM_MIGRACAO_LINKEDIN, faltaMigracaoLinkedin, redeDe, redesDaEmpresa, ritmoLinkedinOuPadrao } from "@/lib/redes";
import { montarPromptSemanaCalendario } from "@/lib/ia/prompts";
import { gerarTarefasPadrao } from "@/lib/tarefasPadrao";
import { diaDaSemana, ehDataISO, inicioDaSemana, somarDias } from "@/lib/datas";
import { TIPOS_TELA } from "@/lib/validacao/conteudo";
import { formatarOrientacao, formatarRoteiro } from "@/lib/ia/briefing";
import { juntarLegenda } from "@/lib/ia/hashtags";
import type { RitmoDia, TelaStory } from "@/lib/tipos/database";

export const runtime = "nodejs";
export const maxDuration = 300;

export interface ResultadoSemanaIA {
  segunda: string;
  pedidos: number;
  pulados: string[];          // datas que já tinham conteúdo ou não têm slot no ritmo
  criados: { data: string; tema: string; formato: string }[];
  stories: number;
  tarefas: number;
  avisos: string[];
}

function telasDe(stories: DiaGerado["stories"]): TelaStory[] {
  return stories.telas.slice(0, 4).map((t) => {
    const tipo = (TIPOS_TELA as readonly string[]).includes(t.tipo) ? t.tipo : "Texto";
    const interacao: TelaStory["interacao"] = {};
    if (t.pergunta?.trim()) interacao.pergunta = t.pergunta.trim().slice(0, 300);
    if (t.opcoes?.length) interacao.opcoes = t.opcoes.map((o) => o.trim().slice(0, 60)).filter(Boolean).slice(0, 4);
    if (t.emoji?.trim()) interacao.emoji = t.emoji.trim().slice(0, 8);
    return { tipo, texto: t.texto.trim().slice(0, 1000), interacao: Object.keys(interacao).length ? interacao : null };
  });
}

/**
 * POST /api/ia/calendario  { empresaId, dias: ["AAAA-MM-DD", …], rede? }  (todos na mesma semana)
 * Gera conteúdo + stories + tarefas padrão para cada dia pedido que tenha slot
 * no ritmo semanal e ainda esteja vazio. Tudo entra como sugestão da IA.
 * Com `rede: "linkedin"` usa o ritmo do LinkedIn e não gera stories.
 */
export async function POST(req: NextRequest) {
  let corpo: { empresaId?: unknown; dias?: unknown; rede?: unknown } = {};
  try { corpo = await req.json(); } catch { /* corpo vazio */ }
  const auth = await autorizarIA(corpo.empresaId);
  if (auth instanceof NextResponse) return auth;
  const { supabase, empresa, hoje } = auth;

  const dias = Array.isArray(corpo.dias) ? [...new Set(corpo.dias.filter((d): d is string => typeof d === "string" && ehDataISO(d)))].sort() : [];
  if (!dias.length || dias.length > 7) return respostaErro(new ErroIA("Informe de 1 a 7 datas.", 400));
  const segunda = inicioDaSemana(dias[0]);
  if (dias.some((d) => inicioDaSemana(d) !== segunda)) return respostaErro(new ErroIA("As datas precisam estar na mesma semana.", 400));
  if (dias.some((d) => d < hoje)) return respostaErro(new ErroIA("Não dá para gerar conteúdo para dias que já passaram.", 400));

  const rede = corpo.rede === "linkedin" ? "linkedin" : "instagram";
  if (rede === "linkedin" && !redesDaEmpresa(empresa).includes("linkedin")) return respostaErro(new ErroIA("Ative o LinkedIn em Marca → LinkedIn antes de gerar.", 400));
  const ritmo: RitmoDia[] = rede === "linkedin" ? ritmoLinkedinOuPadrao(empresa.ritmo_linkedin) : empresa.ritmo_semanal ?? [];
  if (!ritmo.length) return respostaErro(new ErroIA("Defina o ritmo semanal em Marca antes de gerar o mês.", 400));

  try {
    // Sem filtrar a rede no banco: funciona mesmo antes da migração do LinkedIn.
    const { data: existentes } = await supabase.from("conteudos").select("*").eq("empresa_id", empresa.id).in("data", dias);
    const ocupados = new Set((existentes ?? []).filter((c) => redeDe(c) === rede).map((c) => c.data));
    const resultado: ResultadoSemanaIA = { segunda, pedidos: dias.length, pulados: [], criados: [], stories: 0, tarefas: 0, avisos: [] };

    const paraGerar: { data: string; ritmo: RitmoDia }[] = [];
    for (const data of dias) {
      const slot = ritmo.find((r) => r.dia === diaDaSemana(data));
      if (!slot || ocupados.has(data)) { resultado.pulados.push(data); continue; }
      paraGerar.push({ data, ritmo: slot });
    }
    if (!paraGerar.length) return NextResponse.json(resultado);

    const ctx = await carregarContextoIA(supabase, empresa, hoje, { ...intervaloAgendados(hoje), ate: somarDias(segunda, 6) > somarDias(hoje, 42) ? somarDias(segunda, 6) : somarDias(hoje, 42) });
    const { system, usuario } = montarPromptSemanaCalendario(ctx, paraGerar, rede);

    const stream = obterClienteIA().messages.stream(
      {
        model: MODELO_IA,
        max_tokens: 32000,
        system,
        messages: [{ role: "user", content: usuario }],
        output_config: { format: rede === "linkedin" ? zodOutputFormat(SaidaSemanaLinkedin) : zodOutputFormat(SaidaSemanaCalendario), effort: "medium" },
      },
      { signal: req.signal },
    );
    const mensagem = await stream.finalMessage();
    if (mensagem.stop_reason === "max_tokens") throw new ErroIA("A resposta da IA ficou longa demais e foi cortada. Tente gerar menos dias.", 502);
    if (mensagem.stop_reason === "refusal") throw new ErroIA("A IA recusou gerar este conteúdo.", 502);
    const saida = mensagem.parsed_output;
    if (!saida) throw new ErroIA("A IA devolveu um JSON inválido. Tente de novo.", 502);

    const { validos, problemas } = validarSemana<DiaGeradoLinkedin & { stories?: DiaGerado["stories"] }>(saida, paraGerar.map((d) => d.data), rede === "instagram");
    resultado.avisos.push(...problemas.map((p) => `${p.campo}: ${p.mensagem}`));
    if (!validos.length) throw new ErroIA("Nenhum dia veio válido da IA. Tente de novo.", 502, resultado.avisos);

    for (const dia of validos) {
      const slot = paraGerar.find((d) => d.data === dia.data)!.ritmo;
      const { data: conteudo, error } = await supabase
        .from("conteudos")
        .insert({
          empresa_id: empresa.id,
          data: dia.data,
          hora: slot.hora,
          formato: slot.formato,
          tipo: slot.tipo,
          pilar: dia.pilar.trim().slice(0, 80) || slot.pilar,
          tema: dia.tema.trim().slice(0, 200),
          objetivo: (dia.objetivo.trim() || slot.objetivo).slice(0, 120),
          roteiro: formatarRoteiro(slot.formato, dia),
          legenda: juntarLegenda(dia.legenda, dia.hashtags, rede === "linkedin" ? 5 : 10),
          cta: dia.cta.trim().slice(0, 300),
          orientacao_arte: formatarOrientacao(dia),
          ganchos: slot.formato === "Reels" ? dia.ganchos.map((g) => g.trim().slice(0, 300)).slice(0, 3) : [],
          status: "sugestao",
          origem: "ia",
          ...(rede === "linkedin" ? { rede: "linkedin" as const } : {}),
        })
        .select("id")
        .maybeSingle();
      if (error && faltaMigracaoLinkedin(error)) throw new ErroIA(MENSAGEM_MIGRACAO_LINKEDIN, 409);
      if (error || !conteudo) {
        resultado.avisos.push(`${dia.data}: não foi possível gravar (${error?.code === "42501" ? "sem permissão" : error?.message ?? "erro"})`);
        continue;
      }
      resultado.criados.push({ data: dia.data, tema: dia.tema.trim(), formato: slot.formato });

      if (rede === "instagram" && dia.stories) {
        const { error: erroStory } = await supabase.from("stories").insert({
          empresa_id: empresa.id, data: dia.data, objetivo: dia.stories.objetivo.trim().slice(0, 200) || null,
          telas: telasDe(dia.stories), status: "sugestao", origem: "ia", conteudo_id: conteudo.id,
        });
        if (erroStory) resultado.avisos.push(`${dia.data}: stories não gravados (${erroStory.message})`);
        else resultado.stories += 1;
      }

      const tarefas = gerarTarefasPadrao({ formato: slot.formato, tipo: slot.tipo, data: dia.data, hoje, tema: dia.tema });
      const { error: erroTarefas } = await supabase.from("tarefas").insert(tarefas.map((t) => ({ ...t, empresa_id: empresa.id, conteudo_id: conteudo.id, origem: "ia" as const })));
      if (erroTarefas) resultado.avisos.push(`${dia.data}: tarefas não criadas (${erroTarefas.message})`);
      else resultado.tarefas += tarefas.length;
    }

    return NextResponse.json(resultado);
  } catch (e) {
    return respostaErro(traduzirErroIA(e));
  }
}
