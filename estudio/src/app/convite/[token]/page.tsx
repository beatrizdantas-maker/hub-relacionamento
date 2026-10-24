import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { rotuloPapel } from "@/lib/papeis";
import { AceitarConvite } from "./AceitarConvite";

export const metadata = { title: "Convite" };

export default async function PaginaConvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = `/convite/${token}`;

  let conteudo: React.ReactNode;
  if (!user) {
    conteudo = (
      <>
        <h1 className="text-xl font-semibold">Você recebeu um convite</h1>
        <p className="text-sm text-texto-2">Entre com o e-mail que recebeu o convite para ver os detalhes e aceitar.</p>
        <Link href={`/entrar?proximo=${encodeURIComponent(caminho)}`} className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primaria px-4 font-medium text-sobre-primaria">
          Entrar para aceitar
        </Link>
      </>
    );
  } else {
    const { data } = await supabase.rpc("ver_convite", { p_token: token });
    const c = data?.[0];
    if (!c) {
      conteudo = (
        <>
          <h1 className="text-xl font-semibold">Convite não encontrado</h1>
          <p className="text-sm text-texto-2">O link pode estar incompleto ou o convite foi revogado. Peça um novo para quem convidou.</p>
          <Link href="/" className="text-sm text-primaria underline-offset-2 hover:underline">Ir para o início</Link>
        </>
      );
    } else if (c.aceito) {
      conteudo = (
        <>
          <h1 className="text-xl font-semibold">Convite já usado</h1>
          <p className="text-sm text-texto-2">Este convite para <strong>{c.empresa_nome}</strong> já foi aceito.</p>
          <Link href="/" className="text-sm text-primaria underline-offset-2 hover:underline">Ir para o início</Link>
        </>
      );
    } else if (c.expirado) {
      conteudo = (
        <>
          <h1 className="text-xl font-semibold">Convite expirado</h1>
          <p className="text-sm text-texto-2">O convite para <strong>{c.empresa_nome}</strong> venceu. Peça um novo para quem convidou.</p>
        </>
      );
    } else {
      const emailBate = (user.email ?? "").toLowerCase() === c.email.toLowerCase();
      conteudo = (
        <>
          <h1 className="text-xl font-semibold">Convite para {c.empresa_nome}</h1>
          <p className="text-sm text-texto-2">
            Você foi convidado(a) como <strong>{rotuloPapel(c.papel)}</strong> para o e-mail <strong>{c.email}</strong>.
          </p>
          {emailBate ? (
            <AceitarConvite token={token} />
          ) : (
            <div className="space-y-3">
              <p className="rounded-xl border border-manual/40 bg-manual/10 px-3 py-2 text-sm">
                Você está logado(a) como <strong>{user.email}</strong>, que é diferente do e-mail do convite. Saia e entre com o e-mail certo.
              </p>
              <form action="/auth/sair" method="post">
                <button type="submit" className="h-11 w-full rounded-xl border border-borda font-medium hover:bg-superficie-2">Sair e entrar com outro e-mail</button>
              </form>
            </div>
          )}
        </>
      );
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center font-titulo text-3xl font-semibold text-primaria">Estúdio</p>
        <div className="cartao space-y-4">{conteudo}</div>
      </div>
    </main>
  );
}
