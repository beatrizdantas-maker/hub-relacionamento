"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { esquemaConteudo, esquemaStory, type EntradaConteudo, type EntradaStory } from "@/lib/validacao/conteudo";
import { gerarTarefasPadrao } from "@/lib/tarefasPadrao";
import { hojeNaEmpresa, somarDias } from "@/lib/datas";
import { deslocarPrazos } from "@/lib/reagendar";
import type { Conteudo, Story, Tarefa, TelaStory } from "@/lib/tipos/database";
import { FORMATOS_POR_REDE, MENSAGEM_MIGRACAO_LINKEDIN, faltaMigracaoLinkedin, redeDe, rotuloFormato, rotuloRede } from "@/lib/redes";
import { BUCKET_MIDIAS, MAX_CARROSSEL, problemasPublicacao, type ArquivoPublicacao } from "@/lib/publicacao";

type Erro = { ok: false; erro: string };

function mensagemErro(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return "Algo deu errado. Tente de novo.";
  if (faltaMigracaoLinkedin(e)) return MENSAGEM_MIGRACAO_LINKEDIN;
  if (e.code === "42501" || /row-level security|permission denied/i.test(e.message ?? "")) {
    return e.message && !/row-level security|permission denied/i.test(e.message) ? e.message : "Você não tem permissão para fazer isso.";
  }
  return e.message ?? "Algo deu errado. Tente de novo.";
}

async function fusoDaEmpresa(empresaId: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("empresas").select("fuso_horario").eq("id", empresaId).maybeSingle();
  return data?.fuso_horario ?? "America/Sao_Paulo";
}

function revalidar() {
  revalidatePath("/calendario");
  revalidatePath("/");
  revalidatePath("/tarefas");
}

/** Apaga do Storage os arquivos de publicação dos posts removidos (melhor esforço). */
async function apagarArquivosDe(supabase: Awaited<ReturnType<typeof criarClienteServidor>>, conteudos: Pick<Conteudo, "arquivos">[]) {
  const caminhos = conteudos.flatMap((c) => (Array.isArray(c.arquivos) ? c.arquivos.map((a) => a.caminho) : []));
  if (caminhos.length) await supabase.storage.from(BUCKET_MIDIAS).remove(caminhos).catch(() => undefined);
}

// ---------------- Conteúdos ----------------

/**
 * Cria ou atualiza um conteúdo. Mudar a data é reagendar: as tarefas ligadas
 * continuam ligadas e os prazos das tarefas abertas deslocam junto (nunca
 * para antes de hoje).
 */
