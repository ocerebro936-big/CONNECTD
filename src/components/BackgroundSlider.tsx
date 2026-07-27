import { useState, useEffect } from 'react';

const IMAGES = [
  'https://images.unsplash.com/photo-1534088568595-a066f410cbda?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509803874385-db7c23652552?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1499346030926-9a72daac6c63?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1505322022379-7c3353ee6291?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1431440869543-efaf3388c585?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=2560&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=2560&auto=format&fit=crop'
];

export function BackgroundSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % IMAGES.length);
    }, 15000); // Change image every 15 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 bg-slate-900">
      {IMAGES.map((src, index) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-3000 ease-in-out animate-clouds ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${src})`,
          }}
        />
      ))}
    </div>
  );
}
