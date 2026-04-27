// Fly-to-cart dot animation — port of prototype/app.jsx:FlyDot.
'use client';

import { useEffect, useRef } from 'react';

import { useCart } from './CartProvider';

export function FlyDot() {
  const { flyDot } = useCart();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!flyDot) return;
    const el = ref.current;
    if (!el) return;
    el.style.transform = `translate(${flyDot.startX}px, ${flyDot.startY}px) scale(1)`;
    el.style.opacity = '1';
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transform = `translate(${flyDot.endX}px, ${flyDot.endY}px) scale(0.4)`;
        el.style.opacity = '0';
      }),
    );
  }, [flyDot]);

  if (!flyDot) return null;

  return (
    <div
      key={flyDot.id}
      ref={ref}
      className="fly-dot"
      style={{
        top: 0,
        left: 0,
        transform: `translate(${flyDot.startX}px, ${flyDot.startY}px)`,
      }}
    />
  );
}
