import { useEffect, useRef, useState, useCallback } from "react";
import { tokenStore } from "../services/api";
import { AppState, AppStateStatus } from "react-native";

const WS_BASE = process.env.EXPO_PUBLIC_WS_URL ?? "ws://192.168.1.100:8000";
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000];

export interface WSEvent {
  type: string;
  inspection_id?: string;
  decision?: string;
  confidence?: number;
  defect_count?: number;
  latency_ms?: number;
  error?: string;
  timestamp?: string;
}

interface Options {
  tenantId: string;
  onEvent?: (e: WSEvent) => void;
  enabled?: boolean;
}

export function useWebSocket({ tenantId, onEvent, enabled = true }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout>>();
  const retryCount = useRef(0);
  const isMounted = useRef(true);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(async () => {
    if (!enabled || !tenantId || !isMounted.current) return;
    const token = await tokenStore.getAccess();
    if (!token) return;

    const url = `${WS_BASE}/ws/${tenantId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      retryCount.current = 0;
      setConnected(true);
    };

    ws.onmessage = (e) => {
      if (!isMounted.current) return;
      try {
        const event: WSEvent = JSON.parse(e.data);
        onEvent?.(event);
      } catch {}
    };

    ws.onclose = (e) => {
      if (!isMounted.current) return;
      setConnected(false);
      if (e.code === 4001 || e.code === 4003) return;
      const delay = RECONNECT_DELAYS[Math.min(retryCount.current, RECONNECT_DELAYS.length - 1)];
      retryCount.current++;
      retryTimer.current = setTimeout(connect, delay);
    };
  }, [tenantId, enabled, onEvent]);

  // Reconnect on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active" && !connected) connect();
    });
    return () => sub.remove();
  }, [connected, connect]);

  // Keepalive
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 25_000);
    return () => clearInterval(interval);
  }, [connected]);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
      clearTimeout(retryTimer.current);
      wsRef.current?.close(1000);
    };
  }, [connect]);

  return { connected };
}
