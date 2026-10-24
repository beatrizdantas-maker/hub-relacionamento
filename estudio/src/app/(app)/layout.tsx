import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Casca } from "@/components/casca/Casca";

/**
 * Layout das telas autenticadas. O middleware já redireciona quem não está
 * logado; aqui buscamos o usuário e o perfil para a casca (barra lateral /
 * barra inferior e seletor de empresa).
 */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // Garante o perfil (usuários anteriores ao Estúdio não passaram pelo trigger de auth.users).
  let { data: perfil } = await supabase.from("perfis").select("*").eq("id", user.id).maybeSingle();
  if (!perfil) {
    const nome =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email?.split("@")[0] ??
      null;
    const { data: criado } = await supabase
      .from("perfis")
      .upsert({ id: user.id, nome, email: user.email ?? null }, { onConflict: "id", ignoreDuplicates: true })
      .select("*")
      .maybeSingle();
    perfil = criado;
  }

  return (
    <Casca usuario={{ id: user.id, email: user.email ?? "", nome: perfil?.nome ?? null }}>
      {children}
    </Casca>
  );
}
