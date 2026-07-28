import { useState, useEffect } from 'react';

const BACKGROUNDS = [
  { id: 'space1', type: '🌌 Universo', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1920' },
  { id: 'nature1', type: '🌿 Natureza', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1920' },
  { id: 'sky1', type: '☁️ Céus', url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1920' },
  { id: 'tech1', type: '⚡ Tecnologia', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1920' },
  { id: 'space2', type: '🌌 Nebulosa', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1920' },
  { id: 'nature2', type: '🌿 Oceano', url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=1920' },
  { id: 'sky2', type: '☁️ Por do Sol', url: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?q=80&w=1920' },
  { id: 'tech2', type: '⚡ Data Center', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1920' },
];

let globalBgIndex = 0;
const listeners = new Set<(index: number) => void>();

function notifyListeners() {
  listeners.forEach(fn => fn(globalBgIndex));
}

export function getCurrentBackground() {
  return BACKGROUNDS[globalBgIndex];
}

export function nextBackground() {
  globalBgIndex = (globalBgIndex + 1) % BACKGROUNDS.length;
  notifyListeners();
}

export function BackgroundSlider() {
  const [currentIndex, setCurrentIndex] = useState(globalBgIndex);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.src = BACKGROUNDS[currentIndex].url;
  }, [currentIndex]);

  useEffect(() => {
    const handler = (index: number) => {
      setCurrentIndex(index);
      setLoaded(false);
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      globalBgIndex = (globalBgIndex + 1) % BACKGROUNDS.length;
      setCurrentIndex(globalBgIndex);
      setLoaded(false);
      notifyListeners();
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 -z-10">
      {BACKGROUNDS.map((bg, index) => (
        <div
          key={bg.id}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url(${bg.url})` }}
        />
      ))}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-all duration-1000" />
    </div>
  );
}
