"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Link2, Unplug } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Selo } from "@/components/ui/Selo";
import { CampoTexto } from "@/components/ui/Campo";
import { Confirmacao } from "@/components/ui/Confirmacao";
import { rotuloRede } from "@/lib/redes";
import type { Rede } from "@/lib/tipos/database";

export type ConexaoResumo = { rede: Rede; conta_nome: string | null; expira_em: string | null };

const PASSOS: Record<Rede, { titulo: string; passos: string[]; link: string; textoLink: string }> = {
  instagram: {
    titulo: "Como pegar o token do Instagram (uma vez só)",
    link: "https://developers.facebook.com/apps",
    textoLink: "Abrir o site de desenvolvedores da Meta",
    passos: [
      "Entre no site de desenvolvedores da Meta com o Facebook que administra a página da NARAEDU e clique em “Criar app”.",
      "Escolha o caso de uso “Gerenciar mensagens e conteúdo no Instagram” e conclua a criação.",
      "No app, abra “API do Instagram” → “Configuração da API com login do Instagram”.",
      "Em “Gerar tokens de acesso”, clique em “Adicionar conta” e entre com o Instagram da NARAEDU.",
      "Clique em “Gerar token” ao lado da conta, copie o código inteiro e cole abaixo.",
    ],
  },
  linkedin: {
    titulo: "Como pegar o token do LinkedIn",
    link: "https://www.linkedin.com/developers/apps",
    textoLink: "Abrir o LinkedIn Developers",
    passos: [
      "No LinkedIn Developers, clique em “Create app” e ligue o app à página da NARAEDU (você precisa ser administradora da página).",
      "Na aba “Products”, peça acesso à “Community Management API”. O LinkedIn analisa o pedido; pode levar alguns dias.",
      "Depois da aprovação, abra “Auth” → “OAuth 2.0 tools” e gere um token marcando w_organization_social e r_organization_social.",
      "Cole o token abaixo e o link da página de administração (linkedin.com/company/NÚMERO/admin).",
      "O token do LinkedIn vale 60 dias: o Estúdio avisa quando estiver perto de vencer.",
    ],
  },
};

/** Marca → Publicação (só Dono): conecta Instagram e LinkedIn para o robô publicar sozinho. */
export function SecaoPublicacao({ empresaId, conexoes }: { empresaId: string; conexoes: ConexaoResumo[] }) {
  return (
    <section className="cartao space-y-4" aria-labelledby="secao-publicacao">
      <div>
        <h2 id="secao-publicacao" className="text-lg font-semibold">Publicação automática</h2>
        <p className="mt-1 text-sm text-texto-2">
          Conecte as contas uma vez. Depois, em cada post, envie a arte ou o vídeo e clique em “Agendar”: o Estúdio publica sozinho no dia e hora do calendário.
          O token fica guardado só no servidor; nem quem é Dono consegue vê-lo de novo.
        </p>
      </div>
      <CartaoRede empresaId={empresaId} rede="instagram" conexao={conexoes.find((c) => c.rede === "instagram") ?? null} />
      <CartaoRede empresaId={empresaId} rede="linkedin" conexao={conexoes.find((c) => c.rede === "linkedin") ?? null} />
      <p className="text-xs text-texto-3">
        O que não sai sozinho: stories (com figurinhas interativas), artigos do LinkedIn e carrossel no LinkedIn. Esses continuam à mão.
      </p>
    </section>
  );
}

