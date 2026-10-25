import { describe, expect, it } from "vitest";
import { agregarPorSemana, lerDataPublicacao, normalizarPublicacao, normalizarStory } from "@/lib/metricool/agregar";

const diaNoFuso = (iso: string) => iso.slice(0, 10);

describe("agregação semanal do Metricool", () => {
  const dias = Array.from({ length: 7 }, (_, i) => ({ dia: `2026-10-${String(12 + i).padStart(2, "0")}`, seguidores: 4500 + i * 10, ganhos: 10, perdidos: 2, visualizacoes: 1000, alcance: 500, stories: 1 }));

  it("semana completa: somas, seguidores = último dia, alcance com 7 dias", () => {
    const [s] = agregarPorSemana(dias, [], [], "2026-10-24");
    expect(s.semana).toBe("2026-10-12");
    expect(s.seguidores).toBe(4560);
    expect(s.seguidores_ganhos).toBe(70);
    expect(s.seguidores_perdidos).toBe(14);
    expect(s.visualizacoes).toBe(7000);
    expect(s.alcance).toBe(3500);
    expect(s.stories).toBe(7);
    expect(s.dias_com_dados).toBe(7);
    expect(s.ultimo_dia).toBe("2026-10-18");
  });

  it("alcance fica nulo se faltar um dia; demais somas continuam", () => {
    const semDia = dias.slice(0, 6);
    const [s] = agregarPorSemana(semDia, [], [], "2026-10-24");
    expect(s.alcance).toBeNull();
    expect(s.visualizacoes).toBe(6000);
    expect(s.dias_com_dados).toBe(6);
  });

  it("interações, salvamentos e compartilhamentos vêm dos posts publicados na semana", () => {
    const pub = (dia: string, formato: "Reels" | "Carrossel", n: number) => ({
      id_externo: `${dia}-${formato}`, publicado_em: `${dia}T12:00:00Z`, dia, formato, titulo: null, url: null,
      alcance: 1000 * n, visualizacoes: null, curtidas: 10 * n, comentarios: n, salvamentos: 5 * n, compartilhamentos: 2 * n, interacoes: 18 * n, tempo_medio: null, taxa_visualizacao: null,
    });
    const [s] = agregarPorSemana(dias, [pub("2026-10-13", "Reels", 1), pub("2026-10-15", "Carrossel", 2), pub("2026-10-20", "Reels", 9)], [{ id_externo: "st1", dia: "2026-10-14", respostas: 4 }], "2026-10-24");
    expect(s.posts).toBe(1);
    expect(s.reels).toBe(1);
    expect(s.interacoes).toBe(54);
    expect(s.alcance_posts).toBe(3000);
    expect(s.salvamentos).toBe(15);
    expect(s.compartilhamentos).toBe(6);
    expect(s.respostas_stories).toBe(4);
  });

  it("semana em andamento conta só os dias possíveis", () => {
    const [s] = agregarPorSemana(dias.slice(0, 3), [], [], "2026-10-14");
    expect(s.dias_com_dados).toBe(3);
  });
});

describe("normalização de publicações", () => {
  it("lê data em epoch, ISO e {dateTime}", () => {
    expect(lerDataPublicacao({ timestamp: 1760000000000 })).toBe(new Date(1760000000000).toISOString());
    expect(lerDataPublicacao({ publishedAt: "2026-10-10T12:00:00Z" })).toBe("2026-10-10T12:00:00.000Z");
    expect(lerDataPublicacao({ publicationDate: { dateTime: "2026-10-10T09:00:00", timezone: "America/Sao_Paulo" } })).toContain("2026-10-10");
  });

  it("normaliza um post e um reel com nomes de campo do Metricool", () => {
    const p = normalizarPublicacao({ postId: "1", url: "https://instagram.com/p/x", type: "CAROUSEL_ALBUM", content: "Legenda  longa", timestamp: "2026-10-10T12:00:00Z", likes: 10, comments: 2, saved: 3, shares: 1, reach: 500, views: 800 }, "post", diaNoFuso)!;
    expect(p.formato).toBe("Carrossel");
    expect(p.interacoes).toBe(16);
    expect(p.titulo).toBe("Legenda longa");
    const r = normalizarPublicacao({ reelId: "2", url: "u", timestamp: "2026-10-11T12:00:00Z", interactions: 40, averageWatchTime: 7.5, reelsViewRate: 61.2 }, "reel", diaNoFuso)!;
    expect(r.formato).toBe("Reels");
    expect(r.interacoes).toBe(40);
    expect(r.tempo_medio).toBe(7.5);
    expect(r.taxa_visualizacao).toBe(61.2);
    expect(normalizarPublicacao({ likes: 1 }, "post", diaNoFuso)).toBeNull();
  });

  it("normaliza story com respostas", () => {
    expect(normalizarStory({ postId: "s1", timestamp: "2026-10-12T10:00:00Z", replies: 3 }, diaNoFuso)).toEqual({ id_externo: "s1", dia: "2026-10-12", respostas: 3 });
  });
});
