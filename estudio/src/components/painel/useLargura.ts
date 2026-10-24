"use client";

import { useEffect, useRef, useState } from "react";

/** Largura real do contêiner, para o SVG desenhar em pixels de tela (texto legível no celular). */
export function useLargura(padrao = 640, minimo = 300) {
  const ref = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(padrao);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(minimo, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [minimo]);
  return { ref, largura };
}
