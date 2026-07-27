import React from 'react';
import { Card, CardContent } from './ui/card';
import { UserLevelBadge } from './UserLevelBadge';
import { Award, Phone, MessageSquare } from 'lucide-react';

interface CreditDisplayProps {
  points: number;
  className?: string;
}

export function CreditDisplay({ points, className = '' }: CreditDisplayProps) {
  const callCost = 10;
  const smsCost = 2;
  const possibleCalls = Math.floor(points / callCost);
  const possibleSms = Math.floor(points / smsCost);

  return (
    <Card className={`glass-card border-white/30 shadow-md ${className}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <span className="font-bold text-slate-900 text-sm">Meus Créditos</span>
          </div>
          <UserLevelBadge points={points} size="sm" showProgress />
        </div>

        <div className="flex items-center justify-center py-2">
          <span className="text-4xl font-black text-slate-900">{points}</span>
          <span className="text-slate-500 font-bold ml-2">pts</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-white/60 rounded-xl p-2.5 border border-white/40">
            <Phone className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-xs text-slate-500 font-medium">Chamadas</p>
            <p className="text-lg font-bold text-slate-900">{possibleCalls}</p>
            <p className="text-[10px] text-slate-400">{callCost} pts/min</p>
          </div>
          <div className="bg-white/60 rounded-xl p-2.5 border border-white/40">
            <MessageSquare className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-xs text-slate-500 font-medium">SMS</p>
            <p className="text-lg font-bold text-slate-900">{possibleSms}</p>
            <p className="text-[10px] text-slate-400">{smsCost} pts/SMS</p>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 text-center font-medium">
          Publique conteúdos de valor para ganhar mais pontos!
        </p>
      </CardContent>
    </Card>
  );
}
