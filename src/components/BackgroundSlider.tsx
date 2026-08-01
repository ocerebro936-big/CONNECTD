import { useState, useEffect } from 'react';

export interface BackgroundTheme {
  id: string;
  category: string;
  label: string;
  url: string;
}

export const BACKGROUND_CATEGORIES = [
  '🌌 Universo',
  '☁️ Céu',
  '🌿 Natureza',
  '🌊 Água',
  '🌃 Cidades',
  '💻 Tecnologia',
  '🌍 Terra',
  '🎨 Arte Digital',
  '🎄 Sazonal',
] as const;

export const BACKGROUNDS: BackgroundTheme[] = [
  // 🌌 Universo
  { id: 'space1', category: '🌌 Universo', label: 'Galáxia', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1920' },
  { id: 'space2', category: '🌌 Universo', label: 'Nebulosa', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1920' },
  { id: 'space3', category: '🌌 Universo', label: 'Estrelas', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=1920' },
  { id: 'space4', category: '🌌 Universo', label: 'Via Láctea', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1920' },
  // ☁️ Céu
  { id: 'sky1', category: '☁️ Céu', label: 'Nuvens', url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1920' },
  { id: 'sky2', category: '☁️ Céu', label: 'Pôr do Sol', url: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?q=80&w=1920' },
  { id: 'sky3', category: '☁️ Céu', label: 'Nascer do Sol', url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?q=80&w=1920' },
  { id: 'sky4', category: '☁️ Céu', label: 'Aurora', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1920' },
  // 🌿 Natureza
  { id: 'nature1', category: '🌿 Natureza', label: 'Floresta', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1920' },
  { id: 'nature2', category: '🌿 Natureza', label: 'Oceano', url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=1920' },
  { id: 'nature3', category: '🌿 Natureza', label: 'Montanhas', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1920' },
  { id: 'nature4', category: '🌿 Natureza', label: 'Deserto', url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?q=80&w=1920' },
  // 🌊 Água
  { id: 'water1', category: '🌊 Água', label: 'Cachoeira', url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=1920' },
  { id: 'water2', category: '🌊 Água', label: 'Lago', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1920' },
  { id: 'water3', category: '🌊 Água', label: 'Praia', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1920' },
  { id: 'water4', category: '🌊 Água', label: 'Mar Profundo', url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1920' },
  // 🌃 Cidades
  { id: 'city1', category: '🌃 Cidades', label: 'Cidade à Noite', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1920' },
  { id: 'city2', category: '🌃 Cidades', label: 'Tóquio', url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1920' },
  { id: 'city3', category: '🌃 Cidades', label: 'Nova Iorque', url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1920' },
  { id: 'city4', category: '🌃 Cidades', label: 'Dubai', url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1920' },
  // 💻 Tecnologia
  { id: 'tech1', category: '💻 Tecnologia', label: 'Circuito', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1920' },
  { id: 'tech2', category: '💻 Tecnologia', label: 'Data Center', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1920' },
  { id: 'tech3', category: '💻 Tecnologia', label: 'Código', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1920' },
  { id: 'tech4', category: '💻 Tecnologia', label: 'IA', url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1920' },
  // 🌍 Terra
  { id: 'earth1', category: '🌍 Terra', label: 'Terra do Espaço', url: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?q=80&w=1920' },
  { id: 'earth2', category: '🌍 Terra', label: 'Órbita', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920' },
  // 🎨 Arte Digital
  { id: 'art1', category: '🎨 Arte Digital', label: 'Abstracto', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1920' },
  { id: 'art2', category: '🎨 Arte Digital', label: 'Vibrante', url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=1920' },
  { id: 'art3', category: '🎨 Arte Digital', label: 'Geométrico', url: 'https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?q=80&w=1920' },
  // 🎄 Sazonal
  { id: 'season1', category: '🎄 Sazonal', label: 'Natal', url: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?q=80&w=1920' },
  { id: 'season2', category: '🎄 Sazonal', label: 'Outono', url: 'https://images.unsplash.com/photo-1504392022767-a8fc0771f239?q=80&w=1920' },
];

const STORAGE_KEY = 'connected_bg_prefs';

interface BgPrefs {
  category: string | null;
  favoriteId: string | null;
  autoRotate: boolean;
  interval: number;
}

const defaultPrefs: BgPrefs = { category: null, favoriteId: null, autoRotate: true, interval: 45000 };

function loadPrefs(): BgPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultPrefs };
}

function savePrefs(prefs: BgPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

function getVisibleBackgrounds(prefs: BgPrefs) {
  let list = prefs.category ? BACKGROUNDS.filter(b => b.category === prefs.category) : BACKGROUNDS;
  if (prefs.favoriteId) {
    const fav = BACKGROUNDS.find(b => b.id === prefs.favoriteId);
    if (fav) list = [fav, ...list.filter(b => b.id !== fav.id)];
  }
  return list;
}

let prefs = loadPrefs();
let globalBgIndex = 0;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export function getCurrentBackground() {
  const visible = getVisibleBackgrounds(prefs);
  return visible[globalBgIndex % visible.length];
}

export function getBackgroundPrefs() {
  return { ...prefs };
}

export function setBackgroundPrefs(partial: Partial<BgPrefs>) {
  prefs = { ...prefs, ...partial };
  savePrefs(prefs);
  globalBgIndex = 0;
  notifyListeners();
}

export function nextBackground() {
  globalBgIndex++;
  notifyListeners();
}

export function BackgroundSlider() {
  const [current, setCurrent] = useState(getCurrentBackground());
  const [loaded, setLoaded] = useState(false);
  const [myPrefs, setMyPrefs] = useState(getBackgroundPrefs());

  useEffect(() => {
    const handler = () => {
      const bg = getCurrentBackground();
      setCurrent(prev => (prev.id === bg.id ? bg : bg));
      setLoaded(false);
      setMyPrefs(getBackgroundPrefs());
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.src = current.url;
  }, [current]);

  useEffect(() => {
    if (!myPrefs.autoRotate) return;
    const interval = setInterval(() => {
      globalBgIndex++;
      notifyListeners();
    }, myPrefs.interval);
    return () => clearInterval(interval);
  }, [myPrefs.autoRotate, myPrefs.interval]);

  return (
    <div className="fixed inset-0 -z-10">
      {BACKGROUNDS.map(bg => (
        <div
          key={bg.id}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
            bg.id === current.id ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url(${bg.url})` }}
        />
      ))}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-all duration-1000" />
    </div>
  );
}

export const __refreshBackgrounds = notifyListeners;
