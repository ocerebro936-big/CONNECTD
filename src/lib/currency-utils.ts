export type CurrencyCode = 'MZN' | 'USD' | 'EUR' | 'ZAR';

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
}

const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  MZN: 1.0,
  USD: 0.0156,
  EUR: 0.0143,
  ZAR: 0.283,
};

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  MZN: { code: 'MZN', symbol: 'MT', name: 'Metical', flag: '🇲🇿' },
  USD: { code: 'USD', symbol: '$', name: 'Dólar Americano', flag: '💵' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '💶' },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'Rand Sul-Africano', flag: '🇿🇦' },
};

export function convertMzn(valueInMzn: number, target: CurrencyCode): number {
  const rate = EXCHANGE_RATES[target] ?? 1.0;
  return valueInMzn * rate;
}

export function formatCurrency(valueInMzn: number, target: CurrencyCode = 'MZN'): string {
  const converted = convertMzn(valueInMzn, target);
  const info = CURRENCIES[target];
  const formatted = converted.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${info.symbol}`;
}

export function formatCurrencyWithFlag(valueInMzn: number, target: CurrencyCode = 'MZN'): string {
  const info = CURRENCIES[target];
  return `${info.flag} ${formatCurrency(valueInMzn, target)}`;
}

export function getSupportedCurrencies(): CurrencyCode[] {
  return ['MZN', 'USD', 'EUR', 'ZAR'];
}

export { EXCHANGE_RATES };
