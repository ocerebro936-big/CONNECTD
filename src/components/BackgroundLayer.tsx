import { useEffect, useState } from "react";
import {
  backgroundEngine,
  backgroundPreloader,
  backgroundRotation,
} from "../lib/background";

// Camada de fundo dinâmico. Usa fundos REAIS da Connected (collection
// `backgrounds`). Sem fundos configurados => gradiente de marca (não inventa
// imagens da Internet).
export default function BackgroundLayer() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    backgroundEngine
      .load()
      .then(() => {
        if (!active) return;
        setUrl(backgroundEngine.current());
        backgroundPreloader.preload(
          backgroundEngine.list().map((a) => a.url),
        );
        backgroundRotation.start();
      })
      .catch(() => setUrl(null));

    const unsub = backgroundEngine.subscribe((u) => setUrl(u));

    return () => {
      active = false;
      unsub();
      backgroundRotation.stop();
    };
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      {url ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${url})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-amber-950" />
      )}
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}
