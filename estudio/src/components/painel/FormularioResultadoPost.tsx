"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Confirmacao } from "@/components/ui/Confirmacao";
import { CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { Painel } from "@/components/calendario/Painel";
import { excluirResultadoPost, salvarResultadoPost } from "@/app/(app)/painel/acoes";
import type { FormatoConteudo, ResultadoPost } from "@/lib/tipos/database";

const CAMPOS: { chave: "alcance" | "visualizacoes" | "curtidas" | "comentarios" | "salvamentos" | "compartilhamentos" | "seguidores_ganhos" | "tempo_medio" | "taxa_visualizacao"; rotulo: string; soReels?: boolean }[] = [
  { chave: "alcance", rotulo: "Alcance" },
  { chave: "visualizacoes", rotulo: "Visualizações" },
  { chave: "curtidas", rotulo: "Curtidas" },
  { chave: "comentarios", rotulo: "Comentários" },
  { chave: "salvamentos", rotulo: "Salvamentos" },
  { chave: "compartilhamentos", rotulo: "Compartilhamentos" },
  { chave: "seguidores_ganhos", rotulo: "Seguidores ganhos" },
  { chave: "tempo_medio", rotulo: "Tempo médio (s)", soReels: true },
  { chave: "taxa_visualizacao", rotulo: "Taxa de visualização (%)", soReels: true },
];

export function FormularioResultadoPost({ empresaId, hoje, existente, onFechar }: { empresaId: string; hoje: string; existente: ResultadoPost | null; onFechar: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState(() => ({
    publicado_em: existente?.publicado_em.slice(0, 10) ?? hoje,
    formato: (existente?.formato ?? "Reels") as FormatoConteudo,
    titulo: existente?.titulo ?? "",
    url: existente?.url ?? "",
    ...Object.fromEntries(CAMPOS.map((c) => [c.chave, existente?.[c.chave] == null ? "" : String(existente[c.chave])])),
  }) as Record<string, string>);
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const alterar = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarResultadoPost(empresaId, { ...form, id: existente?.id, publicado_em: form.publicado_em, formato: form.formato as "Reels" | "Carrossel" | "Estático" });
      if (!r.ok) return setErro(r.erro);
      router.refresh();
      onFechar();
    });
  }

  function excluir() {
    if (!existente) return;
    iniciar(async () => {
      const r = await excluirResultadoPost(empresaId, existente.id);
      if (!r.ok) { setErro(r.erro); setExcluindo(false); return; }
      router.refresh();
      onFechar();
    });
  }

  const rodape = !excluindo ? (
    <div className="flex flex-wrap items-center gap-2">
      <Botao carregando={pendente} onClick={salvar}><Check className="h-4 w-4" aria-hidden /> Salvar resultado</Botao>
      <Botao variante="secundaria" onClick={onFechar} disabled={pendente}>Cancelar</Botao>
      {existente && <Botao variante="fantasma" className="ml-auto text-atrasado" onClick={() => setExcluindo(true)} disabled={pendente}><Trash2 className="h-4 w-4" aria-hidden /> Excluir</Botao>}
    </div>
  ) : null;

  return (
    <Painel titulo={existente ? "Editar resultado do post" : "Registrar resultado de post"} onFechar={onFechar} rodape={rodape}>
      <div className="space-y-3">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {excluindo && <Confirmacao titulo="Excluir este resultado?" rotuloConfirmar="Excluir" carregando={pendente} onConfirmar={excluir} onCancelar={() => setExcluindo(false)} />}
        <div className="grid grid-cols-2 gap-3">
          <CampoTexto rotulo="Publicado em" type="date" value={form.publicado_em} max={hoje} onChange={(e) => alterar("publicado_em", e.target.value)} className="tabular" />
          <CampoSelecao rotulo="Formato" value={form.formato} onChange={(e) => alterar("formato", e.target.value)}>
            {(["Reels", "Carrossel", "Estático"] as const).map((f) => <option key={f} value={f}>{f}</option>)}
          </CampoSelecao>
        </div>
        <CampoTexto rotulo="Título ou tema" value={form.titulo} onChange={(e) => alterar("titulo", e.target.value)} maxLength={200} />
        <CampoTexto rotulo="Link do post" type="url" value={form.url} onChange={(e) => alterar("url", e.target.value)} placeholder="https://www.instagram.com/p/…" maxLength={500} />
        <div className="grid grid-cols-2 gap-2">
          {CAMPOS.filter((c) => !c.soReels || form.formato === "Reels").map((c) => (
            <CampoTexto key={c.chave} rotulo={c.rotulo} inputMode="decimal" value={form[c.chave]} onChange={(e) => alterar(c.chave, e.target.value)} className="tabular" placeholder="—" />
          ))}
        </div>
        <p className="text-xs text-texto-3">Interações = curtidas + comentários + salvamentos + compartilhamentos (calculado ao salvar).</p>
      </div>
    </Painel>
  );
}
