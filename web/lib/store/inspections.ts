import { create } from "zustand";
import { hitlApi, inspectionsApi } from "@/lib/api";
import type { WSEvent } from "@/hooks/useWebSocket";

export interface Inspection {
  id: string;
  factory_id: string;
  device_id: string;
  image_key: string;
  image_url?: string;
  decision: "pass" | "fail" | "review" | "pending" | "error" | "out_of_scope";
  confidence?: number | null;
  defects?: Array<{ class_name: string; confidence: number; bbox: number[] }>;
  operator_decision?: string;
  inference_latency_ms?: number;
  celery_task_id?: string;
  created_at: string;
}

export interface InspectionStats {
  total: number;
  pass_count: number;
  fail_count: number;
  review_count: number;
  pending_count: number;
  pass_rate: number;
  avg_confidence?: number;
}

interface InspectionState {
  inspections: Inspection[];
  stats: InspectionStats | null;
  isLoading: boolean;
  pendingTaskIds: Set<string>;

  fetchInspections: (params?: { device_id?: string; decision?: string }) => Promise<void>;
  fetchStats: () => Promise<void>;
  handleWSEvent: (event: WSEvent) => void;
  reviewInspection: (id: string, decision: "pass" | "fail", notes?: string) => Promise<void>;
}

export const useInspectionStore = create<InspectionState>((set, get) => ({
  inspections: [],
  stats: null,
  isLoading: false,
  pendingTaskIds: new Set(),

  fetchInspections: async (params) => {
    set({ isLoading: true });
    try {
      const { data } = await inspectionsApi.list({ limit: 100, ...params });
      set({ inspections: data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchStats: async () => {
    const { data } = await inspectionsApi.stats();
    set({ stats: data });
  },

  handleWSEvent: (event: WSEvent) => {
    if (!event.inspection_id) return;

    if (event.type === "inspection.processing") {
      const exists = get().inspections.some((i) => i.id === event.inspection_id);
      if (!exists) void get().fetchInspections();

      set((s) => ({
        inspections: s.inspections.map((i) =>
          i.id === event.inspection_id
            ? { ...i, decision: "pending" as const }
            : i
        ),
      }));
    }

    if (event.type === "inspection.completed") {
      set((s) => {
        const updated = s.inspections.map((i) =>
          i.id === event.inspection_id
            ? {
                ...i,
                decision: event.decision!,
                confidence: event.confidence,
                defects: event.defects,
                inference_latency_ms: event.latency_ms,
              }
            : i
        );
        return { inspections: updated };
      });
      const exists = get().inspections.some((i) => i.id === event.inspection_id);
      if (!exists) void get().fetchInspections();
      // Refresh stats after completed
      get().fetchStats();
    }

    if (event.type === "inspection.error") {
      set((s) => ({
        inspections: s.inspections.map((i) =>
          i.id === event.inspection_id
            ? { ...i, decision: "error" as const }
            : i
        ),
      }));
    }
  },

  reviewInspection: async (id, decision, notes) => {
    await hitlApi.review(id, {
      decision,
      notes,
      corrected_label: decision === "pass" ? "good" : undefined,
      dataset_contribution: true,
    });
    set((s) => ({
      inspections: s.inspections.map((i) =>
        i.id === id ? { ...i, operator_decision: decision } : i
      ),
    }));
    get().fetchStats();
  },
}));
