import { describe, expect, it } from "vitest";
import { arquivosEsperados, contarHashtags, idPaginaLinkedin, problemasPublicacao, textoLinkedin, type ArquivoPublicacao } from "@/lib/publicacao";

const img = (n = 1): ArquivoPublicacao[] => Array.from({ length: n }, (_, i) => ({ caminho: `e/c/${i}.jpg`, url: `https://x/${i}.jpg`, tipo: "imagem" }));
const vid: ArquivoPublicacao = { caminho: "e/c/v.mp4", url: "https://x/v.mp4", tipo: "video" };

describe("publicação automática", () => {
  it("Instagram: cada formato pede o arquivo certo", () => {
    expect(problemasPublicacao("instagram", "Reels", [vid], "Legenda")).toEqual([]);
    expect(problemasPublicacao("instagram", "Reels", [], "Legenda")).toEqual(["Falta enviar o vídeo."]);
    expect(problemasPublicacao("instagram", "Carrossel", img(1), "L")).toEqual(["Envie pelo menos 2 imagens."]);
    expect(problemasPublicacao("instagram", "Carrossel", img(11), "L")).toEqual(["No máximo 10 imagens."]);
    expect(problemasPublicacao("instagram", "Estático", [...img(1), vid], "L")).toEqual(["Estático usa só imagem: tire o vídeo."]);
    expect(problemasPublicacao("instagram", "Estático", img(1), " ")).toEqual(["Escreva a legenda."]);
    expect(problemasPublicacao("instagram", "Texto", [], "L")[0]).toContain("não é publicado automaticamente");
  });

  it("Instagram: limite de hashtags e de tamanho", () => {
    const muitas = Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(" ");
    expect(problemasPublicacao("instagram", "Estático", img(1), `Texto ${muitas}`)).toEqual(["O Instagram aceita no máximo 30 hashtags."]);
    expect(problemasPublicacao("instagram", "Estático", img(1), "x".repeat(2201))).toEqual(["A legenda passa de 2200 caracteres."]);
    expect(contarHashtags("Oi #a e #b, mas não e-mail#c")).toBe(2);
  });

  it("LinkedIn: texto com foto opcional; artigo e carrossel ficam de fora", () => {
    expect(problemasPublicacao("linkedin", "Texto", [], "Post")).toEqual([]);
    expect(problemasPublicacao("linkedin", "Texto", img(1), "Post")).toEqual([]);
    expect(problemasPublicacao("linkedin", "Texto", img(2), "Post")).toEqual(["Deixe só 1 imagem."]);
    expect(problemasPublicacao("linkedin", "Reels", [], "Post")).toEqual(["Falta enviar o vídeo."]);
    expect(problemasPublicacao("linkedin", "Reels", [vid], "")).toEqual(["Escreva o texto do post."]);
    expect(problemasPublicacao("linkedin", "Artigo", [], "x")[0]).toContain("Escrever artigo");
    expect(problemasPublicacao("linkedin", "Carrossel", img(3), "x")[0]).toContain("não é publicado automaticamente no LinkedIn");
    expect(arquivosEsperados("linkedin", "Estático")?.ajuda).toBe("1 foto.");
  });

  it("LinkedIn: escapa caracteres reservados e mantém hashtags clicáveis", () => {
    expect(textoLinkedin("Gestão (escolar) é #educacao e #gestao_escolar!")).toBe("Gestão \\(escolar\\) é {hashtag|\\#|educacao} e {hashtag|\\#|gestao_escolar}!");
    expect(textoLinkedin("Fale com @nara_edu *agora* <já>")).toBe("Fale com \\@nara\\_edu \\*agora\\* \\<já\\>");
    expect(textoLinkedin("#inicio\nlinha")).toBe("{hashtag|\\#|inicio}\nlinha");
    expect(textoLinkedin("item#1")).toBe("item\\#1");
  });

  it("LinkedIn: número da página a partir do link", () => {
    expect(idPaginaLinkedin("12345678")).toBe("12345678");
    expect(idPaginaLinkedin("https://www.linkedin.com/company/12345678/admin/")).toBe("12345678");
    expect(idPaginaLinkedin("urn:li:organization:987654")).toBe("987654");
    expect(idPaginaLinkedin("https://www.linkedin.com/company/naraedu/")).toBeNull();
  });
});
