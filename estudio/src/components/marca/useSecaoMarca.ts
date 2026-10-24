"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarMarca } from "@/app/(app)/marca/acoes";
import type { Empresa } from "@/lib/tipos/database";
import type { SecaoMarca } from "@/lib/validacao/empresa";
import { calcularMesclagem, igual } from "@/lib/mesclagem";

export type Conflito<T> = {
  atual: Empresa;                 // versão que está no banco
  campos: (keyof T)[];            // campos que ambos mudaram (precisam de escolha)
  escolhas: Partial<Record<keyof T, "meu" | "deles">>;
};

/**
 * Estado de uma seção da tela Marca.
 * - Rascunho em localStorage: o que está sendo digitado sobrevive a recarregar a página.
 * - Bloqueio otimista: salva só se o registro não mudou desde que foi carregado.
 * - Conflito: campos que só o outro membro mudou entram sozinhos; campos que os dois
 *   mudaram pedem escolha. Nada do que foi digitado se perde.
 */
export function useSecaoMarca<T extends Record<string, unknown>>(opcoes: {
  empresa: Empresa;
  secao: SecaoMarca;
  deEmpresa: (e: Empresa) => T;
  podeEditar: boolean;
}) {
  const { empresa, secao, deEmpresa, podeEditar } = opcoes;
  const router = useRouter();
  const chaveRascunho = `estudio:marca:${empresa.id}:${secao}`;

  const [original, setOriginal] = useState<T>(() => deEmpresa(empresa));
  const [base, setBase] = useState(empresa.atualizado_em);
  const [valores, setValores] = useState<T>(() => deEmpresa(empresa));
  const [rascunhoDe, setRascunhoDe] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [conflito, setConflito] = useState<Conflito<T> | null>(null);
  const [pendente, iniciar] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Se a empresa veio nova do servidor (outra pessoa salvou e a página recarregou) e não há edição local, acompanha.
  useEffect(() => {
    if (empresa.atualizado_em === base) return;
    const novo = deEmpresa(empresa);
    if (igual(valores, original)) {
      setValores(novo);
    }
    setOriginal(novo);
    setBase(empresa.atualizado_em);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa.atualizado_em]);

  // Restaura rascunho ao montar.
  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chaveRascunho);
      if (!bruto) return;
      const { valores: v, em } = JSON.parse(bruto) as { valores: T; em: string };
      if (!igual(v, deEmpresa(empresa))) {
        setValores(v);
        setRascunhoDe(em);
      } else {
        localStorage.removeItem(chaveRascunho);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveRascunho]);

  const alterado = useMemo(() => !igual(valores, original), [valores, original]);

  const alterar = useCallback(
    (parcial: Partial<T>) => {
      setValores((v) => {
        const novo = { ...v, ...parcial };
        if (temporizador.current) clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => {
          try {
            localStorage.setItem(chaveRascunho, JSON.stringify({ valores: novo, em: new Date().toISOString() }));
          } catch {}
        }, 300);
        return novo;
      });
      setSalvoEm(null);
    },
    [chaveRascunho],
  );

  function limparRascunho() {
    if (temporizador.current) clearTimeout(temporizador.current);
    try { localStorage.removeItem(chaveRascunho); } catch {}
    setRascunhoDe(null);
  }

  function descartar() {
    limparRascunho();
    setValores(original);
    setConflito(null);
    setErro(null);
  }

  function salvar(valoresParaSalvar: T = valores, baseParaSalvar: string = base) {
    if (!podeEditar) return;
    setErro(null);
    iniciar(async () => {
      const r = await atualizarMarca(empresa.id, secao, valoresParaSalvar, baseParaSalvar);
      if (r.ok) {
        const novo = deEmpresa(r.empresa);
        setOriginal(novo);
        setValores(novo);
        setBase(r.empresa.atualizado_em);
        setConflito(null);
        limparRascunho();
        setSalvoEm(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
        router.refresh();
        return;
      }
      if ("conflito" in r) {
        const deles = deEmpresa(r.conflito);
        const { mesclado, conflitos: ambos } = calcularMesclagem(original, valoresParaSalvar, deles);
        if (ambos.length === 0) {
          // Sem choque real: aplica o que veio do outro membro e salva de novo na versão nova.
          setOriginal(deles);
          setBase(r.conflito.atualizado_em);
          setValores(mesclado);
          const r2 = await atualizarMarca(empresa.id, secao, mesclado, r.conflito.atualizado_em);
          if (r2.ok) {
            const novo = deEmpresa(r2.empresa);
            setOriginal(novo);
            setValores(novo);
            setBase(r2.empresa.atualizado_em);
            limparRascunho();
            setSalvoEm(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
            router.refresh();
          } else {
            setErro("erro" in r2 ? r2.erro : "Outra pessoa salvou de novo. Tente mais uma vez.");
          }
          return;
        }
        setValores(mesclado);
        setConflito({ atual: r.conflito, campos: ambos, escolhas: Object.fromEntries(ambos.map((k) => [k, "meu"])) as Conflito<T>["escolhas"] });
        return;
      }
      setErro(r.erro);
    });
  }

  function escolherConflito(campo: keyof T, escolha: "meu" | "deles") {
    setConflito((c) => (c ? { ...c, escolhas: { ...c.escolhas, [campo]: escolha } } : c));
  }

  function salvarMesclado() {
    if (!conflito) return;
    const deles = deEmpresa(conflito.atual);
    const final = { ...valores };
    for (const k of conflito.campos) if (conflito.escolhas[k] === "deles") final[k] = deles[k];
    setOriginal(deles);
    setBase(conflito.atual.atualizado_em);
    setValores(final);
    setConflito(null);
    salvar(final, conflito.atual.atualizado_em);
  }

  return { valores, alterar, alterado, salvar: () => salvar(), descartar, pendente, erro, salvoEm, rascunhoDe, conflito, escolherConflito, salvarMesclado, limparRascunho };
}
