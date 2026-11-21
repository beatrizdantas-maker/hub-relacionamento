/**
 * Estúdio · robô de publicação (Supabase Edge Function "estudio-publicar").
 *
 * Ações (POST, corpo JSON com "acao"):
 *  - rodar           → chamado pelo pg_cron a cada 5 min (cabeçalho x-estudio-cron).
 *                      Renova tokens do Instagram e publica os posts agendados cujo horário chegou.
 *  - conectar        → Dono cola o token da rede; o robô confere na rede e guarda.
 *  - desconectar     → Dono remove a conexão.
 *  - publicar_agora  → Dono/Editor publica um post já pronto, sem esperar o horário.
 *
 * Instagram: API com login do Instagram (graph.instagram.com) — contêiner → media_publish.
 * LinkedIn: API de posts da página (api.linkedin.com/rest) — imagem/vídeo enviados antes.
 * Vídeos levam alguns minutos para ficar prontos na rede: o post fica "processando"
 * e a próxima rodada confere de novo.
 *
 * "regras.ts" é cópia de src/lib/publicacao.ts (enviada junto no deploy).
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { problemasPublicacao, textoLinkedin, idPaginaLinkedin, type ArquivoPublicacao, type FormatoPublicacao, type RedePublicacao } from "./regras.ts";

const IG = "https://graph.instagram.com/v25.0";
const IG_RAIZ = "https://graph.instagram.com";
const LI = "https://api.linkedin.com/rest";
const LI_VERSAO = "202602";
const MAX_TENTATIVAS = 36;          // ~3 h de conferências a cada 5 min
const TRAVA_MS = 4 * 60 * 1000;     // uma rodada não pega o post que outra está publicando

type Conteudo = {
  id: string; empresa_id: string; formato: FormatoPublicacao; tema: string; legenda: string | null; rede?: string | null;
  arquivos: ArquivoPublicacao[] | null; publicar: boolean; publicacao_status: string | null; publicacao_ref: string | null;
  publicacao_tentativas: number;
};
type Conexao = { empresa_id: string; rede: RedePublicacao; conta_id: string; conta_nome: string | null; token: string; expira_em: string | null; atualizado_em: string };
type Passo = { estado: "publicado"; ref: string; link: string | null } | { estado: "processando"; ref: string };

class ErroPub extends Error {
  constructor(mensagem: string, public definitivo = true) { super(mensagem); }
}

const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
const nomeRede = (r: RedePublicacao) => (r === "instagram" ? "Instagram" : "LinkedIn");
const redeDe = (c: { rede?: string | null }): RedePublicacao => (c.rede === "linkedin" ? "linkedin" : "instagram");

type Db = ReturnType<typeof admin>;

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    db: { schema: "estudio" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return resposta({ erro: "Use POST." }, 405);
  let corpo: Record<string, unknown> = {};
  try { corpo = await req.json(); } catch { /* corpo vazio */ }
  const db = admin();

  try {
    if (corpo.acao === "rodar") {
      const { data: ok } = await db.rpc("cron_segredo_confere", { p_segredo: req.headers.get("x-estudio-cron") ?? "" });
      if (ok !== true) return resposta({ erro: "Não autorizado." }, 401);
      return resposta(await rodar(db));
    }

    // Ações de pessoas: precisam do login e do papel na empresa.
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: quem } = await db.auth.getUser(jwt);
    if (!quem?.user) return resposta({ erro: "Sua sessão expirou. Entre de novo." }, 401);
    const empresaId = typeof corpo.empresaId === "string" ? corpo.empresaId : "";
    const { data: membro } = await db.from("membros").select("papel").eq("empresa_id", empresaId).eq("user_id", quem.user.id).maybeSingle();
    if (!membro) return resposta({ erro: "Você não faz parte desta empresa." }, 403);
    const rede: RedePublicacao = corpo.rede === "linkedin" ? "linkedin" : "instagram";

    switch (corpo.acao) {
      case "conectar":
        if (membro.papel !== "dono") return resposta({ erro: "Só o Dono conecta as redes." }, 403);
        return resposta(await conectar(db, empresaId, rede, String(corpo.token ?? ""), String(corpo.pagina ?? ""), quem.user.id));
      case "desconectar":
        if (membro.papel !== "dono") return resposta({ erro: "Só o Dono desconecta as redes." }, 403);
        await db.from("redes_conexoes").delete().eq("empresa_id", empresaId).eq("rede", rede);
        return resposta({ ok: true });
      case "publicar_agora": {
        if (membro.papel !== "dono" && membro.papel !== "editor") return resposta({ erro: "Só Dono e Editor publicam." }, 403);
        const conteudoId = typeof corpo.conteudoId === "string" ? corpo.conteudoId : "";
        const { data: c } = await db.from("conteudos").select("id, publicacao_status").eq("id", conteudoId).eq("empresa_id", empresaId).maybeSingle();
        if (!c) return resposta({ erro: "Post não encontrado." }, 404);
        if (c.publicacao_status === "publicado") return resposta({ erro: "Este post já foi publicado." }, 409);
        if (c.publicacao_status !== "processando") {
          await db.from("conteudos").update({ publicar: true, publicacao_status: "agendado", publicacao_erro: null, publicacao_ref: null, publicacao_tentativas: 0, publicacao_travado_ate: null }).eq("id", conteudoId);
        }
        return resposta(await processar(db, conteudoId));
      }
      default:
        return resposta({ erro: "Ação desconhecida." }, 400);
    }
  } catch (e) {
    console.error(e);
    return resposta({ erro: e instanceof Error ? e.message : "Erro inesperado." }, 500);
  }
});