function CartaoRede({ empresaId, rede, conexao }: { empresaId: string; rede: Rede; conexao: ConexaoResumo | null }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [pagina, setPagina] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trocando, setTrocando] = useState(false);
  const info = PASSOS[rede];
  const diasParaVencer = conexao?.expira_em ? Math.ceil((new Date(conexao.expira_em).getTime() - Date.now()) / 864e5) : null;

  async function chamar(corpo: Record<string, unknown>) {
    setErro(null); setAviso(null); setEnviando(true);
    try {
      const r = await fetch("/api/publicacao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ empresaId, rede, ...corpo }) });
      const resposta = (await r.json().catch(() => ({}))) as { ok?: boolean; erro?: string; conta_nome?: string };
      if (!r.ok || !resposta.ok) { setErro(resposta.erro ?? `Erro ${r.status}.`); return false; }
      if (resposta.conta_nome) setAviso(`Conectado: ${resposta.conta_nome}.`);
      router.refresh();
      return true;
    } catch {
      setErro("Não foi possível falar com o servidor.");
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function conectar(e: React.FormEvent) {
    e.preventDefault();
    if (await chamar({ acao: "conectar", token, pagina })) { setToken(""); setPagina(""); setTrocando(false); }
  }

  async function desconectar() {
    setConfirmando(false);
    if (await chamar({ acao: "desconectar" })) setAviso(`${rotuloRede(rede)} desconectado.`);
  }

  return (
    <div className="space-y-3 rounded-xl border border-borda p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{rotuloRede(rede)}</h3>
        {conexao ? <Selo tom="real"><Check className="h-3 w-3" aria-hidden /> Conectado{conexao.conta_nome ? ` · ${conexao.conta_nome}` : ""}</Selo> : <Selo tom="neutro">Não conectado</Selo>}
      </div>
      {conexao && diasParaVencer !== null && (
        rede === "linkedin" && diasParaVencer <= 10
          ? <Aviso tipo="erro">O token do LinkedIn vence {diasParaVencer <= 0 ? "hoje" : `em ${diasParaVencer} ${diasParaVencer === 1 ? "dia" : "dias"}`}. Gere um novo e conecte de novo.</Aviso>
          : <p className="text-xs text-texto-2">{rede === "instagram" ? "O Estúdio renova a conexão sozinho toda semana." : `O token vale até ${new Date(conexao.expira_em!).toLocaleDateString("pt-BR")}.`}</p>
      )}

      {(!conexao || trocando) ? (
        <form onSubmit={conectar} className="space-y-3">
          <details className="rounded-lg bg-superficie-2 p-3 text-sm">
            <summary className="cursor-pointer font-medium">{info.titulo}</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-texto-2">{info.passos.map((p) => <li key={p}>{p}</li>)}</ol>
            <a href={info.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-primaria underline-offset-2 hover:underline"><Link2 className="h-4 w-4" aria-hidden /> {info.textoLink}</a>
          </details>
          <CampoTexto rotulo={`Token do ${rotuloRede(rede)}`} type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Cole o código aqui" />
          {rede === "linkedin" && (
            <CampoTexto rotulo="Página do LinkedIn" value={pagina} onChange={(e) => setPagina(e.target.value)} placeholder="linkedin.com/company/12345678/admin" ajuda="O link da página de administração, com o número." />
          )}
          <div className="flex flex-wrap gap-2">
            <Botao type="submit" carregando={enviando} disabled={token.trim().length < 20 || (rede === "linkedin" && !pagina.trim())}>Conectar {rotuloRede(rede)}</Botao>
            {trocando && <Botao type="button" variante="secundaria" onClick={() => setTrocando(false)}>Cancelar</Botao>}
          </div>
        </form>
      ) : confirmando ? (
        <Confirmacao titulo={`Desconectar o ${rotuloRede(rede)}?`} descricao="Os posts agendados para esta rede vão dar erro até você conectar de novo." rotuloConfirmar="Desconectar" onConfirmar={desconectar} onCancelar={() => setConfirmando(false)} />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Botao type="button" tamanho="sm" variante="secundaria" onClick={() => setTrocando(true)}>Trocar token</Botao>
          <Botao type="button" tamanho="sm" variante="fantasma" className="text-atrasado" onClick={() => setConfirmando(true)} disabled={enviando}><Unplug className="h-4 w-4" aria-hidden /> Desconectar</Botao>
        </div>
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}
    </div>
  );
}
