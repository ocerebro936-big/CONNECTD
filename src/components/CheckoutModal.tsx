import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { X, CheckCircle2, Award, ExternalLink, Loader2, Clock, Settings2, Copy } from 'lucide-react';
import { PAYMENT_OPTIONS, POINTS_PACKAGES, PaymentMethod, getStripeLinkForPackage, buildStripeUrl, generateBankReference, BANK_IBAN, BANK_NAME, MERCHANT_WALLET, setStripeLinks, isValidStripeLink } from '../lib/payment-utils';
import { formatCurrency } from '../lib/currency-utils';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { recordTransaction } from '../lib/finance-utils';

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

interface CheckoutModalProps {
  user: any;
  onClose: () => void;
  onSuccess: (points: number) => void;
}

type Step = 'packages' | 'payment' | 'processing' | 'waiting' | 'admin';

export function CheckoutModal({ user, onClose, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<Step>('packages');
  const [selectedPackage, setSelectedPackage] = useState<typeof POINTS_PACKAGES[0] | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [reference, setReference] = useState('');
  const [providerNote, setProviderNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [adminLinks, setAdminLinks] = useState('');
  const isAdmin = user && (user.email === 'ocerebro936@gmail.com' || user.role === 'admin');

  const handleSelectPackage = (pkg: typeof POINTS_PACKAGES[0]) => {
    setSelectedPackage(pkg);
    setStep('payment');
  };

  const createPendingPurchase = async (provider: string, ref: string, note: string): Promise<string | null> => {
    if (!user || !selectedPackage) return null;
    try {
const purchaseRef = await addDoc(collection(db, 'purchases'), {
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || '',
        itemId: selectedPackage.id,
        title: `${selectedPackage.points} Pontos`,
        price: selectedPackage.price,
        points: selectedPackage.points,
        provider,
        reference: ref,
        status: 'pending',
        note,
        createdAt: Date.now(),
      });
      recordTransaction({
        userId: user.uid,
        type: 'purchase_created',
        description: `Compra de ${selectedPackage.points} pontos via ${provider} (${ref})`,
        amount: selectedPackage.price,
        currency: 'MZN',
        refId: purchaseRef.id,
        actorId: user.uid,
      }).catch(() => {});
      return purchaseRef.id;
    } catch (e) {
      console.error('Error creating purchase:', e);
      return null;
    }
  };

  const handlePay = async () => {
    if (!selectedMethod || !selectedPackage) return;
    setProcessing(true);

    if (selectedMethod === 'stripe' || selectedMethod === 'googlepay' || selectedMethod === 'paypal') {
      const link = getStripeLinkForPackage(selectedPackage.id);
      if (link && isValidStripeLink(link)) {
        const purchaseId = await createPendingPurchase('stripe', `STRIPE-${Date.now()}`, selectedMethod);
        setReference(purchaseId || '');
        setProviderNote(`Abre a página segura da Stripe para concluir o pagamento. Após a confirmação, os ${selectedPackage.points} pontos são creditados automaticamente.`);
        setStep('waiting');
        setProcessing(false);
        window.open(buildStripeUrl(link, user?.email, purchaseId || undefined), '_blank', 'noopener');
      } else {
        setProviderNote('Pagamento instantâneo por cartão não configurado. Usa a Transferência Bancária abaixo — o processo é igualmente seguro.');
        setSelectedMethod('bank');
        setProcessing(false);
        const ref = generateBankReference();
        setReference(ref);
        await createPendingPurchase('bank', ref, 'Redirecionado de ' + selectedMethod);
        setStep('waiting');
      }
      return;
    }

    if (selectedMethod === 'bank') {
      const ref = generateBankReference();
      setReference(ref);
      await createPendingPurchase('bank', ref, 'Transferência bancária');
      setStep('waiting');
      setProcessing(false);
      return;
    }

    if (selectedMethod === 'metamask') {
      if (typeof window.ethereum !== 'undefined') {
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
        } catch {
          alert('MetaMask não acedeu à conta.');
          setProcessing(false);
          return;
        }
      }
      const ref = `WEB3-${Date.now().toString(16)}`;
      setReference(ref);
      await createPendingPurchase('metamask', ref, MERCHANT_WALLET);
      setProviderNote(`Transfere o valor em ETH/tokens para a carteira oficial: ${MERCHANT_WALLET}. Usa a referência ${ref} na descrição.`);
      setStep('waiting');
      setProcessing(false);
      return;
    }

    setProcessing(false);
  };

  const saveAdminLinks = () => {
    try {
      const parsed = JSON.parse(adminLinks);
      setStripeLinks(parsed);
      alert('Links Stripe guardados com sucesso!');
      setStep('packages');
    } catch {
      alert('JSON inválido. Formato: {"starter": "https://buy.stripe.com/...", "basic": "...", ...}');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-lg bg-slate-900 border-white/20 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between p-4 bg-slate-800/50">
          <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            {step === 'waiting' ? 'Pagamento Iniciado' : step === 'admin' ? 'Configuração Stripe' : 'Carregar Pontos'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isAdmin && step === 'packages' && (
              <button onClick={() => setStep('admin')} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10" title="Configurar Stripe">
                <Settings2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {step === 'admin' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 font-medium">
                Cola os teus Payment Links da Stripe (Dashboard Stripe → Payment Links). Formato JSON:
              </p>
              <pre className="text-[10px] text-slate-300 font-mono bg-slate-800 rounded-xl p-3 overflow-x-auto">
                {'{"starter":"https://buy.stripe.com/...","basic":"...","pro":"...","premium":"..."}'}
              </pre>
              <textarea
                rows={4}
                value={adminLinks}
                onChange={(e) => setAdminLinks(e.target.value)}
                placeholder='{"starter":"https://buy.stripe.com/..."}'
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white font-mono px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <Button className="w-full rounded-xl font-bold" onClick={saveAdminLinks}>Guardar Links</Button>
            </div>
          ) : step === 'waiting' ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 mx-auto flex items-center justify-center">
                <Clock className="h-8 w-8 text-amber-400" />
              </div>
              <div>
                <p className="text-white text-lg font-bold">Pagamento {selectedPackage?.points} pts</p>
                <p className="text-slate-400 text-sm mt-1">{providerNote}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Referência</p>
                    <p className="text-white font-mono text-sm font-bold">{reference}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(reference); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                {(selectedMethod === 'bank' || !selectedMethod) && (
                  <>
                    <div className="text-left border-t border-slate-700 pt-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Dados bancários</p>
                      <p className="text-white text-sm font-semibold">{BANK_NAME}</p>
                      <p className="text-white font-mono text-sm">{BANK_IBAN}</p>
                    </div>
                    <div className="text-left border-t border-slate-700 pt-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">MetaMask / Web3</p>
                      <p className="text-white font-mono text-[11px] break-all">{MERCHANT_WALLET}</p>
                    </div>
                  </>
                )}
                <p className="text-xs text-emerald-400 font-semibold text-left pt-2">
                  Após a confirmação do pagamento, os {selectedPackage?.points} pontos serão creditados automaticamente na tua conta.
                </p>
              </div>
              <Button onClick={onClose} variant="outline" className="rounded-xl font-bold text-slate-300 border-slate-600">
                Fechar
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
              <p className="text-[10px] text-slate-500 font-medium text-center pt-1">
                Pagamentos processados pela Stripe · Encriptação TLS · Conformidade PCI-DSS
              </p>
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
                    onClick={() => setSelectedMethod(method.id)}
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
              {selectedMethod === 'stripe' && !getStripeLinkForPackage(selectedPackage?.id || '') && (
                <p className="text-xs text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                  Cartão instantâneo em configuração — serás redirecionado para transferência bancária (igual validade).
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => setStep('packages')} className="text-slate-400">
                  Voltar
                </Button>
                <Button
                  onClick={handlePay}
                  disabled={!selectedMethod || processing}
                  className="flex-1 rounded-xl font-bold"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `Pagar ${formatCurrency(selectedPackage?.price ?? 0, 'MZN')}`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