// ---------------- Rodada do agendador ----------------

async function rodar(db: Db) {
  const renovados = await renovarTokensInstagram(db);
  const { data: devidas, error } = await db.rpc("publicacoes_devidas");
  if (error) throw new Error(error.message);
  const resultados = [];
  for (const c of (devidas ?? []) as Conteudo[]) resultados.push(await processar(db, c.id));
  return { renovados, resultados };
}

/** Tokens do Instagram duram 60 dias; renovar toda semana mantém a conexão viva. */
async function renovarTokensInstagram(db: Db): Promise<number> {
  const limite = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data } = await db.from("redes_conexoes").select("*").eq("rede", "instagram").lt("atualizado_em", limite);
  let n = 0;
  for (const con of (data ?? []) as Conexao[]) {
    try {
      const r = await igGet(`${IG_RAIZ}/refresh_access_token`, { grant_type: "ig_refresh_token" }, con.token);
      if (typeof r.access_token === "string") {
        await db.from("redes_conexoes").update({
          token: r.access_token,
          expira_em: new Date(Date.now() + Number(r.expires_in ?? 5184000) * 1000).toISOString(),
          atualizado_em: new Date().toISOString(),
        }).eq("empresa_id", con.empresa_id).eq("rede", "instagram");
        n++;
      }
    } catch (e) {
      console.error("renovar token", con.empresa_id, e);
    }
  }
  return n;
}

// ---------------- Um post ----------------

