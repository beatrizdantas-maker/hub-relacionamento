"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Selo } from "@/components/ui/Selo";
import { Confirmacao } from "@/components/ui/Confirmacao";
import { CampoArea, CampoTexto } from "@/components/ui/Campo";
import { Painel } from "@/components/calendario/Painel";
import { CAMPOS_METRICA } from "@/lib/validacao/metricas";
import { inicioDaSemana, formatarCurta, somarDias } from "@/lib/datas";
import { rotuloFonte } from "@/lib/metricas";
import { excluirMetricaSemanal, salvarMetricaSemanal } from "@/app/(app)/painel/acoes";
import type { MetricaSemanal } from "@/lib/tipos/database";

type Valores = Record<string, string>;

function valoresDe(m: MetricaSemanal | null): Valores {
  const v: Valores = {};
  for (const c of CAMPOS_METRICA) v[c.chave] = m?.[c.chave] == null ? "" : String(m[c.chave]);
  return v;
}

export function FormularioMetricas({ empresaId, hoje, semanaInicial, existente, podeExcluir, onFechar }: { empresaId: string; hoje: string; semanaInicial: string; existente: MetricaSemanal | null; podeExcluir: boolean; onFechar: () => void }) {
  const router = useRouter();
  const [semana, setSemana] = useState(semanaInicial);
  const [valores, setValores] = useState<Valores>(() => valoresDe(existente));
  const [notas, setNotas] = useState(existente?.notas ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const segunda = useMemo(() => (/^\d{4}-\d{2}-\d{2}$/.test(semana) ? inicioDaSemana(semana) : semana), [semana]);
  const parcial = segunda <= hoje && somarDias(segunda, 6) >= hoje;
  const grupos = useMemo(() => [...new Set(CAMPOS_METRICA.map((c) => c.grupo))], []);
  const fonte = rotuloFonte(existente?.fonte ?? null, existente?.editado_manual);

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarMetricaSemanal(empresaId, { semana: segunda, ...valores, notas });
      if (!r.ok) return setErro(r.erro);
      router.refresh();
      onFechar();
    });
  }

  function excluir() {
    if (!existente) return;
    iniciar(async () => {
      const r = await excluirMetricaSemanal(empresaId, existente.semana);
      if (!r.ok) { setErro(r.erro); setExcluindo(false); return; }
      router.refresh();
      onFechar();
    });
  }

  const rodape = !excluindo ? (
    <div className="flex flex-wrap items-center gap-2">
      <Botao carregando={pendente} onClick={salvar}><Check className="h-4 w-4" aria-hidden /> Salvar semana</Botao>
      <Botao variante="secundaria" onClick={onFechar} disabled={pendente}>Cancelar</Botao>
      {existente && podeExcluir && <Botao variante="fantasma" className="ml-auto text-atrasado" onClick={() => setExcluindo(true)} disabled={pendente}><Trash2 className="h-4 w-4" aria-hidden /> Excluir</Botao>}
    </div>
  ) : null;

  return (
    <Painel titulo={existente ? `Semana de ${formatarCurta(existente.semana)}` : "Registrar semana"} onFechar={onFechar} rodape={rodape}>
      <div className="space-y-4">
        {existente && <Selo tom={fonte.tom}>{fonte.texto}</Selo>}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {excluindo && <Confirmacao titulo="Excluir o registro desta semana?" descricao="Some do painel e dos gráficos." rotuloConfirmar="Excluir" carregando={pendente} onConfirmar={excluir} onCancelar={() => setExcluindo(false)} />}
        <p className="text-sm text-texto-2">Preencha só o que você tem. Campo vazio fica como “sem dado”: nada é inventado.</p>
        <CampoTexto rotulo="Semana (qualquer dia dela)" type="date" value={semana} max={hoje} disabled={Boolean(existente)} onChange={(e) => setSemana(e.target.value)} className="tabular"
          ajuda={/^\d{4}-\d{2}-\d{2}$/.test(semana) ? `Segunda ${formatarCurta(segunda)} a domingo ${formatarCurta(somarDias(segunda, 6))}${parcial ? " · semana em andamento (parcial)" : ""}` : undefined} />
        {existente?.fonte === "metricool" && <Aviso tipo="info">Esta semana veio do Metricool. O que você alterar fica marcado como ajustado à mão e não é sobrescrito na próxima importação.</Aviso>}
        {grupos.map((g) => (
          <fieldset key={g} className="space-y-2">
            <legend className="text-sm font-semibold">{g}</legend>
            <div className="grid grid-cols-2 gap-2">
              {CAMPOS_METRICA.filter((c) => c.grupo === g).map((c) => (
                <CampoTexto key={c.chave} rotulo={c.rotulo} ajuda={c.ajuda} inputMode="numeric" value={valores[c.chave]} onChange={(e) => setValores((v) => ({ ...v, [c.chave]: e.target.value }))} className="tabular" placeholder="—" />
              ))}
            </div>
          </fieldset>
        ))}
        <CampoArea rotulo="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Ex.: semana com feriado; números do direct contados à mão." />
      </div>
    </Painel>
  );
}
