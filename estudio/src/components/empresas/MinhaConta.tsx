"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";

/** Troca de senha da pessoa logada (vale para todas as empresas). */
export function MinhaConta({ email }: { email: string }) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setMensagem(null);
    if (senha.length < 8) return setMensagem({ tipo: "erro", texto: "Use pelo menos 8 caracteres." });
    if (senha !== confirmacao) return setMensagem({ tipo: "erro", texto: "As duas senhas não são iguais." });
    setSalvando(true);
    const { error } = await criarClienteNavegador().auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      return setMensagem({
        tipo: "erro",
        texto: /same|different from the old/i.test(error.message)
          ? "A nova senha precisa ser diferente da atual."
          : /weak|short|length|characters/i.test(error.message)
            ? "Senha fraca demais. Use letras e números, com pelo menos 8 caracteres."
            : /reauthentication|recent/i.test(error.message)
              ? "Por segurança, saia e entre de novo antes de trocar a senha."
              : "Não foi possível trocar a senha. Tente de novo.",
      });
    }
    setSenha("");
    setConfirmacao("");
    setMensagem({ tipo: "sucesso", texto: "Senha alterada. Use a nova senha no próximo acesso." });
  }

  return (
    <section className="cartao space-y-3" aria-labelledby="minha-conta">
      <div>
        <h2 id="minha-conta" className="flex items-center gap-2 text-lg font-semibold"><KeyRound className="h-5 w-5 text-primaria" aria-hidden /> Minha conta</h2>
        <p className="text-sm text-texto-2">Você entra como <strong className="text-texto">{email}</strong>. A senha vale para todas as empresas.</p>
      </div>
      {mensagem && <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>}
      <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <div>
          <label htmlFor="nova-senha" className="rotulo">Nova senha</label>
          <input id="nova-senha" type="password" autoComplete="new-password" className="campo" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <div>
          <label htmlFor="confirma-senha" className="rotulo">Repita a nova senha</label>
          <input id="confirma-senha" type="password" autoComplete="new-password" className="campo" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
        </div>
        <Botao type="submit" carregando={salvando} disabled={!senha || !confirmacao}>Trocar senha</Botao>
      </form>
    </section>
  );
}
