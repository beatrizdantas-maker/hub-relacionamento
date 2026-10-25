/** Datas comemorativas de data fixa no Brasil, úteis para o calendário (mês-dia → nome). */
const DATAS: Record<string, string> = {
  "01-01": "Ano Novo",
  "01-07": "Dia do Leitor",
  "02-14": "Dia dos Namorados (internacional)",
  "03-08": "Dia Internacional da Mulher",
  "03-15": "Dia do Consumidor",
  "04-07": "Dia Mundial da Saúde",
  "04-18": "Dia Nacional do Livro Infantil",
  "04-19": "Dia dos Povos Indígenas",
  "04-21": "Tiradentes",
  "04-22": "Descobrimento do Brasil",
  "04-28": "Dia da Educação",
  "05-01": "Dia do Trabalho",
  "05-15": "Dia da Família",
  "05-17": "Dia da Internet",
  "05-25": "Dia do Orgulho Nerd",
  "06-05": "Dia do Meio Ambiente",
  "06-12": "Dia dos Namorados",
  "07-10": "Dia da Pizza",
  "07-20": "Dia do Amigo",
  "07-26": "Dia dos Avós",
  "08-11": "Dia do Estudante",
  "08-15": "Dia da Informática",
  "08-22": "Dia do Folclore",
  "09-07": "Independência do Brasil",
  "09-15": "Dia do Cliente",
  "09-21": "Dia da Árvore",
  "10-01": "Dia do Vendedor",
  "10-12": "Dia das Crianças",
  "10-15": "Dia do Professor",
  "10-31": "Halloween",
  "11-15": "Proclamação da República",
  "11-19": "Dia do Empreendedor",
  "11-20": "Dia da Consciência Negra",
  "11-25": "Black Friday (última sexta de novembro, aproximado)",
  "12-25": "Natal",
  "12-31": "Réveillon",
};

/** Datas comemorativas dentro de um intervalo [de, ate] (AAAA-MM-DD). */
export function datasComemorativasEntre(de: string, ate: string): { data: string; nome: string }[] {
  const saida: { data: string; nome: string }[] = [];
  for (let ano = Number(de.slice(0, 4)); ano <= Number(ate.slice(0, 4)); ano++) {
    for (const [md, nome] of Object.entries(DATAS)) {
      const data = `${ano}-${md}`;
      if (data >= de && data <= ate) saida.push({ data, nome });
    }
  }
  return saida.sort((a, b) => a.data.localeCompare(b.data));
}
