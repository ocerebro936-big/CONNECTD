// Connected Service: Marketplace (loja, anúncios, patrocinadores)
import { registerService, type ConnectedService, type HealthStatus } from '../service-bus/registry';

async function health(): Promise<HealthStatus> {
  return { status: 'ok', at: Date.now() };
}

const OFFERS = [
  { id: 'm1', title: 'Coroa Lendária', price: 120, category: 'cosmetic' },
  { id: 'm2', title: 'Pacote BlueCoin 500', price: 9.9, category: 'currency' },
  { id: 'm3', title: 'Destaque de Patrocinador', price: 49, category: 'ads' },
];

export const marketplaceService: ConnectedService = {
  id: 'market',
  name: 'Connected Marketplace',
  description: 'Loja, anúncios, patrocinadores e comércio da Connected King.',
  health,
  actions: {
    async offers() {
      return OFFERS;
    },
    async categories() {
      return [...new Set(OFFERS.map((o) => o.category))];
    },
  },
};

registerService(marketplaceService);