async function processar(db: Db, id: string): Promise<{ id: string; estado: string; erro?: string; link?: string | null }> {
  const agora = new Date();
  const { data: travados, error: erroTrava } = await db.from("conteudos")
    .update({ publicacao_travado_ate: new Date(agora.getTime() + TRAVA_MS).toISOString() })
    .eq("id", id).eq("publicar", true).in("publicacao_status", ["agendado", "processando"])
    .or(`publicacao_travado_ate.is.null,publicacao_travado_ate.lt."${agora.toISOString()}"`)
    .select("*");
  if (erroTrava) throw new Error(erroTrava.message);
  const c = (travados ?? [])[0] as Conteudo | undefined;
  if (!c) return { id, estado: "ignorado" };

  const rede = redeDe(c);
  try {
    const { data: con } = await db.from("redes_conexoes").select("*").eq("empresa_id", c.empresa_id).eq("rede", rede).maybeSingle();
    if (!con) throw new ErroPub(`Conecte o ${nomeRede(rede)} em Marca → Publicação.`);
    const arquivos = Array.isArray(c.arquivos) ? c.arquivos : [];
    const problemas = problemasPublicacao(rede, c.formato, arquivos, c.legenda ?? "");
    if (problemas.length) throw new ErroPub(problemas.join(" "));

    const passo = rede === "instagram" ? await passoInstagram(c, con as Conexao, arquivos) : await passoLinkedin(c, con as Conexao, arquivos);
    if (passo.estado === "publicado") {
      await db.from("conteudos").update({
        status: "publicado", publicacao_status: "publicado", publicado_em: new Date().toISOString(),
        publicacao_link: passo.link, publicacao_ref: passo.ref, publicacao_erro: null, publicacao_travado_ate: null,
      }).eq("id", c.id);
      return { id, estado: "publicado", link: passo.link };
    }
    const tentativas = (c.publicacao_tentativas ?? 0) + 1;
    if (tentativas >= MAX_TENTATIVAS) throw new ErroPub(`O ${nomeRede(rede)} demorou demais para processar o arquivo. Tente publicar de novo.`);
    await db.from("conteudos").update({ publicacao_status: "processando", publicacao_ref: passo.ref, publicacao_tentativas: tentativas, publicacao_travado_ate: null }).eq("id", c.id);
    return { id, estado: "processando" };
  } catch (e) {
    const definitivo = !(e instanceof ErroPub) || e.definitivo;
    const mensagem = e instanceof Error ? e.message : "Erro inesperado ao publicar.";
    const tentativas = (c.publicacao_tentativas ?? 0) + 1;
    if (!definitivo && tentativas < MAX_TENTATIVAS) {
      // Falha passageira da rede (ex.: fora do ar): tenta de novo na próxima rodada.
      await db.from("conteudos").update({ publicacao_tentativas: tentativas, publicacao_erro: mensagem, publicacao_travado_ate: null }).eq("id", c.id);
      return { id, estado: "tentar_de_novo", erro: mensagem };
    }
    await db.from("conteudos").update({ publicacao_status: "erro", publicacao_erro: mensagem, publicacao_ref: null, publicacao_travado_ate: null }).eq("id", c.id);
    return { id, estado: "erro", erro: mensagem };
  }
}

// ---------------- Instagram ----------------

async function passoInstagram(c: Conteudo, con: Conexao, arquivos: ArquivoPublicacao[]): Promise<Passo> {
  const tk = con.token;
  const conta = con.conta_id;
  let ref = c.publicacao_ref;
  if (!ref) {
    const legenda = (c.legenda ?? "").trim();
    if (c.formato === "Reels") {
      ref = await igCriar(conta, { media_type: "REELS", video_url: arquivos[0].url, caption: legenda, share_to_feed: "true" }, tk);
    } else if (c.formato === "Estático") {
      ref = await igCriar(conta, { image_url: arquivos[0].url, caption: legenda }, tk);
    } else {
      const filhos: string[] = [];
      for (const a of arquivos) filhos.push(await igCriar(conta, { image_url: a.url, is_carousel_item: "true" }, tk));
      ref = await igCriar(conta, { media_type: "CAROUSEL", children: filhos.join(","), caption: legenda }, tk);
    }
  }
  const st = await igGet(`${IG}/${ref}`, { fields: "status_code,status" }, tk);
  const codigo = String(st.status_code ?? "");
  if (codigo === "IN_PROGRESS") return { estado: "processando", ref };
  if (codigo === "ERROR" || codigo === "EXPIRED") {
    throw new ErroPub(`O Instagram não aceitou o arquivo${st.status ? ` (${st.status})` : ""}. Confira se o vídeo é MP4 vertical e se as imagens são JPG ou PNG.`);
  }
  if (codigo === "PUBLISHED") return { estado: "publicado", ref, link: null };
  const publicado = await igPost(`${IG}/${conta}/media_publish`, { creation_id: ref }, tk);
  const id = String(publicado.id ?? "");
  let link: string | null = null;
  try {
    const info = await igGet(`${IG}/${id}`, { fields: "permalink" }, tk);
    link = typeof info.permalink === "string" ? info.permalink : null;
  } catch { /* o post saiu; o link é só um extra */ }
  return { estado: "publicado", ref: id, link };
}

async function igCriar(conta: string, campos: Record<string, string>, tk: string): Promise<string> {
  const r = await igPost(`${IG}/${conta}/media`, campos, tk);
  if (!r.id) throw new ErroPub("O Instagram não devolveu o código do post.");
  return String(r.id);
}

async function igPost(url: string, campos: Record<string, string>, tk: string): Promise<Record<string, unknown>> {
  const corpo = new URLSearchParams({ ...campos, access_token: tk });
  const r = await fetch(url, { method: "POST", body: corpo });
  return await lerInstagram(r);
}

