import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image, ScrollView,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { enqueueUpload, processUploadQueue, api } from "../services/api";
import * as Network from "expo-network";

interface Defect {
  class_name: string;
  confidence: number;
  bbox: number[];
}

interface UploadResult {
  inspection_id: string;
  task_id: string;
  status: string;
}

const DECISION_CONFIG = {
  pass:    { color: "#10b981", bg: "#022c22", label: "✅ GEÇTİ",      text: "Ürün kalite kontrolünden geçti." },
  fail:    { color: "#ef4444", bg: "#2d0d0d", label: "❌ BAŞARISIZ",  text: "Hata tespit edildi. Manuel inceleme yapın." },
  review:  { color: "#f59e0b", bg: "#2d1f0a", label: "⚠️ İNCELEME", text: "Belirsiz sonuç. Operatör onayı gerekli." },
  pending: { color: "#6b7280", bg: "#111827", label: "⏳ İŞLENİYOR", text: "AI analiz yapıyor..." },
  error:   { color: "#dc2626", bg: "#2d0d0d", label: "⚠️ HATA",      text: "İşlem sırasında hata oluştu." },
};

export default function CameraScreen({ route }: { route: any }) {
  const { device } = route.params as { device: { id: string; name: string } };
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [facing] = useState<CameraType>("back");

  const takePicture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.85, base64: false, skipProcessing: false,
    });
    if (photo) setCapturedUri(photo.uri);
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setCapturedUri(result.assets[0].uri);
    }
  };

  const uploadImage = useCallback(async () => {
    if (!capturedUri) return;
    setUploading(true);
    setUploadResult(null);

    try {
      const net = await Network.getNetworkStateAsync();

      if (!net.isConnected) {
        // Offline — add to queue
        await enqueueUpload(capturedUri, device.id);
        Alert.alert("Çevrimdışı", "Görüntü kuyruğa eklendi. İnternet bağlantısı gelince otomatik yüklenecek.");
        setCapturedUri(null);
        return;
      }

      // Online — upload directly
      const formData = new FormData();
      formData.append("device_id", device.id);
      formData.append("file", {
        uri: capturedUri,
        type: "image/jpeg",
        name: `inspection_${Date.now()}.jpg`,
      } as any);

      const { data } = await api.post("/inspections", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadResult(data);
    } catch (e: any) {
      Alert.alert("Yükleme Hatası", e?.response?.data?.detail ?? "Bilinmeyen hata");
    } finally {
      setUploading(false);
    }
  }, [capturedUri, device.id]);

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Kamera izni gerekli</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show result state
  if (uploadResult) {
    const decisionKey = (uploadResult.status ?? "pending") as keyof typeof DECISION_CONFIG;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.resultContainer}>
        <Text style={styles.deviceLabel}>{device.name}</Text>
        <View style={[styles.resultCard, { backgroundColor: "#111827", borderColor: "#1f2937" }]}>
          <View style={[styles.resultBadge, { backgroundColor: DECISION_CONFIG.pending.bg }]}>
            <Text style={[styles.resultLabel, { color: DECISION_CONFIG.pending.color }]}>
              {DECISION_CONFIG.pending.label}
            </Text>
          </View>
          <Text style={styles.resultText}>{DECISION_CONFIG.pending.text}</Text>
          <Text style={styles.resultMeta}>Task ID: {uploadResult.task_id?.slice(0, 8)}...</Text>
          <Text style={styles.resultMeta}>Sonuç gerçek zamanlı dashboard'da görünecek</Text>
        </View>
        <TouchableOpacity style={styles.btn} onPress={() => {
          setCapturedUri(null);
          setUploadResult(null);
        }}>
          <Text style={styles.btnText}>Yeni Muayene</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Preview state
  if (capturedUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedUri }} style={styles.preview} resizeMode="contain" />
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setCapturedUri(null)}>
            <Text style={styles.btnSecondaryText}>Yeniden Çek</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={uploadImage} disabled={uploading}>
            {uploading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Muayene Et</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Camera state
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        {/* Overlay grid */}
        <View style={styles.overlay}>
          <View style={styles.corner} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </CameraView>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
          <Text style={styles.galleryBtnText}>Galeri</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
          <View style={styles.captureInner} />
        </TouchableOpacity>
        <View style={{ width: 64 }} />
      </View>

      <Text style={styles.deviceLabel}>{device.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  camera: { flex: 1 },
  permissionContainer: { flex: 1, justifyContent: "center", alignItems: "center",
                          backgroundColor: "#030712", padding: 24 },
  permissionText: { color: "#9ca3af", fontSize: 15, marginBottom: 16, textAlign: "center" },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  corner: { position: "absolute", top: "20%", left: "10%", width: 20, height: 20,
            borderTopWidth: 2, borderLeftWidth: 2, borderColor: "#fff" },
  cornerTR: { left: undefined, right: "10%", borderLeftWidth: 0, borderRightWidth: 2 },
  cornerBL: { top: undefined, bottom: "20%", borderTopWidth: 0, borderBottomWidth: 2 },
  cornerBR: { top: undefined, left: undefined, bottom: "20%", right: "10%",
              borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 2, borderBottomWidth: 2 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-around",
               paddingVertical: 30, backgroundColor: "#000" },
  captureBtn: { width: 70, height: 70, borderRadius: 35, borderWidth: 3,
                borderColor: "#fff", justifyContent: "center", alignItems: "center" },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff" },
  galleryBtn: { width: 64, height: 40, justifyContent: "center", alignItems: "center",
                backgroundColor: "#1f2937", borderRadius: 8 },
  galleryBtnText: { color: "#9ca3af", fontSize: 13 },
  deviceLabel: { color: "#6b7280", fontSize: 11, textAlign: "center", paddingVertical: 8 },
  preview: { flex: 1, backgroundColor: "#000" },
  previewActions: { flexDirection: "row", gap: 12, padding: 16, backgroundColor: "#111827" },
  btn: { flex: 1, backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14,
         alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  btnSecondary: { flex: 1, backgroundColor: "#1f2937", borderRadius: 10,
                  paddingVertical: 14, alignItems: "center" },
  btnSecondaryText: { color: "#9ca3af", fontSize: 15 },
  resultContainer: { padding: 24, alignItems: "center", gap: 16 },
  resultCard: { width: "100%", borderRadius: 16, padding: 20, borderWidth: 1, gap: 10 },
  resultBadge: { alignSelf: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  resultLabel: { fontSize: 18, fontWeight: "700" },
  resultText: { color: "#9ca3af", fontSize: 14, textAlign: "center" },
  resultMeta: { color: "#4b5563", fontSize: 11, textAlign: "center" },
});
