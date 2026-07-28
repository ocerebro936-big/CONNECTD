import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { BookOpen, Globe, Brain, Shield, Sparkles } from 'lucide-react';

interface KnowledgeEntry {
  id: string;
  title: string;
  type: 'PDF' | 'Web' | 'Manual';
  status: 'assimilado' | 'indexado' | 'processando';
  date: string;
  source: string;
}

const STORAGE_KEY = 'divino_memory_bank';

function loadMemory(): KnowledgeEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return [
    { id: '1', title: 'Manual do Ecossistema Connected v2.0', type: 'PDF', status: 'assimilado', date: new Date().toISOString().split('T')[0], source: 'manual-interno' },
    { id: '2', title: 'Tendências globais de Web3 & Metical', type: 'Web', status: 'indexado', date: new Date().toISOString().split('T')[0], source: 'pesquisa-autónoma' },
    { id: '3', title: 'Guia de Pagamentos MZN — Bluewhite Corp', type: 'Manual', status: 'assimilado', date: new Date().toISOString().split('T')[0], source: 'manual-interno' },
  ];
}

function saveMemory(entries: KnowledgeEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function DivinoAutonomousPanel() {
  const [learningLog, setLearningLog] = useState<KnowledgeEntry[]>([]);
  const [pdfInput, setPdfInput] = useState('');
  const [webQuery, setWebQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setLearningLog(loadMemory());
  }, []);

  const addEntry = async (title: string, type: KnowledgeEntry['type'], source: string) => {
    const newEntry: KnowledgeEntry = {
      id: Date.now().toString(),
      title,
      type,
      status: 'processando',
      date: new Date().toISOString().split('T')[0],
      source,
    };
    const updated = [newEntry, ...learningLog];
    setLearningLog(updated);
    saveMemory(updated);
    setIsProcessing(true);

    setTimeout(() => {
      const finalised = updated.map(e =>
        e.id === newEntry.id ? { ...e, status: type === 'Web' ? 'indexado' as const : 'assimilado' as const } : e
      );
      setLearningLog(finalised);
      saveMemory(finalised);
      setIsProcessing(false);
    }, 2000);
  };

  const handleAddPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfInput.trim() || isProcessing) return;
    const title = pdfInput.trim().split('/').pop()?.split('?')[0] || pdfInput.trim();
    await addEntry(title, 'PDF', pdfInput.trim());
    setPdfInput('');
  };

  const handleWebSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webQuery.trim() || isProcessing) return;
    await addEntry(`Pesquisa: ${webQuery.trim().slice(0, 60)}`, 'Web', webQuery.trim());
    setWebQuery('');
  };

  const statusConfig = {
    assimilado: { label: 'Assimilado', class: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    indexado: { label: 'Indexado', class: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
    processando: { label: 'A processar...', class: 'bg-amber-100 text-amber-700 border-amber-300 animate-pulse' },
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-indigo-900/5 to-purple-900/5 border-purple-300/30 shadow-lg overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-300 flex items-center justify-center text-2xl shadow-md">
                👑
              </div>
              <div>
                <CardTitle className="text-slate-900 text-xl font-bold flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  Núcleo Autônomo
                </CardTitle>
                <CardDescription className="text-purple-600 font-medium text-xs">
                  Bluewhite Corporation • Motor de Aprendizado Ativo
                </CardDescription>
              </div>
            </div>
            <span className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
              <Shield className="h-3 w-3" /> 100% Seguro
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleAddPdf} className="flex gap-2">
            <input
              type="text"
              value={pdfInput}
              onChange={(e) => setPdfInput(e.target.value)}
              placeholder="📄 Link de PDF para o DIVINO IA aprender..."
              className="flex-1 bg-white/60 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              disabled={isProcessing}
            />
            <Button type="submit" disabled={!pdfInput.trim() || isProcessing} className="rounded-xl text-xs font-bold gap-2 bg-purple-600 hover:bg-purple-500 shadow-sm">
              <BookOpen className="h-4 w-4" /> Alimentar
            </Button>
          </form>

          <form onSubmit={handleWebSearch} className="flex gap-2">
            <input
              type="text"
              value={webQuery}
              onChange={(e) => setWebQuery(e.target.value)}
              placeholder="🌐 Pesquisar na Web para o DIVINO IA aprender..."
              className="flex-1 bg-white/60 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              disabled={isProcessing}
            />
            <Button type="submit" disabled={!webQuery.trim() || isProcessing} className="rounded-xl text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-sm">
              <Globe className="h-4 w-4" /> Pesquisar
            </Button>
          </form>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Base de Conhecimento em Expansão ({learningLog.length} itens)
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {learningLog.map((item) => {
                const status = statusConfig[item.status];
                return (
                  <div key={item.id} className="p-3 bg-white/60 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs hover:bg-white/80 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-base shrink-0">{item.type === 'PDF' ? '📄' : item.type === 'Web' ? '🌐' : '📘'}</span>
                      <span className="font-semibold text-slate-800 truncate">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-slate-400 text-[10px] font-medium">{item.date}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${status.class}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
