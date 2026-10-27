import { describe, expect, it } from "vitest";
import { FORMATOS_POR_REDE, faltaMigracaoLinkedin, redeDe, redesDaEmpresa, ritmoLinkedinOuPadrao, rotuloFormato, RITMO_LINKEDIN_PADRAO } from "@/lib/redes";
import { gerarTarefasPadrao } from "@/lib/tarefasPadrao";
import { formatarRoteiro, problemasBriefing, type Briefing } from "@/lib/ia/briefing";
import { postagensComArte, textoDasArtes, textoDasFalas, type ConteudoArte } from "@/lib/copiarArtes";
import { filtrosPara } from "@/components/calendario/rotulos";

const base: Briefing = {
  conceito_visual: { estilo: "e", paleta: "p", tipografia: "t", fotografia: "f", elementos: "el" },
  slides: [], arte_estatico: null, enquete: null, artigo: null, cenas: [], musica: null, dicas_producao: [],
};

describe("redes", () => {
  it("o mesmo formato ganha nome do LinkedIn", () => {
    expect(rotuloFormato("Reels", "linkedin")).toBe("Vídeo");
    expect(rotuloFormato("Estático", "linkedin")).toBe("Foto");
    expect(rotuloFormato("Reels")).toBe("Reels");
    expect(FORMATOS_POR_REDE.instagram).not.toContain("Texto");
    expect(FORMATOS_POR_REDE.linkedin).toEqual(["Texto", "Reels", "Estático", "Artigo"]);
  });

  it("sem a coluna no banco, tudo é Instagram", () => {
    expect(redeDe({})).toBe("instagram");
    expect(redeDe({ rede: "linkedin" })).toBe("linkedin");
    expect(redesDaEmpresa({})).toEqual(["instagram"]);
    expect(redesDaEmpresa({ redes: ["linkedin", "instagram"] })).toEqual(["instagram", "linkedin"]);
  });

  it("ritmo do LinkedIn: 7 dias, um post por dia, sem carrossel; usa o padrão quando vazio", () => {
    expect(RITMO_LINKEDIN_PADRAO.map((r) => r.dia)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(RITMO_LINKEDIN_PADRAO.every((r) => FORMATOS_POR_REDE.linkedin.includes(r.formato))).toBe(true);
    expect(ritmoLinkedinOuPadrao(null)).toEqual(RITMO_LINKEDIN_PADRAO);
    expect(ritmoLinkedinOuPadrao([])).toEqual(RITMO_LINKEDIN_PADRAO);
    const proprio = RITMO_LINKEDIN_PADRAO.map((r) => ({ ...r, hora: "07:30" }));
    expect(ritmoLinkedinOuPadrao(proprio)[0].hora).toBe("07:30");
  });

  it("reconhece o erro de banco sem a migração do LinkedIn", () => {
    expect(faltaMigracaoLinkedin({ message: 'column "rede" of relation "conteudos" does not exist' })).toBe(true);
    expect(faltaMigracaoLinkedin({ message: "Could not find the 'ritmo_linkedin' column of 'empresas' in the schema cache" })).toBe(true);
    expect(faltaMigracaoLinkedin({ message: 'invalid input value for enum estudio.formato_conteudo: "Texto"' })).toBe(true);
    expect(faltaMigracaoLinkedin({ message: "new row violates row-level security policy" })).toBe(false);
    expect(faltaMigracaoLinkedin(null)).toBe(false);
  });

  it("filtros de formato acompanham as redes na tela", () => {
    expect(filtrosPara(["instagram"])).toEqual(["todos", "Reels", "Carrossel", "Estático", "Stories"]);
    expect(filtrosPara(["linkedin"])).toEqual(["todos", "Reels", "Estático", "Texto", "Artigo"]);
    expect(filtrosPara(["instagram", "linkedin"])).toEqual(["todos", "Reels", "Carrossel", "Estático", "Texto", "Artigo", "Stories"]);
  });
});

describe("formatos do LinkedIn", () => {
  it("tarefas padrão de texto, enquete e artigo", () => {
    const titulos = (formato: "Texto" | "Enquete" | "Artigo") => gerarTarefasPadrao({ formato, data: "2026-11-10", hoje: "2026-10-24" }).map((t) => [t.titulo, t.prazo]);
    expect(titulos("Texto")).toEqual([["Escrever o texto", "2026-11-08"], ["Revisar e agendar", "2026-11-09"]]);
    expect(titulos("Enquete")).toEqual([["Escrever a enquete", "2026-11-09"], ["Agendar", "2026-11-09"]]);
    expect(titulos("Artigo").map((x) => x[0])).toEqual(["Escrever o artigo", "Criar a capa", "Revisar e publicar"]);
  });

  it("enquete e artigo: roteiro formatado e checagem do que faltou", () => {
    const enquete = { ...base, enquete: { pergunta: "Qual o maior desafio?", opcoes: ["Professores", " ", "Famílias"] } };
    expect(formatarRoteiro("Enquete", enquete)).toBe("PERGUNTA: Qual o maior desafio?\nOPÇÕES:\n1. Professores\n2. Famílias");
    expect(problemasBriefing("Enquete", enquete)).toEqual([]);
    expect(problemasBriefing("Enquete", { ...base, enquete: { pergunta: "Só?", opcoes: ["A"] } })).toEqual(["enquete precisa de pergunta e pelo menos 2 opções"]);

    const artigo = { ...base, artigo: { titulo: "Gestão", subtitulo: "", secoes: [{ intertitulo: "Um", texto: "A" }, { intertitulo: "Dois", texto: "B" }] } };
    expect(formatarRoteiro("Artigo", artigo)).toBe("TÍTULO: Gestão\n\n## Um\nA\n\n## Dois\nB");
    expect(problemasBriefing("Artigo", { ...artigo, artigo: { ...artigo.artigo, secoes: [artigo.artigo.secoes[0]] } })).toEqual(["artigo precisa de título e pelo menos 2 seções"]);
  });

  it("texto: imagem de apoio opcional", () => {
    expect(formatarRoteiro("Texto", base)).toContain("post só com texto");
    expect(formatarRoteiro("Texto", { ...base, arte_estatico: { titulo_na_arte: "", texto_na_arte: "", imagem: "Foto da equipe", composicao: "" } })).toBe("IMAGEM DE APOIO: Foto da equipe");
  });
});

describe("cópias com LinkedIn", () => {
  const c = (p: Partial<ConteudoArte> & { data: string; formato: ConteudoArte["formato"] }): ConteudoArte => ({ hora: null, tema: "Tema", status: "aprovado", roteiro: null, orientacao_arte: null, ...p });

  it("artes: entra texto com imagem de apoio e artigo; texto puro e enquete ficam de fora", () => {
    const lista = postagensComArte([
      c({ data: "2026-11-02", formato: "Texto", rede: "linkedin", tema: "com imagem", roteiro: "IMAGEM DE APOIO: foto" }),
      c({ data: "2026-11-02", formato: "Texto", rede: "linkedin", tema: "só texto", roteiro: "(post só com texto: …)" }),
      c({ data: "2026-11-03", formato: "Enquete", rede: "linkedin", tema: "enquete" }),
      c({ data: "2026-11-04", formato: "Artigo", rede: "linkedin", tema: "artigo" }),
    ]);
    expect(lista.map((x) => x.tema)).toEqual(["com imagem", "artigo"]);
    const { texto } = textoDasArtes(lista, { empresa: "NARAEDU", periodo: "Semana" });
    expect(texto).toContain("LINKEDIN · TEXTO");
    expect(texto).toContain("TEXTO DO POST E IMAGEM DE APOIO");
  });

  it("falas: o vídeo do LinkedIn aparece marcado", () => {
    const { texto, total } = textoDasFalas([c({ data: "2026-11-05", formato: "Reels", rede: "linkedin", tema: "Especialista", roteiro: 'CENA 1 · 0s–5s\nIMAGEM: x\nFALA: "Olá"' })], { empresa: "NARAEDU", periodo: "Semana" });
    expect(total).toBe(1);
    expect(texto).toContain("LINKEDIN · Especialista");
    expect(texto).toContain("[0s–5s] Olá");
  });
});
