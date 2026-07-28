import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { X, CheckCircle2, Award, ExternalLink } from 'lucide-react';
import { PAYMENT_OPTIONS, POINTS_PACKAGES, processPayment, PaymentMethod } from '../lib/payment-utils';
import { formatCurrency } from '../lib/currency-utils';

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

interface CheckoutModalProps {
  onClose: () => void;
  onSuccess: (points: number) => void;
}

export function CheckoutModal({ onClose, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<'packages' | 'payment'>('packages');
  const [selectedPackage, setSelectedPackage] = useState<typeof POINTS_PACKAGES[0] | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txId, setTxId] = useState('');

  const handleSelectPackage = (pkg: typeof POINTS_PACKAGES[0]) => {
    setSelectedPackage(pkg);
    setStep('payment');
  };

  const handlePay = async () => {
    if (!selectedMethod || !selectedPackage) return;
    setProcessing(true);
    const result = await processPayment(selectedMethod, selectedPackage.price);
    if (result.success) {
      setTxId(result.txId || '');
      setSuccess(true);
      onSuccess(selectedPackage.points);
    }
    setProcessing(false);
  };

  const handleMetaMask = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        setSelectedMethod('metamask');
      } catch {
        alert('MetaMask não disponível. Instala a extensão ou usa outro método.');
      }
    } else {
      alert('MetaMask não detetado. Abre https://metamask.io para instalar.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <Card className="w-full max-w-lg bg-slate-900 border-white/20 shadow-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-4 bg-slate-800/50">
          <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            {success ? 'Compra Confirmada!' : 'Carregar Pontos'}
          </CardTitle>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="p-6">
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-white text-xl font-bold">{selectedPackage?.points} pts</p>
                <p className="text-slate-400 text-sm">foram adicionados à tua conta!</p>
              </div>
              {txId && (
                <p className="text-xs text-slate-500 font-mono bg-slate-800 rounded-lg px-3 py-2 inline-block">
                  TX: {txId}
                </p>
              )}
              <Button onClick={onClose} className="rounded-xl font-bold px-8">
                Concluído
              </Button>
            </div>
          ) : step === 'packages' ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-400 font-medium mb-4">Escolhe um pacote de pontos para continuar:</p>
              {POINTS_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleSelectPackage(pkg)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    pkg.popular
                      ? 'bg-indigo-600/20 border-indigo-500/50 hover:border-indigo-400'
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Award className={`h-6 w-6 ${pkg.popular ? 'text-amber-400' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <p className="text-white font-bold">{pkg.points} Pontos</p>
                      {pkg.popular && (
                        <span className="text-[10px] font-bold text-amber-400">⚡ MAIS POPULAR</span>
                      )}
                    </div>
                  </div>
                  <span className="text-white font-black text-lg">{formatCurrency(pkg.price, 'MZN')}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 font-medium">
                Pagar <span className="text-white font-bold">{selectedPackage?.points} pts</span> por <span className="text-white font-bold">{formatCurrency(selectedPackage?.price ?? 0, 'MZN')}</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_OPTIONS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => {
                      if (method.id === 'metamask') {
                        handleMetaMask();
                      } else {
                        setSelectedMethod(method.id);
                      }
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedMethod === method.id
                        ? 'bg-indigo-600/20 border-indigo-500/50'
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{method.icon}</span>
                    <p className="text-white font-bold text-sm">{method.name}</p>
                    <p className="text-slate-500 text-[10px]">{method.description}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => setStep('packages')} className="text-slate-400">
                  Voltar
                </Button>
                <Button
                  onClick={handlePay}
                  disabled={!selectedMethod || processing}
                  className="flex-1 rounded-xl font-bold"
                >
                  {processing ? 'A processar...' : `Pagar ${formatCurrency(selectedPackage?.price ?? 0, 'MZN')}`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
