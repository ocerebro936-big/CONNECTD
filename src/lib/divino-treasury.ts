export interface TreasuryReceipt {
  id: string;
  service: string;
  amount: number;
  status: 'liquidado' | 'falhou' | 'pendente';
  timestamp: string;
}

const STORAGE_KEY = 'divino_treasury';

function loadReceipts(): TreasuryReceipt[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return [
    { id: 'DIV-TX-9841', service: 'Google Gemini API (Tokens de Contexto)', amount: 1250, status: 'liquidado', timestamp: new Date(Date.now() - 86400000).toISOString() },
    { id: 'DIV-TX-9840', service: 'Hospedagem & CDN Cloudflare/AWS', amount: 850, status: 'liquidado', timestamp: new Date(Date.now() - 172800000).toISOString() },
    { id: 'DIV-TX-9839', service: 'Pinecone Vector DB (Memória Vetorial)', amount: 2100, status: 'liquidado', timestamp: new Date(Date.now() - 259200000).toISOString() },
  ];
}

function saveReceipts(receipts: TreasuryReceipt[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
  } catch {}
}

export class DivinoAutonomousTreasury {
  private treasuryBalanceMZN = 25000;
  private dailyExpenseLimitMZN = 5000;
  private spentTodayMZN = 0;
  private receipts: TreasuryReceipt[];

  constructor() {
    this.receipts = loadReceipts();
    this.resetDailyIfNeeded();
  }

  private resetDailyIfNeeded() {
    try {
      const lastReset = localStorage.getItem('divino_treasury_reset');
      const today = new Date().toDateString();
      if (lastReset !== today) {
        this.spentTodayMZN = 0;
        localStorage.setItem('divino_treasury_reset', today);
      } else {
        const saved = localStorage.getItem('divino_treasury_spent');
        if (saved) this.spentTodayMZN = Number(saved);
      }
    } catch {}
  }

  private persistSpent() {
    try {
      localStorage.setItem('divino_treasury_spent', String(this.spentTodayMZN));
    } catch {}
  }

  getBalance() {
    this.resetDailyIfNeeded();
    return {
      balance: this.treasuryBalanceMZN,
      balanceFormatted: `${this.treasuryBalanceMZN.toFixed(2)} MT`,
      spentToday: this.spentTodayMZN,
      spentTodayFormatted: `${this.spentTodayMZN.toFixed(2)} MT`,
      remainingLimit: this.dailyExpenseLimitMZN - this.spentTodayMZN,
      remainingLimitFormatted: `${(this.dailyExpenseLimitMZN - this.spentTodayMZN).toFixed(2)} MT`,
      dailyLimit: this.dailyExpenseLimitMZN,
    };
  }

  getReceipts(): TreasuryReceipt[] {
    return [...this.receipts].reverse();
  }

  async processAutomaticPayment(serviceName: string, amountMZN: number): Promise<TreasuryReceipt> {
    this.resetDailyIfNeeded();

    if (this.spentTodayMZN + amountMZN > this.dailyExpenseLimitMZN) {
      throw new Error(`Limite diário excedido. Tentativa: ${amountMZN} MT, Restante: ${(this.dailyExpenseLimitMZN - this.spentTodayMZN).toFixed(2)} MT`);
    }

    if (this.treasuryBalanceMZN < amountMZN) {
      throw new Error(`Saldo insuficiente. Necessário: ${amountMZN} MT, Disponível: ${this.treasuryBalanceMZN.toFixed(2)} MT`);
    }

    this.treasuryBalanceMZN -= amountMZN;
    this.spentTodayMZN += amountMZN;
    this.persistSpent();

    const receipt: TreasuryReceipt = {
      id: `DIV-TX-${Date.now()}`,
      service: serviceName,
      amount: amountMZN,
      status: 'liquidado',
      timestamp: new Date().toISOString(),
    };

    this.receipts.push(receipt);
    saveReceipts(this.receipts);

    return receipt;
  }

  topUp(amountMZN: number) {
    this.treasuryBalanceMZN += amountMZN;
    try {
      localStorage.setItem('divino_treasury_balance', String(this.treasuryBalanceMZN));
    } catch {}
  }
}

export const divinoTreasury = new DivinoAutonomousTreasury();
