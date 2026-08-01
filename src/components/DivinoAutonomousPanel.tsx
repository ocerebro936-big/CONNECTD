import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { BookOpen, Globe, Brain, Shield, Sparkles, Database, Library } from 'lucide-react';
import { KNOWLEDGE_BASE, getMemoryByLayer, clearMemoryLayer, MemoryLayer } from '../lib/divino-core';

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
    { id: '2', title: 'Guia de Pagamentos MZN — Bluewhite Corp', type: 'Manual', status: 'assimilado', date: new Date().toISOString().split('T')[0], source: 'manual-interno' },
    { id: '3', title: 'Política de Moderação & Código de Conduta', type: 'Manual', status: 'assimilado', date: new Date().toISOString().split('T')[0], source: 'jurídico' },
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
  const [kbCategory, setKbCategory] = useState('📚 Interna');

  useEffect(() => {
    setLearningLog(loadMemory());
  }, []);

  const kbCategories = [...new Set(KNOWLEDGE_BASE.map(k => k.category))];
  const userMemory = getMemoryByLayer('user');
  const platformMemory = getMemoryByLayer('platform');

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
      <Card className="bg-gradient-to-br from-blue-900/5 to-cyan-900/5 border-cyan-300/30 shadow-lg overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-500" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-100 border border-cyan-300 flex items-center justify-center text-2xl shadow-md">
                👑
              </div>
              <div>
                <CardTitle className="text-slate-900 text-xl font-bold flex items-center gap-2">
                  <Brain className="h-5 w-5 text-cyan-500" />
                  Núcleo Autônomo
                </CardTitle>
                <CardDescription className="text-cyan-600 font-medium text-xs">
                  Bluewhite Corporation Lda. • Motor de Aprendizado Ativo
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
              className="flex-1 bg-white/60 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              disabled={isProcessing}
            />
            <Button type="submit" disabled={!pdfInput.trim() || isProcessing} className="rounded-xl text-xs font-bold gap-2 bg-cyan-600 hover:bg-cyan-500 shadow-sm">
              <BookOpen className="h-4 w-4" /> Alimentar
            </Button>
          </form>

          <form onSubmit={handleWebSearch} className="flex gap-2">
            <input
              type="text"
              value={webQuery}
              onChange={(e) => setWebQuery(e.target.value)}
              placeholder="🌐 Pesquisar na Web para o DIVINO IA aprender..."
              className="flex-1 bg-white/60 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              disabled={isProcessing}
            />
            <Button type="submit" disabled={!webQuery.trim() || isProcessing} className="rounded-xl text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-sm">
              <Globe className="h-4 w-4" /> Pesquisar
            </Button>
          </form>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-500" />
              Memória de Longo Prazo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white/60 border border-slate-200/60 rounded-xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">🧑 Utilizador</p>
                <p className="text-lg font-black text-slate-800">{userMemory.length}</p>
                <p className="text-[10px] text-slate-400">preferências e histórico</p>
              </div>
              <div className="p-3 bg-white/60 border border-slate-200/60 rounded-xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">🌐 Plataforma</p>
                <p className="text-lg font-black text-slate-800">{platformMemory.length}</p>
                <p className="text-[10px] text-slate-400">estado e métricas</p>
              </div>
              <div className="p-3 bg-white/60 border border-slate-200/60 rounded-xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">📚 Conhecimento</p>
                <p className="text-lg font-black text-slate-800">{KNOWLEDGE_BASE.length + learningLog.length}</p>
                <p className="text-[10px] text-slate-400">itens na base de conhecimento</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Library className="h-4 w-4 text-cyan-500" />
              Base de Conhecimento por Categoria
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {kbCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setKbCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    kbCategory === cat
                      ? 'bg-cyan-600 text-white border-cyan-600'
                      : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {KNOWLEDGE_BASE.filter(k => k.category === kbCategory).map((item, i) => (
                <div key={i} className="p-3 bg-white/60 border border-slate-200/60 rounded-xl">
                  <p className="text-xs font-bold text-slate-800">{item.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-500" />
              Documentos Aprendidos ({learningLog.length} itens)
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
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
