/**
 * Mobile API service with:
 * - Token storage via expo-secure-store
 * - Offline upload queue (retry when network available)
 * - Automatic token refresh
 */

import axios, { AxiosInstance } from "axios";
import * as SecureStore from "expo-secure-store";
import * as Network from "expo-network";
import * as FileSystem from "expo-file-system";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.100:8000";

const TOKEN_KEY = "qc_access_token";
const REFRESH_KEY = "qc_refresh_token";

// ── Token helpers ─────────────────────────────────────────────────────────────
export const tokenStore = {
  getAccess: () => SecureStore.getItemAsync(TOKEN_KEY),
  getRefresh: () => SecureStore.getItemAsync(REFRESH_KEY),
  set: async (access: string, refresh: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

// ── Axios instance ────────────────────────────────────────────────────────────
export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30_000,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await tokenStore.getRefresh();
        const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
          refresh_token: refresh,
        });
        await tokenStore.set(data.access_token, data.refresh_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        await tokenStore.clear();
        throw error;
      }
    }
    throw error;
  }
);

// ── Upload queue (offline-first) ──────────────────────────────────────────────
interface QueueItem {
  id: string;
  imageUri: string;
  deviceId: string;
  retries: number;
  createdAt: string;
}

const QUEUE_FILE = FileSystem.documentDirectory + "upload_queue.json";

async function loadQueue(): Promise<QueueItem[]> {
  try {
    const info = await FileSystem.getInfoAsync(QUEUE_FILE);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(QUEUE_FILE);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueueItem[]): Promise<void> {
  await FileSystem.writeAsStringAsync(QUEUE_FILE, JSON.stringify(queue));
}

export async function enqueueUpload(imageUri: string, deviceId: string): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const queue = await loadQueue();
  queue.push({ id, imageUri, deviceId, retries: 0, createdAt: new Date().toISOString() });
  await saveQueue(queue);
  return id;
}

export async function processUploadQueue(
  onProgress?: (done: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const net = await Network.getNetworkStateAsync();
  if (!net.isConnected) return { success: 0, failed: 0 };

  const queue = await loadQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let success = 0;
  let failed = 0;
  const remaining: QueueItem[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    onProgress?.(i, queue.length);
    try {
      const result = await FileSystem.uploadAsync(
        `${API_URL}/api/v1/inspections`,
        item.imageUri,
        {
          fieldName: "file",
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          parameters: { device_id: item.deviceId },
          headers: {
            Authorization: `Bearer ${(await tokenStore.getAccess()) ?? ""}`,
          },
        }
      );
      if (result.status === 202) {
        success++;
      } else {
        item.retries++;
        if (item.retries < 5) remaining.push(item);
        else failed++;
      }
    } catch {
      item.retries++;
      if (item.retries < 5) remaining.push(item);
      else failed++;
    }
  }

  await saveQueue(remaining);
  return { success, failed };
}

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  me: () => api.get("/auth/me"),
};

export const devicesApi = {
  list: () => api.get("/devices"),
  heartbeat: (id: string) => api.patch(`/devices/${id}/heartbeat`, {}),
};