export async function salvarConteudo(
  empresaId: string,
  entrada: EntradaConteudo,
  opcoes: { criarTarefasPadrao?: boolean } = {},
): Promise<{ ok: true; conteudo: Conteudo; reagendadoDe: string | null; tarefasCriadas: number } | Erro> {
  const parse = esquemaConteudo.safeParse(entrada);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await criarClienteServidor();
  const { id, rede: redePedida, ...campos } = parse.data;

  let reagendadoDe: string | null = null;
  let conteudo: Conteudo;

  if (id) {
    // A rede não muda depois de criado; select("*") funciona mesmo sem a coluna.
    const { data: anterior } = await supabase.from("conteudos").select("*").eq("id", id).eq("empresa_id", empresaId).maybeSingle();
    if (!anterior) return { ok: false, erro: "Conteúdo não encontrado." };
    const rede = redeDe(anterior);
    if (!FORMATOS_POR_REDE[rede].includes(campos.formato) && campos.formato !== anterior.formato) return { ok: false, erro: `${rotuloFormato(campos.formato, rede)} não é um formato do ${rotuloRede(rede)}.` };
    const { data, error } = await supabase.from("conteudos").update(campos).eq("id", id).eq("empresa_id", empresaId).select("*");
    if (error) return { ok: false, erro: mensagemErro(error) };
    if (!data?.length) return { ok: false, erro: "Você não tem permissão para editar este conteúdo." };
    conteudo = data[0];
    if (anterior.data !== conteudo.data) {
      reagendadoDe = anterior.data;
      const hoje = hojeNaEmpresa(await fusoDaEmpresa(empresaId));
      const { data: tarefas } = await supabase.from("tarefas").select("id, prazo, status").eq("conteudo_id", id);
      for (const t of deslocarPrazos(tarefas ?? [], anterior.data, conteudo.data, hoje)) {
        await supabase.from("tarefas").update({ prazo: t.prazo }).eq("id", t.id);
      }
    }
  } else {
    const rede = redePedida ?? "instagram";
    if (!FORMATOS_POR_REDE[rede].includes(campos.formato)) return { ok: false, erro: `${rotuloFormato(campos.formato, rede)} não é um formato do ${rotuloRede(rede)}.` };
    // Só manda a coluna quando é LinkedIn: o Instagram continua funcionando antes da migração 0007.
    const { data, error } = await supabase.from("conteudos").insert({ ...campos, ...(rede === "linkedin" ? { rede } : {}), empresa_id: empresaId, origem: "equipe" }).select("*");
    if (error) return { ok: false, erro: mensagemErro(error) };
    if (!data?.length) return { ok: false, erro: "Você não tem permissão para criar conteúdo." };
    conteudo = data[0];
  }

  let tarefasCriadas = 0;
  if (opcoes.criarTarefasPadrao) {
    const r = await criarTarefasPadrao(empresaId, conteudo.id);
    if (r.ok) tarefasCriadas = r.criadas;
  }

  revalidar();
  return { ok: true, conteudo, reagendadoDe, tarefasCriadas };
}

export async function mudarStatusConteudo(empresaId: string, id: string, status: Conteudo["status"]): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("conteudos").update({ status }).eq("id", id).eq("empresa_id", empresaId).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para mudar o status." };
  revalidar();
  return { ok: true };
}

export async function excluirConteudo(empresaId: string, id: string): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("conteudos").delete().eq("id", id).eq("empresa_id", empresaId).select("*");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para excluir este conteúdo." };
  await apagarArquivosDe(supabase, data);
  revalidar();
  return { ok: true };
}

/** Aprova todas as sugestões (conteúdos e stories) de uma semana. */
export async function aprovarSugestoesDaSemana(empresaId: string, segunda: string): Promise<{ ok: true; aprovados: number } | Erro> {
  const supabase = await criarClienteServidor();
  const domingo = somarDias(segunda, 6);
  const [c, s] = await Promise.all([
    supabase.from("conteudos").update({ status: "aprovado" }).eq("empresa_id", empresaId).eq("status", "sugestao").gte("data", segunda).lte("data", domingo).select("id"),
    supabase.from("stories").update({ status: "aprovado" }).eq("empresa_id", empresaId).eq("status", "sugestao").gte("data", segunda).lte("data", domingo).select("id"),
  ]);
  if (c.error) return { ok: false, erro: mensagemErro(c.error) };
  if (s.error) return { ok: false, erro: mensagemErro(s.error) };
  revalidar();
  return { ok: true, aprovados: (c.data?.length ?? 0) + (s.data?.length ?? 0) };
}

/** Cria as tarefas padrão de um conteúdo (não duplica as que já existem com o mesmo título). */
export async function criarTarefasPadrao(empresaId: string, conteudoId: string): Promise<{ ok: true; criadas: number; tarefas: Tarefa[] } | Erro> {
  const supabase = await criarClienteServidor();
  const { data: conteudo } = await supabase.from("conteudos").select("id, formato, tipo, data, tema").eq("id", conteudoId).eq("empresa_id", empresaId).maybeSingle();
  if (!conteudo) return { ok: false, erro: "Conteúdo não encontrado." };
  const hoje = hojeNaEmpresa(await fusoDaEmpresa(empresaId));
  const padrao = gerarTarefasPadrao({ formato: conteudo.formato, tipo: conteudo.tipo, data: conteudo.data, hoje, tema: conteudo.tema });
  const { data: existentes } = await supabase.from("tarefas").select("titulo").eq("conteudo_id", conteudoId);
  const jaTem = new Set((existentes ?? []).map((t) => t.titulo));
  const novas = padrao.filter((t) => !jaTem.has(t.titulo));
  if (novas.length === 0) {
    const { data: todas } = await supabase.from("tarefas").select("*").eq("conteudo_id", conteudoId).order("prazo");
    return { ok: true, criadas: 0, tarefas: todas ?? [] };
  }
  const { error } = await supabase.from("tarefas").insert(novas.map((t) => ({ ...t, empresa_id: empresaId, conteudo_id: conteudoId, origem: "equipe" as const })));
  if (error) return { ok: false, erro: mensagemErro(error) };
  const { data: todas } = await supabase.from("tarefas").select("*").eq("conteudo_id", conteudoId).order("prazo");
  revalidar();
  return { ok: true, criadas: novas.length, tarefas: todas ?? [] };
}