async function igGet(url: string, campos: Record<string, string>, tk: string): Promise<Record<string, unknown>> {
  const r = await fetch(`${url}?${new URLSearchParams({ ...campos, access_token: tk })}`);
  return await lerInstagram(r);
}

async function lerInstagram(r: Response): Promise<Record<string, unknown>> {
  const corpo = await r.json().catch(() => ({})) as Record<string, unknown>;
  if (r.ok) return corpo;
  const erro = (corpo.error ?? {}) as { message?: string; error_user_msg?: string; code?: number };
  const detalhe = erro.error_user_msg || erro.message || `erro ${r.status}`;
  if (r.status === 401 || erro.code === 190) throw new ErroPub(`A conexão com o Instagram expirou ou foi revogada. Conecte de novo em Marca → Publicação. (${detalhe})`);
  throw new ErroPub(`Instagram: ${detalhe}`, r.status < 500);
}

// ---------------- LinkedIn ----------------

function liCabecalhos(tk: string, json = true): Record<string, string> {
  return {
    Authorization: `Bearer ${tk}`,
    "LinkedIn-Version": LI_VERSAO,
    "X-Restli-Protocol-Version": "2.0.0",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function erroLinkedin(r: Response): Promise<ErroPub> {
  const corpo = await r.json().catch(() => ({})) as { message?: string };
  const detalhe = corpo.message || `erro ${r.status}`;
  if (r.status === 401) return new ErroPub(`A conexão com o LinkedIn expirou. Gere um novo token e conecte de novo em Marca → Publicação. (${detalhe})`);
  if (r.status === 403) return new ErroPub(`O LinkedIn não deixou publicar na página. Confira se o aplicativo já foi aprovado para a página e se você é administradora dela. (${detalhe})`);
  return new ErroPub(`LinkedIn: ${detalhe}`, r.status < 500);
}

async function baixar(url: string): Promise<ArrayBuffer> {
  const r = await fetch(url);
  if (!r.ok) throw new ErroPub("Não consegui ler o arquivo guardado no Estúdio. Envie de novo.");
  return await r.arrayBuffer();
}

async function liEnviarImagem(a: ArquivoPublicacao, autor: string, tk: string): Promise<string> {
  const r = await fetch(`${LI}/images?action=initializeUpload`, { method: "POST", headers: liCabecalhos(tk), body: JSON.stringify({ initializeUploadRequest: { owner: autor } }) });
  if (!r.ok) throw await erroLinkedin(r);
  const { value } = await r.json() as { value: { uploadUrl: string; image: string } };
  const envio = await fetch(value.uploadUrl, { method: "PUT", headers: { Authorization: `Bearer ${tk}` }, body: await baixar(a.url) });
  if (!envio.ok) throw await erroLinkedin(envio);
  return value.image;
}

async function liEnviarVideo(a: ArquivoPublicacao, autor: string, tk: string): Promise<string> {
  const bytes = await baixar(a.url);
  const r = await fetch(`${LI}/videos?action=initializeUpload`, {
    method: "POST", headers: liCabecalhos(tk),
    body: JSON.stringify({ initializeUploadRequest: { owner: autor, fileSizeBytes: bytes.byteLength, uploadCaptions: false, uploadThumbnail: false } }),
  });
  if (!r.ok) throw await erroLinkedin(r);
  const { value } = await r.json() as { value: { video: string; uploadToken?: string; uploadInstructions: { uploadUrl: string; firstByte: number; lastByte: number }[] } };
  const partes: string[] = [];
  for (const instrucao of value.uploadInstructions) {
    const envio = await fetch(instrucao.uploadUrl, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: bytes.slice(instrucao.firstByte, instrucao.lastByte + 1) });
    if (!envio.ok) throw await erroLinkedin(envio);
    partes.push((envio.headers.get("etag") ?? "").replaceAll('"', ""));
  }
  const fim = await fetch(`${LI}/videos?action=finalizeUpload`, {
    method: "POST", headers: liCabecalhos(tk),
    body: JSON.stringify({ finalizeUploadRequest: { video: value.video, uploadToken: value.uploadToken ?? "", uploadedPartIds: partes } }),
  });
  if (!fim.ok) throw await erroLinkedin(fim);
  return value.video;
}

async function passoLinkedin(c: Conteudo, con: Conexao, arquivos: ArquivoPublicacao[]): Promise<Passo> {
  const tk = con.token;
  const autor = `urn:li:organization:${con.conta_id}`;
  let midia: string | null = null;

  if (c.formato === "Reels") {
    if (!c.publicacao_ref) return { estado: "processando", ref: await liEnviarVideo(arquivos[0], autor, tk) };
    const r = await fetch(`${LI}/videos/${encodeURIComponent(c.publicacao_ref)}`, { headers: liCabecalhos(tk, false) });
    if (!r.ok) throw await erroLinkedin(r);
    const video = await r.json() as { status?: string };
    if (video.status === "PROCESSING" || video.status === "WAITING_UPLOAD") return { estado: "processando", ref: c.publicacao_ref };
    if (video.status !== "AVAILABLE") throw new ErroPub(`O LinkedIn não conseguiu processar o vídeo (${video.status ?? "sem status"}).`);
    midia = c.publicacao_ref;
  } else if (arquivos.length) {
    midia = await liEnviarImagem(arquivos[0], autor, tk);
  }

  const post = {
    author: autor,
    commentary: textoLinkedin((c.legenda ?? "").trim()),
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
    ...(midia ? { content: { media: { id: midia, ...(c.formato === "Reels" && c.tema ? { title: c.tema.slice(0, 200) } : {}) } } } : {}),
  };
  const r = await fetch(`${LI}/posts`, { method: "POST", headers: liCabecalhos(tk), body: JSON.stringify(post) });
  if (r.status !== 201) throw await erroLinkedin(r);
  const urn = r.headers.get("x-restli-id") ?? "";
  return { estado: "publicado", ref: urn, link: urn ? `https://www.linkedin.com/feed/update/${urn}/` : null };
}

// ---------------- Conectar ----------------

async function conectar(db: Db, empresaId: string, rede: RedePublicacao, tokenBruto: string, pagina: string, usuarioId: string) {
  const token = tokenBruto.trim();
  if (token.length < 20) throw new Error("Cole o token completo.");
  let contaId = "";
  let contaNome: string | null = null;
  let expiraEm = new Date(Date.now() + 60 * 864e5).toISOString();

  if (rede === "instagram") {
    let eu: Record<string, unknown>;
    try {
      eu = await igGet(`${IG}/me`, { fields: "user_id,username" }, token);
    } catch (e) {
      throw new Error(`O Instagram não aceitou esse token. Gere o token na parte “API do Instagram com login do Instagram” do aplicativo da Meta. (${e instanceof Error ? e.message : ""})`);
    }
    contaId = String(eu.user_id ?? eu.id ?? "");
    contaNome = eu.username ? `@${eu.username}` : null;
    if (!contaId) throw new Error("O Instagram não devolveu o número da conta.");
    // Troca pelo token de 60 dias, se ainda for de curta duração (sem efeito se já for longo).
    try {
      const r = await igGet(`${IG_RAIZ}/refresh_access_token`, { grant_type: "ig_refresh_token" }, token);
      if (typeof r.access_token === "string") expiraEm = new Date(Date.now() + Number(r.expires_in ?? 5184000) * 1000).toISOString();
    } catch { /* tokens com menos de 24 h não renovam ainda; tudo bem */ }
  } else {
    const id = idPaginaLinkedin(pagina);
    if (!id) throw new Error("Informe o número da página do LinkedIn (aparece no endereço linkedin.com/company/NÚMERO/admin).");
    contaId = id;
    const r = await fetch(`${LI}/organizations/${id}`, { headers: liCabecalhos(token, false) });
    if (r.status === 401) throw new Error("O LinkedIn não aceitou esse token. Gere um novo e cole de novo.");
    if (r.ok) {
      const org = await r.json() as { localizedName?: string };
      contaNome = org.localizedName ?? null;
    }
    contaNome = contaNome ?? `Página ${id}`;
  }

  const { error } = await db.from("redes_conexoes").upsert({
    empresa_id: empresaId, rede, conta_id: contaId, conta_nome: contaNome, token, expira_em: expiraEm,
    conectado_por: usuarioId, atualizado_em: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return { ok: true, conta_nome: contaNome, expira_em: expiraEm };
}
