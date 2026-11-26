// Medidas de pneu em qualquer formato usado no cadastro ou na consulta.
// Formato canônico: "largura/perfil-aro" (ex.: "90/90-17") ou, no formato
// antigo em polegadas, "largura-aro" (ex.: "2.75-18").

export interface MedidaSeparada {
  // Medida canônica encontrada no texto, ou null
  medida: string | null;
  // Texto em minúsculas, sem a medida (espaços no lugar dela)
  resto: string;
}

interface Achado {
  inicio: number;
  tamanho: number;
  canonica: string;
}

// Aro primeiro: "17-90/90" ou "17-110/90" (aro 17, largura 110, perfil 90)
const ARO_PRIMEIRO = /(?<![\d.,])(\d{2})-(\d{2,3})\/(\d{2,3})(?!\d)/g;
// Largura e perfil antes do aro: "90/90-17", "80/100-18", "80 100-18"
const LARGURA_PERFIL_ARO = /(?<![\d.,])(\d{2,3})[\/ ](\d{2,3})-(\d{2})(?!\d)/g;
// Formato em polegadas: "2.75-18" ou "2,75-18"
const POLEGADA = /(?<![\d.,])(\d{1,2}[.,]\d{1,2})-(\d{2})(?!\d)/g;

const aroValido = (aro: number): boolean => aro >= 8 && aro <= 30;
const larguraValida = (largura: number): boolean => largura >= 40 && largura <= 400;
const perfilValido = (perfil: number): boolean => perfil >= 20 && perfil <= 100;

function encontrarMedidas(texto: string): Achado[] {
  const achados: Achado[] = [];

  for (const m of texto.matchAll(ARO_PRIMEIRO)) {
    const aro = Number(m[1]);
    const largura = Number(m[2]);
    const perfil = Number(m[3]);
    if (aroValido(aro) && larguraValida(largura) && perfilValido(perfil)) {
      achados.push({
        inicio: m.index!,
        tamanho: m[0].length,
        canonica: `${largura}/${perfil}-${aro}`,
      });
    }
  }

  for (const m of texto.matchAll(LARGURA_PERFIL_ARO)) {
    const largura = Number(m[1]);
    const perfil = Number(m[2]);
    const aro = Number(m[3]);
    if (aroValido(aro) && larguraValida(largura) && perfilValido(perfil)) {
      achados.push({
        inicio: m.index!,
        tamanho: m[0].length,
        canonica: `${largura}/${perfil}-${aro}`,
      });
    }
  }

  for (const m of texto.matchAll(POLEGADA)) {
    const largura = Number(m[1].replace(',', '.'));
    const aro = Number(m[2]);
    if (aroValido(aro) && largura >= 1 && largura <= 5) {
      achados.push({
        inicio: m.index!,
        tamanho: m[0].length,
        canonica: `${largura}-${aro}`,
      });
    }
  }

  return achados;
}

// Separa a primeira medida do texto. Se houver mais de uma, vale a primeira.
export function separarMedida(texto: string): MedidaSeparada {
  const minusculo = texto.toLowerCase();
  const [primeiro] = encontrarMedidas(minusculo).sort((a, b) => a.inicio - b.inicio);

  if (!primeiro) {
    return { medida: null, resto: minusculo };
  }

  const antes = minusculo.slice(0, primeiro.inicio);
  const depois = minusculo.slice(primeiro.inicio + primeiro.tamanho);
  return { medida: primeiro.canonica, resto: `${antes} ${depois}` };
}

// Medida canônica do texto (ex.: "PN 17-110/90 TRAS" -> "110/90-17"), ou null
export function normalizarMedida(texto: string): string | null {
  return separarMedida(texto).medida;
}
