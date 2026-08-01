export type PaymentMethod = 'stripe' | 'paypal' | 'googlepay' | 'metamask' | 'bank';

export const MERCHANT_WALLET = '0xf44910f8F13BC4B485bb9ce2406d83a3F0Ada1F2';

export const BANK_IBAN = 'MZ59 0003 0000 0000 0000 0000';
export const BANK_NAME = 'Bluewhite Corporation Lda. — Conta Connected';

const STRIPE_LINKS_KEY = 'connected_stripe_links';

export interface PaymentOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  description: string;
  processingTime: string;
}

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'stripe',
    name: 'Stripe (Cartão)',
    icon: '💳',
    description: 'Visa, Mastercard, Apple Pay & Google Pay via Stripe',
    processingTime: 'Instantâneo',
  },
  {
    id: 'bank',
    name: 'Transferência Bancária',
    icon: '🏦',
    description: 'IBAN / Referência bancária em Meticais (MZN)',
    processingTime: '1-3 dias úteis',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: '🅿️',
    description: 'Conta PayPal ou cartão via PayPal',
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
    description: 'Transferência manual para a carteira da Connected',
    processingTime: '~2 min (confirmações)',
  },
];

export const POINTS_PACKAGES = [
  { id: 'starter', points: 100, price: 128, popular: false },
  { id: 'basic', points: 500, price: 512, popular: true },
  { id: 'pro', points: 1500, price: 1280, popular: false },
  { id: 'premium', points: 5000, price: 3200, popular: false },
];

export function getStripeLinks(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STRIPE_LINKS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function setStripeLinks(links: Record<string, string>) {
  localStorage.setItem(STRIPE_LINKS_KEY, JSON.stringify(links));
}

export function getStripeLinkForPackage(packageId: string): string | null {
  return getStripeLinks()[packageId] || null;
}

export function generateBankReference(): string {
  const n = Math.floor(100000 + Math.random() * 899999);
  return `CONN-${Date.now().toString().slice(-6)}-${n}`;
}

export function isValidBankReference(ref: string): boolean {
  return /^CONN-\d{6}-\d{6}$/.test(ref);
}

export function isValidStripeLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('buy.stripe.com');
  } catch {
    return false;
  }
}

export function buildStripeUrl(link: string, email?: string, clientReferenceId?: string): string {
  try {
    const url = new URL(link);
    if (email) url.searchParams.set('prefilled_email', email);
    if (clientReferenceId) url.searchParams.set('client_reference_id', clientReferenceId);
    return url.toString();
  } catch {
    return link;
  }
}
