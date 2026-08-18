// ============================================================================
// Connected Fast Engine — Lazy Loading (IntersectionObserver)
// Hook para só carregar/mostrar mídia quando está perto do viewport.
// ============================================================================
import { useEffect, useRef, useState, type RefObject } from 'react';

export function useInView<T extends Element = HTMLDivElement>(
  options: IntersectionObserverInit = { rootMargin: '300px', threshold: 0.01 }
): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      });
    }, options);
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, inView];
}
