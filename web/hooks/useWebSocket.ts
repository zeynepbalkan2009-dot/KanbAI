"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { tokenStore } from "@/lib/api";

function getWebSocketBase() {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window === "undefined") return "ws://localhost:8000";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
}

export type WSEventType =
  | "connection.established"
  | "inspection.processing"
  | "inspection.completed"
  | "inspection.error";

export interface WSEvent {
  type: WSEventType;
  inspection_id?: string;
  task_id?: string;
  decision?: "pass" | "fail" | "review" | "out_of_scope";
  confidence?: number | null;
  defect_count?: number;
  defects?: Array<{
    class_name: string;
    confidence: number;
    bbox: number[];
  }>;
  latency_ms?: number;
  model_version?: string;
  error?: string;
  timestamp?: string;
}

interface UseWebSocketOptions {
  tenantId: string;
  onEvent?: (event: WSEvent) => void;
  enabled?: boolean;
}

interface WSState {
  connected: boolean;
  reconnectCount: number;
}

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]; // exponential backoff

export function useWebSocket({
  tenantId,
  onEvent,
  enabled = true,
}: UseWebSocketOptions): WSState {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCount = useRef(0);
  const isMounted = useRef(true);
  const onEventRef = useRef(onEvent);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (!enabled || !tenantId || !isMounted.current) return;

    const token = tokenStore.getAccess();
    if (!token) return;

    wsRef.current?.close(1000, "reconnecting");
    const url = `${getWebSocketBase()}/ws/${tenantId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      if (wsRef.current !== ws) return;
      reconnectCount.current = 0;
      setConnected(true);
      console.debug("[WS] connected", tenantId);
    };

    ws.onmessage = (e) => {
      if (!isMounted.current) return;
      if (wsRef.current !== ws) return;
      try {
        const event: WSEvent = JSON.parse(e.data);
        onEventRef.current?.(event);
      } catch {
        // non-JSON (pong) — ignore
      }
    };

    ws.onerror = (e) => {
      console.warn("[WS] error", e);
    };

    ws.onclose = (e) => {
      if (!isMounted.current) return;
      if (wsRef.current !== ws) return;
      setConnected(false);
      console.debug("[WS] disconnected", e.code, e.reason);

      // Don't reconnect on auth errors
      if (e.code === 4001 || e.code === 4003) return;

      // Exponential backoff reconnect
      const delay =
        RECONNECT_DELAYS[
          Math.min(reconnectCount.current, RECONNECT_DELAYS.length - 1)
        ];
      reconnectCount.current++;
      reconnectTimer.current = setTimeout(connect, delay);
    };
  }, [tenantId, enabled]);

  // Keepalive ping every 25s
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
      if (reconnectTimer.current !== null) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      wsRef.current?.close(1000, "component unmounted");
    };
  }, [connect]);

  return { connected, reconnectCount: reconnectCount.current };
}
