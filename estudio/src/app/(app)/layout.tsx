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

  const { data: perfil } = await supabase.from("perfis").select("*").eq("id", user.id).maybeSingle();

  return (
    <Casca usuario={{ id: user.id, email: user.email ?? "", nome: perfil?.nome ?? null }}>
      {children}
    </Casca>
  );
}
