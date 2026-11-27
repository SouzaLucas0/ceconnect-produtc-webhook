import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { montarConsultaBusca } from './busca';

const LIMITE = 50;

describe('montarConsultaBusca', () => {
  it('filtra a medida por igualdade e as demais palavras por LIKE', () => {
    const consulta = montarConsultaBusca('pn 17-90/90 tras', 'Teste', LIMITE);
    assert.ok(consulta);
    assert.deepEqual(consulta.params, ['Teste', '90/90-17', '%pn%', '%tras%']);
    assert.match(consulta.sql, /medida = \$2/);
    assert.match(consulta.sql, /lower\(descricao\) LIKE \$3/);
    assert.match(consulta.sql, /lower\(descricao\) LIKE \$4/);
  });

  it('aceita a medida escrita com barra e a palavra pneu fora do filtro', () => {
    const consulta = montarConsultaBusca('pneu 80/100-18', 'Teste', LIMITE);
    assert.ok(consulta);
    assert.deepEqual(consulta.params, ['Teste', '80/100-18', '%pneu%']);
  });

  it('com só a medida, filtra apenas pela medida', () => {
    const consulta = montarConsultaBusca('17-90/90', 'Teste', LIMITE);
    assert.ok(consulta);
    assert.deepEqual(consulta.params, ['Teste', '90/90-17']);
    assert.doesNotMatch(consulta.sql, /LIKE/);
  });

  it('ignora palavras de ligação', () => {
    const consulta = montarConsultaBusca('pneu da bros 80/100-18', 'Teste', LIMITE);
    assert.ok(consulta);
    assert.deepEqual(consulta.params, ['Teste', '80/100-18', '%pneu%', '%bros%']);
  });

  it('usa o limite e a ordenação por valor', () => {
    const consulta = montarConsultaBusca('pn tras', 'Teste', 50);
    assert.ok(consulta);
    assert.match(consulta.sql, /ORDER BY valor ASC\s+LIMIT 50/);
  });

  it('devolve null quando não há nada para buscar', () => {
    assert.equal(montarConsultaBusca('   ', 'Teste', LIMITE), null);
  });

  it('não envia curingas do LIKE para o banco (o % é separador)', () => {
    const consulta = montarConsultaBusca('100%', 'Teste', LIMITE);
    assert.ok(consulta);
    assert.deepEqual(consulta.params, ['Teste', '%100%']);
  });
});
