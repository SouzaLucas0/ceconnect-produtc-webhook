// Abreviações comuns nos nomes de produtos cadastrados pelos clientes.
// Chave = abreviação, valor = palavra completa.
export const ABREVIACOES: Record<string, string> = {
  tras: 'traseiro',
  diant: 'dianteiro',
  esq: 'esquerdo',
  dir: 'direito',
};

// Expande abreviações palavra a palavra (minúsculas).
// Ex.: "pneu tras biz" -> "pneu traseiro biz"
export function expandirAbreviacoes(texto: string): string {
  let resultado = texto.toLowerCase();
  for (const [abrev, completo] of Object.entries(ABREVIACOES)) {
    resultado = resultado.replace(new RegExp(`\\b${abrev}\\b`, 'g'), completo);
  }
  return resultado;
}

// Expressão SQL que deixa a coluna em minúsculas e expande as abreviações.
// Usada nos dois lados da comparação (consulta e descrição cadastrada).
export function normalizarSql(coluna: string): string {
  return Object.entries(ABREVIACOES).reduce(
    (expr, [abrev, completo]) =>
      // '\\m' e '\\M' são marcadores de início e fim de palavra no Postgres
      `regexp_replace(${expr}, '\\m${abrev}\\M', '${completo}', 'g')`,
    `lower(${coluna})`,
  );
}
