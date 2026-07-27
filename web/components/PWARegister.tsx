"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development" && location.hostname === "localhost") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}
