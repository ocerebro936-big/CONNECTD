export type PaymentMethod = 'paypal' | 'googlepay' | 'metamask' | 'bank';

export interface PaymentOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  description: string;
  processingTime: string;
}

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'paypal',
    name: 'PayPal',
    icon: '💳',
    description: 'Cartões de crédito/débito e conta PayPal',
    processingTime: 'Instantâneo',
  },
  {
    id: 'googlepay',
    name: 'Google Pay',
    icon: '📱',
    description: 'Carteira digital Google Pay',
    processingTime: 'Instantâneo',
  },
  {
    id: 'metamask',
    name: 'MetaMask (Web3)',
    icon: '🦊',
    description: 'Pagamento com ETH/Tokens via blockchain',
    processingTime: '~2 min (confirmações)',
  },
  {
    id: 'bank',
    name: 'Transferência Bancária',
    icon: '🏦',
    description: 'IBAN / Referência Multibanco',
    processingTime: '1-3 dias úteis',
  },
];

export const POINTS_PACKAGES = [
  { id: 'starter', points: 100, price: 128, popular: false },
  { id: 'basic', points: 500, price: 512, popular: true },
  { id: 'pro', points: 1500, price: 1280, popular: false },
  { id: 'premium', points: 5000, price: 3200, popular: false },
];

export async function processPayment(method: PaymentMethod, amount: number): Promise<{ success: boolean; txId?: string }> {
  await new Promise(r => setTimeout(r, 1500));
  switch (method) {
    case 'paypal':
      return { success: true, txId: `PAYPAL-${Date.now()}` };
    case 'googlepay':
      return { success: true, txId: `GPAY-${Date.now()}` };
    case 'metamask':
      // In production: ethers.js sign & send transaction
      return { success: true, txId: `0x${Date.now().toString(16)}` };
    case 'bank':
      return { success: true, txId: `BANK-REF-${Date.now()}` };
    default:
      return { success: false };
  }
}
