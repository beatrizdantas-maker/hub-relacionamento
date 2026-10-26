"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail } from "lucide-react";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";

const MENSAGENS_ERRO: Record<string, string> = {
  link_invalido: "O link de acesso é inválido ou já expirou. Peça um novo ou entre com a senha.",
  outro_navegador: "O link foi aberto num navegador diferente do que pediu o acesso. Entre com a senha, ou peça um novo link e abra no mesmo navegador.",
  oauth: "Não foi possível entrar com o Google. Tente de novo.",
  sessao: "Não foi possível confirmar sua sessão. Tente entrar novamente.",
};

export function FormularioEntrar({ proximo, erroInicial }: { proximo?: string; erroInicial?: string }) {
  const router = useRouter();
  const [modo, setModo] = useState<"senha" | "link">("senha");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(erroInicial ? MENSAGENS_ERRO[erroInicial] ?? "Algo deu errado. Tente de novo." : null);

  const destino = proximo && proximo.startsWith("/") ? proximo : "/";
  const urlCallback = () => `${window.location.origin}/auth/callback?proximo=${encodeURIComponent(destino)}`;

  async function enviarLink(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: urlCallback() },
    });
    setEnviando(false);
    if (error) {
      setErro(error.message.includes("rate") ? "Muitas tentativas. Aguarde um minuto e tente de novo." : "Não foi possível enviar o link. Confira o e-mail e tente de novo.");
      return;
    }
    setEnviado(true);
  }

  async function entrarComSenha(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      setEnviando(false);
      setErro(
        /invalid login credentials/i.test(error.message)
          ? "E-mail ou senha incorretos."
          : /email not confirmed/i.test(error.message)
            ? "Este e-mail ainda não foi confirmado."
            : /rate/i.test(error.message)
              ? "Muitas tentativas. Aguarde um minuto e tente de novo."
              : "Não foi possível entrar. Tente de novo.",
      );
      return;
    }
    router.replace(destino);
    router.refresh();
  }

  async function entrarComGoogle() {
    setErro(null);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: urlCallback(), queryParams: { access_type: "offline", prompt: "select_account" } },
    });
    if (error) setErro(MENSAGENS_ERRO.oauth);
  }

  if (enviado) {
    return (
      <div className="cartao space-y-3 text-center">
        <Mail className="mx-auto h-8 w-8 text-primaria" aria-hidden />
        <h1 className="text-xl font-semibold">Confira seu e-mail</h1>
        <p className="text-sm text-texto-2">
          Enviamos um link de acesso para <strong className="text-texto">{email}</strong>. Abra o link no mesmo aparelho para entrar.
        </p>
        <button type="button" className="text-sm text-primaria underline-offset-2 hover:underline" onClick={() => setEnviado(false)}>
          Usar outro e-mail
        </button>
      </div>
    );
  }

  return (
    <div className="cartao space-y-4">
      <h1 className="text-xl font-semibold">Entrar</h1>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-superficie-2 p-1" role="tablist" aria-label="Forma de entrar">
        {([["senha", "Com senha", KeyRound], ["link", "Link por e-mail", Mail]] as const).map(([valor, rotulo, Icone]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={modo === valor}
            onClick={() => { setModo(valor); setErro(null); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium ${modo === valor ? "bg-superficie text-texto shadow-sm" : "text-texto-2"}`}
          >
            <Icone className="h-4 w-4" aria-hidden /> {rotulo}
          </button>
        ))}
      </div>

      <form onSubmit={modo === "senha" ? entrarComSenha : enviarLink} className="space-y-3" noValidate>
        <div>
          <label htmlFor="email" className="rotulo">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            className="campo"
            placeholder="voce@empresa.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {modo === "senha" && (
          <div>
            <label htmlFor="senha" className="rotulo">Senha</label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              className="campo"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
        )}
        <Botao type="submit" className="w-full" carregando={enviando} disabled={!email.includes("@") || (modo === "senha" && !senha)}>
          {modo === "senha" ? "Entrar" : "Receber link de acesso"}
        </Botao>
        {modo === "link" && <p className="text-xs text-texto-3">Abra o link no mesmo navegador em que pediu o acesso.</p>}
      </form>

      <div className="flex items-center gap-3 text-xs text-texto-3">
        <span className="h-px flex-1 bg-borda" /> ou <span className="h-px flex-1 bg-borda" />
      </div>

      <Botao type="button" variante="secundaria" className="w-full" onClick={entrarComGoogle}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        Entrar com Google
      </Botao>

      <p className="text-center text-xs text-texto-3">Depois de entrar, você pode trocar a senha em Empresas → Minha conta.</p>
    </div>
  );
}
