"use client";

import { useId, useState } from "react";
import { useLargura } from "./useLargura";
import { formatarNumero } from "@/lib/metricas";
import { Vazio, type PontoGrafico } from "./GraficoLinha";

/**
 * Barras de seguidores líquidos: verde quando positivo, vermelho quando negativo
 * (cores de estado, com o sinal no número e no tooltip, nunca só a cor).
 * Pontas arredondadas ancoradas na linha zero, 2px de folga entre barras.
 */
export function GraficoBarras({ titulo, pontos }: { titulo: string; pontos: PontoGrafico[] }) {
  const id = useId();
  const [ativo, setAtivo] = useState<number | null>(null);
  const { ref, largura: L } = useLargura();
  const A = 220, mE = 48, mD = 12, mT = 26, mB = 28;
  const validos = pontos.filter((p) => p.valor != null);
  if (validos.length === 0) return <Vazio titulo={titulo} />;
  const max = Math.max(0, ...validos.map((p) => p.valor!));
  const min = Math.min(0, ...validos.map((p) => p.valor!));
  const amplitude = max - min || 1;
  const n = pontos.length;
  const largura = (L - mE - mD) / n;
  const barra = Math.max(4, Math.min(28, largura - 2));
  const y = (v: number) => mT + (A - mT - mB) * (1 - (v - min) / amplitude);
  const y0 = y(0);
  const passo = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((L - mE - mD) / 72))));

  return (
    <figure className="cartao space-y-2" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="text-sm font-semibold">{titulo}</figcaption>
      <div className="relative" ref={ref}>
        <svg viewBox={`0 0 ${L} ${A}`} width={L} height={A} className="block h-auto w-full" role="img" aria-label={`${titulo}: ${validos.map((p) => `${p.rotulo} ${p.valor! > 0 ? "+" : ""}${formatarNumero(p.valor)}`).join(", ")}`} onMouseLeave={() => setAtivo(null)}>
          {[max, 0, min].filter((v, i, a) => a.indexOf(v) === i).map((t) => (
            <g key={t}>
              <line x1={mE} x2={L - mD} y1={y(t)} y2={y(t)} className={t === 0 ? "stroke-texto-3" : "stroke-borda"} strokeWidth={1} />
              <text x={mE - 6} y={y(t) + 4} textAnchor="end" className="fill-texto-3 text-[11px] tabular">{formatarNumero(t)}</text>
            </g>
          ))}
          {pontos.map((p, i) => {
            const cx = mE + largura * i + largura / 2;
            if (p.valor == null) {
              return <text key={p.chave} x={cx} y={y0 - 4} textAnchor="middle" className="fill-texto-3 text-[9px]">—</text>;
            }
            const alto = Math.abs(y(p.valor) - y0);
            const topo = p.valor >= 0 ? y0 - alto : y0;
            const r = Math.min(4, alto / 2, barra / 2);
            const d = p.valor >= 0
              ? `M${cx - barra / 2},${y0} V${topo + r} Q${cx - barra / 2},${topo} ${cx - barra / 2 + r},${topo} H${cx + barra / 2 - r} Q${cx + barra / 2},${topo} ${cx + barra / 2},${topo + r} V${y0} Z`
              : `M${cx - barra / 2},${y0} V${topo + alto - r} Q${cx - barra / 2},${topo + alto} ${cx - barra / 2 + r},${topo + alto} H${cx + barra / 2 - r} Q${cx + barra / 2},${topo + alto} ${cx + barra / 2},${topo + alto - r} V${y0} Z`;
            return (
              <g key={p.chave}>
                <path d={d} className={`${p.valor >= 0 ? "fill-real" : "fill-atrasado"} ${p.parcial ? "opacity-50" : ""} ${ativo === i ? "opacity-80" : ""}`} />
                {ativo == null && (i === n - 1 || Math.abs(p.valor) === Math.max(...validos.map((v) => Math.abs(v.valor!)))) && (
                  <text x={cx} y={p.valor >= 0 ? Math.max(12, topo - 6) : Math.min(A - mB - 2, topo + alto + 14)} textAnchor="middle" className="fill-texto-2 text-[11px] font-medium tabular">{p.valor > 0 ? "+" : ""}{formatarNumero(p.valor)}</text>
                )}
              </g>
            );
          })}
          {pontos.map((p, i) => (i % passo === 0 || i === n - 1) && (
            <text key={`r${p.chave}`} x={mE + largura * i + largura / 2} y={A - 8} textAnchor={i === n - 1 && largura < 40 ? "end" : "middle"} className="fill-texto-3 text-[11px] tabular">{p.rotulo}</text>
          ))}
          {pontos.map((p, i) => (
            <rect key={`h${p.chave}`} x={mE + largura * i} y={0} width={largura} height={A} fill="transparent" tabIndex={0}
              onMouseEnter={() => setAtivo(i)} onTouchStart={() => setAtivo(i)} onFocus={() => setAtivo(i)}
              aria-label={`${p.rotuloLongo}: ${p.valor == null ? "sem dado" : `${p.valor > 0 ? "+" : ""}${formatarNumero(p.valor)}`}${p.parcial ? " (parcial)" : ""}`} />
          ))}
        </svg>
        {ativo != null && (
          <div role="status" className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg border border-borda bg-superficie px-2 py-1 text-xs shadow">
            <span className="text-texto-2">{pontos[ativo].rotuloLongo}</span>{" "}
            <span className={`font-semibold tabular ${pontos[ativo].valor == null ? "" : pontos[ativo].valor! >= 0 ? "text-real" : "text-atrasado"}`}>
              {pontos[ativo].valor == null ? "sem dado" : `${pontos[ativo].valor! > 0 ? "+" : ""}${formatarNumero(pontos[ativo].valor)}`}
            </span>
            {pontos[ativo].parcial && <span className="ml-1 text-manual">parcial</span>}
          </div>
        )}
      </div>
    </figure>
  );
}
