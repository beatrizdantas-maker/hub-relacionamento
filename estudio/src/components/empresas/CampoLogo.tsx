"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { enviarLogo, validarArquivoLogo } from "@/lib/logo";
import { salvarLogo } from "@/app/(app)/empresas/acoes";

/**
 * Campo de logo. Com `empresaId`, envia e grava na hora. Sem `empresaId`
 * (empresa ainda não criada), só guarda o arquivo e devolve por `onArquivo`;
 * quem chama envia depois de criar a empresa.
 */
export function CampoLogo({
  empresaId,
  logoAtual,
  nome,
  disabled,
  onArquivo,
}: {
  empresaId?: string;
  logoAtual?: string | null;
  nome: string;
  disabled?: boolean;
  onArquivo?: (arquivo: File | null) => void;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(logoAtual ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [local, setLocal] = useState<string | null>(null);

  useEffect(() => () => { if (local) URL.revokeObjectURL(local); }, [local]);

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    const problema = validarArquivoLogo(arquivo);
    if (problema) return setErro(problema);
    const url = URL.createObjectURL(arquivo);
    setLocal(url);
    setPrevia(url);
    if (!empresaId) {
      onArquivo?.(arquivo);
      return;
    }
    setEnviando(true);
    try {
      const publica = await enviarLogo(empresaId, arquivo);
      const r = await salvarLogo(empresaId, publica);
      if (!r.ok) throw new Error(r.erro);
      setPrevia(publica);
      router.refresh();
    } catch (e) {
      setErro((e as Error).message);
      setPrevia(logoAtual ?? null);
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function remover() {
    setErro(null);
    if (!empresaId) {
      setPrevia(null);
      onArquivo?.(null);
      return;
    }
    setEnviando(true);
    const r = await salvarLogo(empresaId, null);
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setPrevia(null);
    router.refresh();
  }

  return (
    <div>
      <span className="rotulo">Logo</span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-borda bg-white">
          {previa ? <img src={previa} alt={`Logo de ${nome || "empresa"}`} className="h-full w-full object-contain p-1" /> : <ImagePlus className="h-6 w-6 text-texto-3" aria-hidden />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao type="button" variante="secundaria" tamanho="sm" carregando={enviando} disabled={disabled} onClick={() => entrada.current?.click()}>
            <ImagePlus className="h-4 w-4" aria-hidden /> {previa ? "Trocar logo" : "Escolher logo"}
          </Botao>
          {previa && (
            <Botao type="button" variante="fantasma" tamanho="sm" disabled={disabled || enviando} onClick={remover}>
              <Trash2 className="h-4 w-4" aria-hidden /> Remover
            </Botao>
          )}
        </div>
        <input
          ref={entrada}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          tabIndex={-1}
          aria-label="Arquivo da logo"
          disabled={disabled}
          onChange={(e) => escolher(e.target.files?.[0])}
        />
      </div>
      <p className="mt-1 text-xs text-texto-3">PNG, JPG, WebP ou SVG. De preferência quadrada e com fundo transparente. A imagem é reduzida automaticamente.</p>
      {erro && <div className="mt-2"><Aviso tipo="erro">{erro}</Aviso></div>}
    </div>
  );
}
