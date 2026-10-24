import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Destino do link mágico e do OAuth (PKCE). Troca o "code" por sessão
 * e redireciona para a página pedida (sempre dentro do app).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const proximoBruto = searchParams.get("proximo") ?? "/";
  const proximo = proximoBruto.startsWith("/") && !proximoBruto.startsWith("//") ? proximoBruto : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/entrar?erro=link_invalido`);
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
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
