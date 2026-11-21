import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const maxDuration = 120;

const ACOES = new Set(["conectar", "desconectar", "publicar_agora"]);

/**
 * POST /api/publicacao  { acao: "conectar" | "desconectar" | "publicar_agora", empresaId, … }
 * Repassa o pedido ao robô de publicação (função "estudio-publicar" no Supabase)
 * com o login de quem está usando. O robô confere o papel na empresa.
 */
export async function POST(req: NextRequest) {
  let corpo: Record<string, unknown> = {};
  try { corpo = await req.json(); } catch { /* corpo vazio */ }
  if (typeof corpo.acao !== "string" || !ACOES.has(corpo.acao)) return NextResponse.json({ erro: "Ação inválida." }, { status: 400 });

  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  if (!user || !session) return NextResponse.json({ erro: "Sua sessão expirou. Entre de novo." }, { status: 401 });

  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/estudio-publicar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_CHAVE_PUBLICA },
      body: JSON.stringify(corpo),
      signal: req.signal,
    });
    const resposta = await r.json().catch(() => ({ erro: `Erro ${r.status} no robô de publicação.` }));
    return NextResponse.json(resposta, { status: r.status });
  } catch {
    return NextResponse.json({ erro: "Não foi possível falar com o robô de publicação. Tente de novo." }, { status: 502 });
  }
}
