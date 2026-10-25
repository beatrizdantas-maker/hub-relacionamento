import "server-only";

/**
 * Cliente mínimo da API do Metricool (só servidor).
 *
 * Fonte dos endpoints: servidor MCP oficial da Metricool (pacote mcp-metricool)
 * e guia "Basic Guide for API Integration":
 *   base     https://app.metricool.com/api
 *   auth     cabeçalho X-Mc-Auth: <token>  +  userId e blogId na query
 *   marcas   GET /v2/settings/brands?userId=
 *   séries   GET /v2/analytics/timelines?from=&to=&timezone=&metric=&subject=&network=instagram
 *            → { data: [ { values: [ { dateTime, value } ] } ] }
 *   posts    GET /v2/analytics/posts/instagram?from=YYYY-MM-DDT00:00:00&to=YYYY-MM-DDT23:59:59
 *   reels    GET /v2/analytics/reels/instagram?from=&to=
 *   stories  GET /v2/analytics/stories/instagram?from=&to=
 */

export const METRICOOL_BASE = "https://app.metricool.com/api";

export class ErroMetricool extends Error {
  constructor(message: string, public status?: number, public corpo?: string) {
    super(message);
    this.name = "ErroMetricool";
  }
}

export interface ConfigMetricool {
  token: string;
  userId: string;
  blogId: string;
  fuso: string; // ex.: America/Sao_Paulo
}

export interface MarcaMetricool {
  id: number;
  userId: number;
  label: string;
  timezone?: string;
  instagram?: string | null;
}

export interface PontoSerie { dia: string; valor: number | null } // dia = AAAA-MM-DD no fuso da marca

type Json = Record<string, unknown>;

function mensagemPorStatus(status: number): string {
  if (status === 401 || status === 403) return "O Metricool recusou o token (401/403). Confira o token e se o plano tem acesso à API (Advanced ou superior).";
  if (status === 404) return "Endpoint não encontrado no Metricool (404). O ID da marca ou do usuário pode estar errado.";
  if (status === 429) return "O Metricool limitou as requisições (429). Tente de novo em alguns minutos.";
  if (status >= 500) return `O Metricool respondeu com erro ${status}. Tente mais tarde.`;
  return `O Metricool respondeu com status ${status}.`;
}

export class ClienteMetricool {
  constructor(private cfg: ConfigMetricool) {}

  private async get<T = unknown>(caminho: string, params: Record<string, string | undefined>, comMarca = true): Promise<T> {
    const url = new URL(METRICOOL_BASE + caminho);
    url.searchParams.set("userId", this.cfg.userId);
    if (comMarca) url.searchParams.set("blogId", this.cfg.blogId);
    url.searchParams.set("integrationSource", "estudio");
    for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v);

    const controlador = new AbortController();
    const tempo = setTimeout(() => controlador.abort(), 30_000);
    let resposta: Response;
    try {
      resposta = await fetch(url, { headers: { "X-Mc-Auth": this.cfg.token, Accept: "application/json" }, signal: controlador.signal, cache: "no-store" });
    } catch (e) {
      throw new ErroMetricool((e as Error).name === "AbortError" ? "O Metricool demorou mais de 30 s para responder." : "Não foi possível conectar ao Metricool.");
    } finally {
      clearTimeout(tempo);
    }
    const texto = await resposta.text();
    if (!resposta.ok) throw new ErroMetricool(mensagemPorStatus(resposta.status), resposta.status, texto.slice(0, 300));
    try {
      return JSON.parse(texto) as T;
    } catch {
      throw new ErroMetricool("O Metricool devolveu uma resposta que não é JSON.", resposta.status, texto.slice(0, 300));
    }
  }

  /** Marcas da conta; usada para validar userId/blogId/token. */
  async marcas(): Promise<MarcaMetricool[]> {
    const r = await this.get<{ data?: Json[] } | Json[]>("/v2/settings/brands", {}, false);
    const lista = Array.isArray(r) ? r : (r.data ?? []);
    return lista.map((m) => ({
      id: Number(m.id),
      userId: Number(m.userId),
      label: String(m.label ?? m.name ?? ""),
      timezone: typeof m.timezone === "string" ? m.timezone : undefined,
      instagram: ((m.networksData as Json | undefined)?.instagramData as string | undefined) ?? null,
    }));
  }

  /** Série diária de uma métrica da conta do Instagram (subject=account). */
  async serieDiaria(metrica: string, de: string, ate: string, subject = "account"): Promise<PontoSerie[]> {
    const r = await this.get<{ data?: { values?: { dateTime?: string; value?: number | string | null }[] }[] }>("/v2/analytics/timelines", {
      from: comFuso(de, "00:00:00", this.cfg.fuso),
      to: comFuso(ate, "23:59:59", this.cfg.fuso),
      timezone: this.cfg.fuso,
      metric: metrica,
      subject,
      network: "instagram",
    });
    const valores = (r.data ?? []).flatMap((d) => d.values ?? []);
    const porDia = new Map<string, number | null>();
    for (const v of valores) {
      if (!v.dateTime) continue;
      const dia = diaNoFuso(v.dateTime, this.cfg.fuso);
      const n = v.value == null || v.value === "" ? null : Number(v.value);
      porDia.set(dia, n != null && Number.isFinite(n) ? n : null);
    }
    return [...porDia.entries()].map(([dia, valor]) => ({ dia, valor })).sort((a, b) => a.dia.localeCompare(b.dia));
  }

  async posts(de: string, ate: string) { return this.lista("/v2/analytics/posts/instagram", de, ate); }
  async reels(de: string, ate: string) { return this.lista("/v2/analytics/reels/instagram", de, ate); }
  async stories(de: string, ate: string) { return this.lista("/v2/analytics/stories/instagram", de, ate); }

  private async lista(caminho: string, de: string, ate: string): Promise<Json[]> {
    const r = await this.get<{ data?: Json[] } | Json[]>(caminho, { from: `${de}T00:00:00`, to: `${ate}T23:59:59`, timezone: this.cfg.fuso });
    return Array.isArray(r) ? r : (r.data ?? []);
  }
}

/** "2026-10-01" + "00:00:00" no fuso → ISO com deslocamento (ex.: 2026-10-01T00:00:00-03:00). */
export function comFuso(dia: string, hora: string, fuso: string): string {
  const deslocamento = deslocamentoDoFuso(new Date(`${dia}T12:00:00Z`), fuso);
  return `${dia}T${hora}${deslocamento}`;
}

function deslocamentoDoFuso(data: Date, fuso: string): string {
  try {
    const partes = new Intl.DateTimeFormat("en-US", { timeZone: fuso, timeZoneName: "longOffset" }).formatToParts(data);
    const nome = partes.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const m = /GMT([+-]\d{1,2})(?::?(\d{2}))?/.exec(nome);
    if (!m) return "+00:00";
    const h = String(Math.abs(Number(m[1]))).padStart(2, "0");
    return `${m[1].startsWith("-") ? "-" : "+"}${h}:${m[2] ?? "00"}`;
  } catch {
    return "+00:00";
  }
}

/** Data (AAAA-MM-DD) de um instante no fuso da marca. */
export function diaNoFuso(iso: string | number, fuso: string): string {
  const d = typeof iso === "number" ? new Date(iso) : new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
