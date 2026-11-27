import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarMedida, separarMedida } from './medida';

describe('normalizarMedida', () => {
  it('reconhece aro primeiro, como usado na consulta do agente', () => {
    assert.equal(normalizarMedida('pn 17-90/90 tras'), '90/90-17');
  });

  it('converte o formato aro-primeiro do cadastro (aro 17, largura 110, perfil 90)', () => {
    assert.equal(normalizarMedida('PN 17-110/90 R34 TRAS NXR125/150/160'), '110/90-17');
    assert.equal(normalizarMedida('PN 17-100/90 SH31 TRAS.NXR CROSS'), '100/90-17');
  });

  it('reconhece largura/perfil-aro com barra', () => {
    assert.equal(normalizarMedida('pneu 80/100-18'), '80/100-18');
    assert.equal(normalizarMedida('90/90-17'), '90/90-17');
  });

  it('reconhece largura/perfil-aro com espaço no lugar da barra', () => {
    assert.equal(normalizarMedida('pn tras biz 80 100-18'), '80/100-18');
    assert.equal(normalizarMedida('PN TRAS BIZ 80 100-18'), '80/100-18');
  });

  it('mantém o formato em polegadas, com vírgula ou ponto', () => {
    assert.equal(normalizarMedida('2.75-18 traseiro'), '2.75-18');
    assert.equal(normalizarMedida('2,75-18'), '2.75-18');
  });

  it('ignora números que não são medida', () => {
    assert.equal(normalizarMedida('pn tras biz'), null);
    assert.equal(normalizarMedida('moto R34 125cc'), null);
    assert.equal(normalizarMedida('117-90/90'), null, 'o 17 faz parte de 117, não é aro');
  });

  it('usa a primeira medida quando há mais de uma', () => {
    assert.equal(normalizarMedida('90/90-17 ou 80/100-18'), '90/90-17');
  });
});

describe('separarMedida', () => {
  it('retira a medida do texto e mantém o resto', () => {
    const { medida, resto } = separarMedida('pn tras biz 80 100-18');
    assert.equal(medida, '80/100-18');
    assert.equal(resto.split(/\s+/).filter(Boolean).join(' '), 'pn tras biz');
  });

  it('sem medida, devolve o texto em minúsculas', () => {
    assert.deepEqual(separarMedida('PN Tras'), { medida: null, resto: 'pn tras' });
  });
});
