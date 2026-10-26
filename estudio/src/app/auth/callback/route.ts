import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Destino do link mágico e do OAuth. Aceita os dois formatos:
 * - "code" (PKCE): só funciona no mesmo navegador que pediu o acesso;
 * - "token_hash" + "type": funciona em qualquer navegador (usado quando o
 *   modelo de e-mail do Supabase aponta direto para cá).
 * Redireciona para a página pedida (sempre dentro do app).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const proximoBruto = searchParams.get("proximo") ?? searchParams.get("next") ?? "/";
  const proximo = proximoBruto.startsWith("/") && !proximoBruto.startsWith("//") ? proximoBruto : "/";

  const supabase = await criarClienteServidor();

  if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    if (error) {
      console.error("[auth/callback] verifyOtp falhou:", error.message);
      return NextResponse.redirect(`${origin}/entrar?erro=link_invalido`);
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession falhou:", error.code, error.message);
      const outroNavegador = /code verifier|flow state|verifier/i.test(error.message);
      return NextResponse.redirect(`${origin}/entrar?erro=${outroNavegador ? "outro_navegador" : "link_invalido"}`);
    }
  } else {
    const erroSupabase = searchParams.get("error_description");
    if (erroSupabase) console.error("[auth/callback] erro vindo do Supabase:", erroSupabase);
    return NextResponse.redirect(`${origin}/entrar?erro=link_invalido`);
  }

  // Atrás de proxy (Vercel) o host público vem em x-forwarded-host.
  const hostEncaminhado = request.headers.get("x-forwarded-host");
  const emDesenvolvimento = process.env.NODE_ENV === "development";
  if (emDesenvolvimento || !hostEncaminhado) {
    return NextResponse.redirect(`${origin}${proximo}`);
  }
  return NextResponse.redirect(`https://${hostEncaminhado}${proximo}`);
}
