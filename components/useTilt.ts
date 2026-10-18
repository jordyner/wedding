"use client";

import { useEffect, useRef } from "react";

/**
 * Pointer-driven tilt for paper objects. Writes --rx / --ry (degrees) and
 * --gx / --gy (pointer position in %) on the element; CSS does the rest.
 * Only for a fine pointer with hover and no reduced-motion preference.
 */
export function useTilt<T extends HTMLElement>(maxDeg: number, enabled = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const capable = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!capable.matches) return;

    let frame = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--ry", `${((x - 0.5) * 2 * maxDeg).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${((0.5 - y) * 2 * maxDeg).toFixed(2)}deg`);
        el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
        el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
        el.dataset.tilting = "";
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      delete el.dataset.tilting;
    };

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      leave();
    };
  }, [maxDeg, enabled]);

  return ref;
}
