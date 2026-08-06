import React, { useEffect, useState } from 'react';
import { DayPhase, getDayPhase, applyPhaseToDocument } from '../lib/day-night';

const ALL_PHASES: DayPhase[] = ['night', 'dawn', 'day', 'dusk'];

export function DayNightAmbience() {
  const [phase, setPhase] = useState<DayPhase>(() => getDayPhase());

  useEffect(() => {
    const apply = () => {
      const p = getDayPhase();
      setPhase(p);
      applyPhaseToDocument(p);
    };
    apply();
    const timer = setInterval(apply, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div aria-hidden className="daynight fixed inset-0 -z-[5] pointer-events-none">
      {ALL_PHASES.map((p) => (
        <div key={p} className={`daynight-layer phase-${p} ${phase === p ? 'active' : ''}`} />
      ))}
      <div className="daynight-vignette" />
    </div>
  );
}

export default DayNightAmbience;