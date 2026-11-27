import { separarMedida } from './medida';

// Palavras que não ajudam a identificar um produto e são ignoradas na busca
export const PALAVRAS_DE_LIGACAO = new Set([
  'a', 'o', 'as', 'os', 'e', 'de', 'da', 'do', 'das', 'dos',
  'em', 'na', 'no', 'nas', 'nos', 'para', 'pra', 'pro', 'com', 'um', 'uma',
]);

export interface ConsultaBusca {
  sql: string;
  params: unknown[];
}

/**
 * Monta a consulta de busca de um cliente.
 *
 * - Se a consulta tiver uma medida de pneu (ex.: "17-90/90"), ela vira um
 *   filtro de igualdade na coluna `medida`, normalizada no cadastro.
 * - As demais palavras entram uma a uma: a descrição precisa conter cada uma.
 * - Só entram produtos ativos com estoque > 0, do menor para o maior valor.
 *
 * Retorna null quando a consulta não tem nada para buscar.
 */
export function montarConsultaBusca(
  consulta: string,
  cliente: string,
  limite: number,
): ConsultaBusca | null {
  const { medida, resto } = separarMedida(consulta);

  // Palavras de ligação (da, de, do...) são removidas da consulta
  const semLigacoes = resto
    .split(/\s+/)
    .filter((palavra) => palavra && !PALAVRAS_DE_LIGACAO.has(palavra))
    .join(' ');
  const palavras = (semLigacoes || resto).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  if (!palavras.length && !medida) {
    return null;
  }

  const params: unknown[] = [cliente];
  const condicoes: string[] = [];

  if (medida) {
    params.push(medida);
    condicoes.push(`medida = $${params.length}`);
  }

  for (const palavra of palavras) {
    // Escapa os curingas do LIKE (% e _) digitados pelo cliente
    params.push(`%${palavra.replace(/[\\%_]/g, '\\$&')}%`);
    condicoes.push(`lower(descricao) LIKE $${params.length}`);
  }

  const sql = `SELECT descricao, valor, marca, codigo
     FROM products
    WHERE lower(cliente) = lower($1::text)
      AND ativo = true
      AND estoque > 0
      AND ${condicoes.join('\n      AND ')}
    ORDER BY valor ASC
    LIMIT ${Number(limite)}`;

  return { sql, params };
}
