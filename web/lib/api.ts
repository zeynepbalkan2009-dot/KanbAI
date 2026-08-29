import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");

// ── Token storage ─────────────────────────────────────────────────────────────
const TOKEN_KEY = "qc_access_token";
const REFRESH_KEY = "qc_refresh_token";

export const tokenStore = {
  getAccess: (): string | null =>
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null,
  getRefresh: (): string | null =>
    typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null,
  set: (access: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// ── Axios instance ────────────────────────────────────────────────────────────
export const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — attach Bearer token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };
    const requestUrl = originalRequest?.url ?? "";
    const handlesOwnUnauthorizedError =
      requestUrl.endsWith("/auth/login") ||
      requestUrl.endsWith("/devices/activate");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !handlesOwnUnauthorizedError
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            (originalRequest.headers as Record<string, string>)[
              "Authorization"
            ] = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) {
        tokenStore.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        });
        tokenStore.set(data.access_token, data.refresh_token);
        processQueue(null, data.access_token);
        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>)[
            "Authorization"
          ] = `Bearer ${data.access_token}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStore.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ── Typed API helpers ─────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; refresh_token: string }>(
      "/auth/login",
      { email, password }
    ),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

export const inspectionsApi = {
  list: (params?: {
    device_id?: string;
    decision?: string;
    limit?: number;
    offset?: number;
  }) => api.get("/inspections", { params }),
  get: (id: string) => api.get(`/inspections/${id}`),
  image: (id: string) => api.get(`/inspections/${id}/image`, { responseType: "blob" }),
  stats: () => api.get("/inspections/stats"),
  upload: (deviceId: string, file: File, metadata?: {
    serial_number?: string;
    lot_number?: string;
    captured_at?: string;
    station_id?: string;
    product_id?: string;
    production_line_id?: string;
    shift_id?: string;
  }) => {
    const form = new FormData();
    form.append("device_id", deviceId);
    form.append("file", file);
    Object.entries(metadata ?? {}).forEach(([key, value]) => {
      if (value) form.append(key, value);
    });
    return api.post("/inspections", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export const devicesApi = {
  list: () => api.get("/devices"),
  register: (data: { device_uuid: string; name: string; location_label?: string; station_id?: string }) =>
    api.post("/devices", data),
  createActivationToken: (data: { station_id?: string; label?: string; expires_in_hours?: number }) =>
    api.post("/devices/activation-token", data),
  activate: (data: {
    activation_token: string;
    device_uuid: string;
    name: string;
    firmware_version?: string;
    location_label?: string;
  }) => api.post("/devices/activate", data),
  heartbeat: (id: string) => api.patch(`/devices/${id}/heartbeat`, {}),
  revoke: (id: string) => api.post(`/devices/${id}/revoke`),
};

export const setupApi = {
  stations: (params?: { active_only?: boolean }) => api.get("/stations", { params }),
  productionLines: (params?: { active_only?: boolean }) => api.get("/production-lines", { params }),
  products: (params?: { active_only?: boolean }) => api.get("/products", { params }),
  updateInspectionProfile: (productId: string, data: {
    industry_domain: "steel_equipment" | "battery_assembly";
    operation_stage: string;
    inspection_mode: "visual_defect" | "assembly_presence" | "dimensional_assist" | "data_collection";
    capture_mode: "conveyor" | "fixed_station" | "handheld";
    capture_strategy: "manual" | "stability_gated" | "external_trigger" | "continuous";
    native_camera_required: boolean;
    alignment_overlay_required: boolean;
    defect_classes: string[];
    human_review_required: boolean;
    quality_decision_enabled: boolean;
  }) => api.patch(`/products/${productId}/inspection-profile`, data),
};

export const hitlApi = {
  queue: () => api.get("/hitl/queue"),
  stats: () => api.get("/hitl/stats"),
  datasetSummary: () => api.get("/hitl/dataset-summary"),
  review: (id: string, data: {
    decision: "pass" | "fail" | "out_of_scope" | "wrong_prediction" | "needs_retrain";
    corrected_label?: string;
    notes?: string;
    dataset_contribution?: boolean;
  }) => api.post(`/hitl/${id}/review`, data),
};

export const batteryApi = {
  workflow: () => api.get("/battery/workflow"),
  units: (params?: { status?: string; limit?: number }) => api.get("/battery/units", { params }),
  getUnit: (id: string) => api.get(`/battery/units/${id}`),
  createUnit: (data: {
    product_id: string;
    production_line_id?: string;
    serial_number: string;
    barcode?: string;
    cell_type: "prismatic" | "cylindrical" | "pouch";
    expected_cell_count: number;
    metadata?: Record<string, unknown>;
  }) => api.post("/battery/units", data),
  addEvidence: (unitId: string, stepId: number, data: {
    station_id?: string;
    inspection_id?: string;
    observed_label?: string;
    notes?: string;
    test_results?: Record<string, unknown>;
  }) => api.post(`/battery/units/${unitId}/steps/${stepId}/evidence`, data),
  reviewEvidence: (evidenceId: string, data: {
    decision: "pass" | "fail";
    observed_label: string;
    notes?: string;
    criteria_results: Record<string, "pass" | "fail">;
  }) => api.post(`/battery/evidence/${evidenceId}/review`, data),
  registerCell: (unitId: string, data: {
    cell_identifier: string;
    position_code: string;
    declared_cell_type: "prismatic" | "cylindrical" | "pouch";
    inspection_id?: string;
    detected_cell_type?: "prismatic" | "cylindrical" | "pouch";
    model_confidence?: number;
  }) => api.post(`/battery/units/${unitId}/cells`, data),
  verifyCell: (cellId: string, data: { decision: "match" | "mismatch"; mismatch_reason?: string }) =>
    api.post(`/battery/cells/${cellId}/verify`, data),
};