export async function mudarStatusTarefa(empresaId: string, id: string, status: Tarefa["status"]): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("tarefas").update({ status }).eq("id", id).eq("empresa_id", empresaId).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você só pode mudar o status das suas próprias tarefas." };
  revalidar();
  return { ok: true };
}

// ---------------- Stories ----------------

export async function salvarStory(empresaId: string, entrada: EntradaStory): Promise<{ ok: true; story: Story } | Erro> {
  const parse = esquemaStory.safeParse(entrada);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await criarClienteServidor();
  const { id, ...campos } = parse.data;
  const telas = campos.telas as TelaStory[];
  const consulta = id
    ? supabase.from("stories").update({ ...campos, telas }).eq("id", id).eq("empresa_id", empresaId).select("*")
    : supabase.from("stories").insert({ ...campos, telas, empresa_id: empresaId, origem: "equipe" }).select("*");
  const { data, error } = await consulta;
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para editar stories." };
  revalidar();
  return { ok: true, story: data[0] };
}

export async function mudarStatusStory(empresaId: string, id: string, status: Story["status"]): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("stories").update({ status }).eq("id", id).eq("empresa_id", empresaId).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para mudar o status." };
  revalidar();
  return { ok: true };
}

export async function excluirStory(empresaId: string, id: string): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("stories").delete().eq("id", id).eq("empresa_id", empresaId).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para excluir stories." };
  revalidar();
  return { ok: true };
}

/**
 * Marca como concluídas todas as tarefas abertas de um conteúdo. O banco só
 * deixa o Colaborador concluir as próprias; as outras ficam como estão.
 */
export async function concluirTarefasDoConteudo(empresaId: string, conteudoId: string): Promise<{ ok: true; concluidas: string[] } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("tarefas")
    .update({ status: "concluido" })
    .eq("empresa_id", empresaId)
    .eq("conteudo_id", conteudoId)
    .neq("status", "concluido")
    .select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  revalidar();
  return { ok: true, concluidas: (data ?? []).map((t) => t.id) };
}

/**
 * "Limpar o que passou": apaga o que ficou para trás enquanto o sistema não
 * foi usado — posts e stories com data antes de hoje que não foram marcados
 * como publicados e tarefas com prazo antes de hoje que não foram concluídas.
 * O que foi publicado ou concluído fica no histórico. Só Dono e Editor (RLS).
 */
export async function limparOQuePassou(empresaId: string): Promise<{ ok: true; conteudos: number; stories: number; tarefas: number } | Erro> {
  const supabase = await criarClienteServidor();
  const hoje = hojeNaEmpresa(await fusoDaEmpresa(empresaId));
  // Tarefas primeiro: as dos posts apagados iriam junto (cascade) e não entrariam na conta.
  const t = await supabase.from("tarefas").delete().eq("empresa_id", empresaId).lt("prazo", hoje).neq("status", "concluido").select("id");
  if (t.error) return { ok: false, erro: mensagemErro(t.error) };
  // Posts que o robô ainda está publicando ficam (o vídeo pode estar processando na rede).
  const c = await supabase.from("conteudos").delete().eq("empresa_id", empresaId).lt("data", hoje).neq("status", "publicado")
    .or("publicacao_status.is.null,publicacao_status.neq.processando").select("*");
  if (c.error) return { ok: false, erro: mensagemErro(c.error) };
  await apagarArquivosDe(supabase, c.data ?? []);
  const s = await supabase.from("stories").delete().eq("empresa_id", empresaId).lt("data", hoje).neq("status", "publicado").select("id");
  if (s.error) return { ok: false, erro: mensagemErro(s.error) };
  revalidar();
  return { ok: true, conteudos: c.data?.length ?? 0, stories: s.data?.length ?? 0, tarefas: t.data?.length ?? 0 };
}

