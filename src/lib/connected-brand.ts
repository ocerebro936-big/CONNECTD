// ============================================================================
// Connected — Identidade Oficial da Marca
// ----------------------------------------------------------------------------
// Hierarquia simbólica (marca/experiência), separada da infraestrutura técnica.
// A Coroa 👑 é símbolo de reconhecimento (excelência/contribuição), NÃO de
// autoridade administrativa.
// ============================================================================

export interface BrandTier {
  key: 'connect' | 'connecting' | 'connected' | 'connection' | 'connected_king';
  label: string;
  minPoints: number;
  crown: boolean;
  color: string;
  blurb: string;
}

export const BRAND_HIERARCHY: BrandTier[] = [
  { key: 'connect', label: 'Connect', minPoints: 0, crown: false, color: '#94a3b8', blurb: 'O início — liga-te à Connected.' },
  { key: 'connecting', label: 'Connecting', minPoints: 250, crown: false, color: '#38bdf8', blurb: 'Estás a conhecer e interagir.' },
  { key: 'connected', label: 'Connected', minPoints: 1000, crown: false, color: '#22c55e', blurb: 'Fazes parte do ecossistema. "We are Connected."' },
  { key: 'connection', label: 'Connection', minPoints: 5000, crown: false, color: '#a855f7', blurb: 'A tua relação move a rede.' },
  { key: 'connected_king', label: 'Connected King', minPoints: 15000, crown: true, color: '#eab308', blurb: 'Excelência, liderança e contribuição para a Connected.' },
];

export const BRAND_MARK = '👑 Connected';

export function getBrandTier(points: number): BrandTier {
  let tier = BRAND_HIERARCHY[0];
  for (const t of BRAND_HIERARCHY) {
    if ((points || 0) >= t.minPoints) tier = t;
  }
  return tier;
}
