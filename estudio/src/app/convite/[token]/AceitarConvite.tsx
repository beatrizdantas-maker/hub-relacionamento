"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { aceitarConvite } from "@/app/(app)/empresas/acoes";

export function AceitarConvite({ token }: { token: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function aceitar() {
    setErro(null);
    iniciar(async () => {
      const r = await aceitarConvite(token);
      if (!r.ok) return setErro(r.erro);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Botao className="w-full" carregando={pendente} onClick={aceitar}>Aceitar convite</Botao>
    </div>
  );
}
