import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { devicesApi, processUploadQueue } from "../services/api";
import { useWebSocket, WSEvent } from "../hooks/useWebSocket";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode"; // add to deps if needed

interface Device {
  id: string;
  name: string;
  location_label?: string;
  is_active: boolean;
  last_seen_at?: string;
}

interface InspectionEvent {
  id: string;
  type: string;
  decision?: string;
  confidence?: number;
  timestamp: string;
}

const DECISION_COLORS: Record<string, string> = {
  pass: "#10b981", fail: "#ef4444", review: "#f59e0b",
  pending: "#6b7280", error: "#dc2626",
};
const DECISION_LABELS: Record<string, string> = {
  pass: "GEÇTİ", fail: "BAŞARISIZ", review: "İNCELEME",
  pending: "BEKLİYOR", error: "HATA",
};

export default function HomeScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [devices, setDevices] = useState<Device[]>([]);
  const [events, setEvents] = useState<InspectionEvent[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [queueCount, setQueueCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Extract tenant_id from JWT
  useEffect(() => {
    SecureStore.getItemAsync("qc_access_token").then((token) => {
      if (token) {
        try {
          const payload = jwtDecode<{ tenant_id: string }>(token);
          setTenantId(payload.tenant_id);
        } catch {}
      }
    });
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      const { data } = await devicesApi.list();
      setDevices(data);
    } catch {}
  }, []);

  const syncQueue = async () => {
    setSyncing(true);
    const { success, failed } = await processUploadQueue();
    setSyncing(false);
    if (success > 0) Alert.alert("Senkronizasyon", `${success} görüntü yüklendi.`);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDevices();
    setRefreshing(false);
  }, [loadDevices]);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  // WebSocket events → live feed
  const handleWSEvent = useCallback((event: WSEvent) => {
    if (event.type === "inspection.completed" || event.type === "inspection.processing") {
      setEvents((prev) => [
        {
          id: event.inspection_id ?? Date.now().toString(),
          type: event.type,
          decision: event.decision,
          confidence: event.confidence,
          timestamp: event.timestamp ?? new Date().toISOString(),
        },
        ...prev.slice(0, 19),
      ]);
    }
  }, []);

  const { connected } = useWebSocket({
    tenantId,
    enabled: !!tenantId,
    onEvent: handleWSEvent,
  });

  const renderDevice = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={styles.deviceCard}
      onPress={() => navigation.navigate("Camera", { device: item })}
      activeOpacity={0.7}
    >
      <View style={styles.deviceHeader}>
        <View style={[styles.dot, { backgroundColor: item.is_active ? "#10b981" : "#6b7280" }]} />
        <Text style={styles.deviceName}>{item.name}</Text>
      </View>
      {item.location_label && (
        <Text style={styles.deviceLocation}>{item.location_label}</Text>
      )}
      <Text style={styles.deviceCTA}>Fotoğraf çek →</Text>
    </TouchableOpacity>
  );

  const renderEvent = ({ item }: { item: InspectionEvent }) => {
    const color = DECISION_COLORS[item.decision ?? "pending"];
    const label = DECISION_LABELS[item.decision ?? "pending"];
    return (
      <View style={styles.eventRow}>
        <View style={[styles.eventDot, { backgroundColor: color }]} />
        <Text style={styles.eventId}>{item.id.split("-")[0]}</Text>
        <Text style={[styles.eventDecision, { color }]}>{label}</Text>
        {item.confidence && (
          <Text style={styles.eventConf}>{Math.round(item.confidence * 100)}%</Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={[styles.wsIndicator, { backgroundColor: connected ? "#10b981" : "#6b7280" }]} />
        <Text style={styles.statusText}>
          {connected ? "Canlı bağlantı" : "Bağlanıyor..."}
        </Text>
        <TouchableOpacity onPress={syncQueue} disabled={syncing} style={styles.syncBtn}>
          <Text style={styles.syncText}>{syncing ? "Senkron..." : "↑ Senkronize Et"}</Text>
        </TouchableOpacity>
      </View>

      {/* Devices */}
      <Text style={styles.sectionTitle}>Cihazlar</Text>
      <FlatList
        data={devices}
        keyExtractor={(d) => d.id}
        renderItem={renderDevice}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.deviceList}
        ListEmptyComponent={
          <Text style={styles.empty}>Kayıtlı cihaz yok</Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      />

      {/* Live feed */}
      <Text style={styles.sectionTitle}>Canlı Sonuçlar</Text>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id + e.timestamp}
        renderItem={renderEvent}
        style={styles.eventList}
        ListEmptyComponent={
          <Text style={styles.empty}>Henüz sonuç yok — muayene başlatın</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  statusBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
               paddingVertical: 8, backgroundColor: "#111827", borderBottomWidth: 1,
               borderBottomColor: "#1f2937" },
  wsIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { color: "#9ca3af", fontSize: 12, flex: 1 },
  syncBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
             backgroundColor: "#1e3a5f" },
  syncText: { color: "#60a5fa", fontSize: 12 },
  sectionTitle: { color: "#9ca3af", fontSize: 12, fontWeight: "600",
                  textTransform: "uppercase", letterSpacing: 0.8,
                  paddingHorizontal: 16, marginTop: 20, marginBottom: 8 },
  deviceList: { paddingHorizontal: 16, gap: 12 },
  deviceCard: { backgroundColor: "#111827", borderRadius: 14, padding: 16,
                borderWidth: 1, borderColor: "#1f2937", width: 180 },
  deviceHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  deviceName: { color: "#f9fafb", fontSize: 14, fontWeight: "600", flex: 1 },
  deviceLocation: { color: "#6b7280", fontSize: 12, marginBottom: 8 },
  deviceCTA: { color: "#3b82f6", fontSize: 12, fontWeight: "500" },
  eventList: { flex: 1, paddingHorizontal: 16 },
  eventRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10,
              borderBottomWidth: 1, borderBottomColor: "#111827" },
  eventDot: { width: 6, height: 6, borderRadius: 3 },
  eventId: { color: "#6b7280", fontSize: 12, fontFamily: "monospace", flex: 1 },
  eventDecision: { fontSize: 12, fontWeight: "600" },
  eventConf: { color: "#4b5563", fontSize: 11 },
  empty: { color: "#374151", fontSize: 13, textAlign: "center", marginTop: 16 },
});
