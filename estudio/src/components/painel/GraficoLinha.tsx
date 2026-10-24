"use client";

import { useId, useState } from "react";
import { useLargura } from "./useLargura";
import { formatarNumero } from "@/lib/metricas";

export interface PontoGrafico { chave: string; rotulo: string; rotuloLongo: string; valor: number | null; parcial: boolean }

/**
 * Gráfico de linha de uma série (visualizações). Linha de 2px, marcadores ≥8px,
 * grade discreta, crosshair + tooltip no hover/toque. Períodos parciais em tracejado.
 * Cor da série: destaque da empresa. Textos sempre em tons de texto.
 */
export function GraficoLinha({ titulo, pontos, tipo = "numero" }: { titulo: string; pontos: PontoGrafico[]; tipo?: "numero" | "pct" }) {
  const id = useId();
  const [ativo, setAtivo] = useState<number | null>(null);
  const { ref, largura: L } = useLargura();
  const A = 220, mE = 48, mD = 12, mT = 26, mB = 28;
  const validos = pontos.filter((p) => p.valor != null);
  if (validos.length === 0) {
    return <Vazio titulo={titulo} />;
  }
  const max = Math.max(...validos.map((p) => p.valor!), 1);
  const min = Math.min(0, ...validos.map((p) => p.valor!));
  const n = pontos.length;
  const x = (i: number) => (n === 1 ? (mE + L - mD) / 2 : mE + (i * (L - mE - mD)) / (n - 1));
  const y = (v: number) => mT + (A - mT - mB) * (1 - (v - min) / (max - min || 1));
  const ticks = [0, 0.5, 1].map((f) => min + (max - min) * f);

  // Segmentos: contínuo entre pontos com valor; tracejado quando algum lado é parcial.
  const segmentos: { d: string; tracejado: boolean }[] = [];
  for (let i = 1; i < n; i++) {
    const a = pontos[i - 1], b = pontos[i];
    if (a.valor == null || b.valor == null) continue;
    segmentos.push({ d: `M${x(i - 1)},${y(a.valor)} L${x(i)},${y(b.valor)}`, tracejado: a.parcial || b.parcial });
  }
  const iMax = pontos.reduce((m, p, i) => (p.valor != null && (m < 0 || p.valor > pontos[m].valor!) ? i : m), -1);
  const rotulados = new Set([n <= 6 ? 0 : -1, n - 1, iMax].filter((i) => i >= 0 && pontos[i].valor != null));
  const passo = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((L - mE - mD) / 72))));

  return (
    <figure className="cartao space-y-2" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="text-sm font-semibold">{titulo}</figcaption>
      <div className="relative" ref={ref}>
        <svg viewBox={`0 0 ${L} ${A}`} width={L} height={A} className="block h-auto w-full" role="img" aria-label={`${titulo}: ${validos.map((p) => `${p.rotulo} ${formatarNumero(p.valor, tipo)}`).join(", ")}`}
          onMouseLeave={() => setAtivo(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={mE} x2={L - mD} y1={y(t)} y2={y(t)} className="stroke-borda" strokeWidth={1} />
              <text x={mE - 6} y={y(t) + 4} textAnchor="end" className="fill-texto-3 text-[11px] tabular">{formatarNumero(Math.round(t), tipo)}</text>
            </g>
          ))}
          {pontos.map((p, i) => (i % passo === 0 || i === n - 1) && (
            <text key={p.chave} x={x(i)} y={A - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-texto-3 text-[11px] tabular">{p.rotulo}</text>
          ))}
          {segmentos.map((s, i) => (
            <path key={i} d={s.d} fill="none" className="stroke-primaria" strokeWidth={2} strokeLinecap="round" strokeDasharray={s.tracejado ? "4 4" : undefined} />
          ))}
          {pontos.map((p, i) => p.valor != null && (
            <g key={p.chave}>
              <circle cx={x(i)} cy={y(p.valor)} r={ativo === i ? 6 : 4} className={p.parcial ? "fill-superficie stroke-primaria" : "fill-primaria stroke-superficie"} strokeWidth={2} />
              {rotulados.has(i) && ativo == null && (
                <text x={x(i)} y={Math.max(12, y(p.valor) - 10)} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-texto-2 text-[11px] font-medium tabular">{formatarNumero(p.valor, tipo)}</text>
              )}
            </g>
          ))}
          {ativo != null && pontos[ativo].valor != null && (
            <line x1={x(ativo)} x2={x(ativo)} y1={mT} y2={A - mB} className="stroke-texto-3" strokeWidth={1} strokeDasharray="3 3" />
          )}
          {/* Alvos de toque maiores que o marcador */}
          {pontos.map((p, i) => (
            <rect key={`h${p.chave}`} x={x(i) - (L - mE - mD) / (2 * Math.max(n - 1, 1))} y={0} width={(L - mE - mD) / Math.max(n - 1, 1)} height={A} fill="transparent"
              onMouseEnter={() => setAtivo(i)} onTouchStart={() => setAtivo(i)} onFocus={() => setAtivo(i)} tabIndex={0} aria-label={`${p.rotuloLongo}: ${formatarNumero(p.valor, tipo)}${p.parcial ? " (parcial)" : ""}`} />
          ))}
        </svg>
        {ativo != null && (
          <div role="status" className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg border border-borda bg-superficie px-2 py-1 text-xs shadow">
            <span className="text-texto-2">{pontos[ativo].rotuloLongo}</span>{" "}
            <span className="font-semibold tabular">{formatarNumero(pontos[ativo].valor, tipo)}</span>
            {pontos[ativo].parcial && <span className="ml-1 text-manual">parcial</span>}
          </div>
        )}
      </div>
    </figure>
  );
}

export function Vazio({ titulo }: { titulo: string }) {
  return (
    <figure className="cartao">
      <figcaption className="text-sm font-semibold">{titulo}</figcaption>
      <p className="mt-3 rounded-xl border border-dashed border-borda p-4 text-center text-sm text-texto-2">Sem dado ainda. Registre uma semana ou importe do Metricool.</p>
    </figure>
  );
}