// ---------------- Publicação automática ----------------

/** Guarda a lista de arquivos do post (os arquivos já foram enviados ao Storage pelo navegador). */
export async function salvarArquivos(empresaId: string, conteudoId: string, arquivos: ArquivoPublicacao[]): Promise<{ ok: true; arquivos: ArquivoPublicacao[] } | Erro> {
  const prefixo = `${empresaId}/${conteudoId}/`;
  const limpos = (Array.isArray(arquivos) ? arquivos : []).slice(0, MAX_CARROSSEL + 2).map((a) => ({
    caminho: String(a.caminho ?? ""), url: String(a.url ?? ""), tipo: a.tipo === "video" ? ("video" as const) : ("imagem" as const),
    nome: typeof a.nome === "string" ? a.nome.slice(0, 200) : undefined, tamanho: typeof a.tamanho === "number" ? a.tamanho : undefined,
  }));
  if (limpos.some((a) => !a.caminho.startsWith(prefixo) || !a.url.includes(`/${BUCKET_MIDIAS}/${a.caminho}`))) return { ok: false, erro: "Arquivo inválido." };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("conteudos").update({ arquivos: limpos }).eq("id", conteudoId).eq("empresa_id", empresaId).select("id, publicacao_status");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para mudar os arquivos deste post." };
  revalidar();
  return { ok: true, arquivos: limpos };
}

/** Agenda: no dia e hora do post, o robô publica sozinho. Confere antes se está tudo pronto. */
export async function agendarPublicacao(empresaId: string, conteudoId: string): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data: c } = await supabase.from("conteudos").select("*").eq("id", conteudoId).eq("empresa_id", empresaId).maybeSingle();
  if (!c) return { ok: false, erro: "Post não encontrado." };
  if (c.publicacao_status === "publicado") return { ok: false, erro: "Este post já foi publicado." };
  if (c.publicacao_status === "processando") return { ok: false, erro: "Este post já está sendo publicado." };
  const rede = redeDe(c);
  const problemas = problemasPublicacao(rede, c.formato, Array.isArray(c.arquivos) ? c.arquivos : [], c.legenda ?? "");
  if (problemas.length) return { ok: false, erro: problemas.join(" ") };
  const { data: conexoes } = await supabase.rpc("conexoes_redes", { p_empresa: empresaId });
  if (!(conexoes ?? []).some((x) => x.rede === rede)) return { ok: false, erro: `Antes, conecte o ${rotuloRede(rede)} em Marca → Publicação.` };
  const { data, error } = await supabase.from("conteudos")
    .update({ publicar: true, publicacao_status: "agendado", publicacao_erro: null, status: c.status === "sugestao" ? "aprovado" : c.status })
    .eq("id", conteudoId).eq("empresa_id", empresaId).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Você não tem permissão para agendar este post." };
  revalidar();
  return { ok: true };
}

export async function cancelarPublicacao(empresaId: string, conteudoId: string): Promise<{ ok: true } | Erro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("conteudos")
    .update({ publicar: false, publicacao_status: null, publicacao_erro: null })
    .eq("id", conteudoId).eq("empresa_id", empresaId).in("publicacao_status", ["agendado", "erro"]).select("id");
  if (error) return { ok: false, erro: mensagemErro(error) };
  if (!data?.length) return { ok: false, erro: "Não dá para cancelar agora: o post já está sendo publicado ou já saiu." };
  revalidar();
  return { ok: true };
}
