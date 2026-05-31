'use client';

import { useRef, useCallback, type RefObject } from 'react';

/**
 * Tracks mouse position inside a container element and sets CSS custom
 * properties `--glow-x` and `--glow-y` that the `.glow-hover` CSS class
 * uses to render a radial-gradient glow that follows the cursor.
 *
 * Usage:
 *   const { ref, onMouseMove, onMouseLeave } = useGlowEffect<HTMLDivElement>();
 *   <div ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} className="glow-hover ...">
 */
export function useGlowEffect<T extends HTMLElement>() {
  const ref = useRef<T>(null) as RefObject<T>;

  const onMouseMove = useCallback((e: React.MouseEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--glow-x', `${x}px`);
    el.style.setProperty('--glow-y', `${y}px`);
  }, []);

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--glow-x', '-9999px');
    el.style.setProperty('--glow-y', '-9999px');
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}
