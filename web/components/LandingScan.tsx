"use client";

import { useEffect } from "react";

export function LandingScan() {
  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scan = document.createElement("div");
    scan.setAttribute("aria-hidden", "true");
    Object.assign(scan.style, {
      position: "absolute",
      top: "18%",
      left: "56%",
      width: "2px",
      height: "58%",
      borderRadius: "999px",
      pointerEvents: "none",
      zIndex: "20",
      opacity: "0.12",
      background: "linear-gradient(to bottom, transparent, rgba(37,99,235,.2), rgba(37,99,235,.95), rgba(37,99,235,.2), transparent)",
      boxShadow: "0 0 20px rgba(37,99,235,.55), 0 0 44px rgba(37,99,235,.20)",
    });

    const animation = scan.animate(
      [
        { transform: "translateX(-70px)", opacity: 0.08 },
        { transform: "translateX(120px)", opacity: 0.78, offset: 0.5 },
        { transform: "translateX(320px)", opacity: 0.08 },
      ],
      {
        duration: 4600,
        iterations: Infinity,
        easing: "ease-in-out",
      },
    );

    hero.appendChild(scan);

    return () => {
      animation.cancel();
      scan.remove();
    };
  }, []);

  return null;
}
