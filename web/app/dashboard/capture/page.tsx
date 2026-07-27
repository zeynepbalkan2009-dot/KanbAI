"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  BatteryMedium, Camera, CheckCircle2, Clock, MapPin, RefreshCw,
  RotateCcw, Send, ShieldCheck, Signal, TriangleAlert, Wifi, WifiOff, XCircle,
} from "lucide-react";
import { devicesApi, inspectionsApi } from "@/lib/api";

type Device = { id: string; name: string; location_label?: string; status?: string };
type CaptureState = "idle" | "ready" | "captured" | "uploading" | "queued";
type CameraMode = "live" | "demo";
type CaptureMetadata = {
  serial_number: string;
  lot_number: string;
  captured_at: string;
};
type QueuedCapture = {
  id: string;
  fileName: string;
  dataUrl: string;
  deviceId: string;
  metadata: CaptureMetadata;
  createdAt: string;
};
type InspectionResult = {
  id: string;
  decision: "pass" | "fail" | "review" | "pending" | "error";
  confidence?: number;
  defects?: Array<{ class_name: string; confidence: number; bbox?: number[] }>;
  inference_latency_ms?: number;
  created_at: string;
};

const demoBoxes = [
  { left: 58, top: 35, width: 24, height: 22, label: "crack", confidence: 94 },
  { left: 23, top: 61, width: 15, height: 12, label: "edge chip", confidence: 71 },
];
const OFFLINE_QUEUE_KEY = "kanbai_capture_offline_queue";

function readOfflineQueue(): QueuedCapture[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeOfflineQueue(queue: QueuedCapture[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [meta, body] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] || "image/jpeg";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], fileName, { type: mime });
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
      ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"
    }`}>
      {ok ? <CheckCircle2 size={13} /> : <TriangleAlert size={13} />}
      {label}
    </span>
  );
}

function decisionTone(decision?: InspectionResult["decision"]) {
  if (decision === "pass") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (decision === "fail" || decision === "error") return "border-red-500/25 bg-red-500/10 text-red-200";
  if (decision === "review") return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  return "border-[#00C2FF]/25 bg-[#00C2FF]/10 text-[#b9efff]";
}

function decisionLabel(decision?: InspectionResult["decision"]) {
  if (decision === "pass") return "PASS";
  if (decision === "fail") return "FAIL";
  if (decision === "review") return "REVIEW";
  if (decision === "error") return "ERROR";
  return "AI ANALYZING";
}

function drawDemoInspectionFrame(canvas: HTMLCanvasElement) {
  const width = 1280;
  const height = 800;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#1c2533");
  gradient.addColorStop(0.5, "#6f7b86");
  gradient.addColorStop(1, "#111722");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#9ba5ad";
  ctx.strokeStyle = "#d7dde3";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(190, 120, 900, 520, 34);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#76818b";
  for (let y = 180; y < 585; y += 92) {
    ctx.fillRect(260, y, 760, 12);
  }

  ctx.strokeStyle = "#1b2430";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(775, 300);
  ctx.lineTo(835, 340);
  ctx.lineTo(812, 395);
  ctx.lineTo(875, 438);
  ctx.stroke();

  ctx.strokeStyle = "#FF7A00";
  ctx.lineWidth = 8;
  ctx.strokeRect(742, 265, 250, 190);

  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(24, 24, 420, 82);
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 28px Arial";
  ctx.fillText("KanbAI Demo Fabrika A", 48, 64);
  ctx.font = "18px Arial";
  ctx.fillStyle = "#b9c2cc";
  ctx.fillText("Line 1 / Station 3 - Aluminium panel", 48, 92);
}

export default function CapturePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraToastShown = useRef(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [state, setState] = useState<CaptureState>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [serial, setSerial] = useState("KANBAI-DEMO-001");
  const [lot, setLot] = useState("FACTORY-PILOT-A");
  const [battery, setBattery] = useState<number | null>(null);
  const [gps, setGps] = useState("41.105 / 29.025");
  const [lastInspectionId, setLastInspectionId] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState(0);
  const [cameraMode, setCameraMode] = useState<CameraMode>("live");
  const [aiResult, setAiResult] = useState<InspectionResult | null>(null);
  const [resultPolling, setResultPolling] = useState(false);
  const [syncingQueue, setSyncingQueue] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const loadDevices = useCallback(async () => {
    const { data } = await devicesApi.list();
    setDevices(data);
    if (data.length && !selectedDevice) setSelectedDevice(data[0].id);
  }, [selectedDevice]);

  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("media_devices_unavailable");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraMode("live");
      setState("ready");
    } catch {
      setCameraMode("demo");
      setState("ready");
      if (!cameraToastShown.current) {
        cameraToastShown.current = true;
        toast.success("Kamera izni yok; demo fotograf modu aktif.");
      }
    }
  }, []);

  useEffect(() => {
    loadDevices().catch(() => toast.error("Cihaz listesi alinamadi"));
    startCamera();
    setOfflineQueue(readOfflineQueue().length);
    setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    navigator.geolocation?.getCurrentPosition(
      (pos) => setGps(`${pos.coords.latitude.toFixed(5)} / ${pos.coords.longitude.toFixed(5)}`),
      () => undefined,
      { maximumAge: 300_000, timeout: 2_000 },
    );
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
    nav.getBattery?.().then((b) => setBattery(Math.round(b.level * 100))).catch(() => undefined);
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, [loadDevices, startCamera]);

  const enqueueOfflineCapture = useCallback(async (
    file: File,
    deviceId: string,
    metadata: CaptureMetadata,
  ) => {
    const item: QueuedCapture = {
      id: crypto.randomUUID(),
      fileName: file.name,
      dataUrl: await fileToDataUrl(file),
      deviceId,
      metadata,
      createdAt: new Date().toISOString(),
    };
    const nextQueue = [...readOfflineQueue(), item];
    writeOfflineQueue(nextQueue);
    setOfflineQueue(nextQueue.length);
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    if (syncingQueue) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Cihaz offline; kuyruk beklemede");
      return;
    }

    const queue = readOfflineQueue();
    if (queue.length === 0) {
      setOfflineQueue(0);
      return;
    }

    setSyncingQueue(true);
    const remaining: QueuedCapture[] = [];
    let uploaded = 0;

    for (const item of queue) {
      try {
        const file = dataUrlToFile(item.dataUrl, item.fileName);
        const { data } = await inspectionsApi.upload(item.deviceId, file, item.metadata);
        uploaded += 1;
        setLastInspectionId(data.inspection_id);
        setAiResult(null);
        setResultPolling(true);
        setState("queued");
      } catch {
        remaining.push(item);
      }
    }

    writeOfflineQueue(remaining);
    setOfflineQueue(remaining.length);
    setSyncingQueue(false);

    if (uploaded > 0) toast.success(`${uploaded} offline kayit AI kuyruguna gonderildi`);
    if (remaining.length > 0) toast.error(`${remaining.length} offline kayit hala bekliyor`);
  }, [syncingQueue]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue().catch(() => undefined);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncOfflineQueue]);

  const capture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (cameraMode === "demo" || !video || video.videoWidth === 0) {
      drawDemoInspectionFrame(canvas);
    } else {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;
    const file = new File([blob], `kanbai-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    setCapturedFile(file);
    setPreviewUrl(URL.createObjectURL(blob));
    setState("captured");
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedFile(null);
    setLastInspectionId(null);
    setAiResult(null);
    setResultPolling(false);
    setState("ready");
  };

  const submit = async () => {
    if (!capturedFile || !selectedDevice) return toast.error("Cihaz ve fotograf gerekli");
    const metadata = {
      serial_number: serial,
      lot_number: lot,
      captured_at: new Date().toISOString(),
    };

    if (!isOnline) {
      await enqueueOfflineCapture(capturedFile, selectedDevice, metadata);
      setState("captured");
      toast.success("Offline mod: fotograf guvenli kuyruga alindi");
      return;
    }

    setState("uploading");
    try {
      const { data } = await inspectionsApi.upload(selectedDevice, capturedFile, metadata);
      setLastInspectionId(data.inspection_id);
      setAiResult(null);
      setResultPolling(true);
      setState("queued");
      toast.success("Fotograf AI kuyruguna gonderildi");
    } catch (error: any) {
      await enqueueOfflineCapture(capturedFile, selectedDevice, metadata);
      setState("captured");
      toast.error(error?.response?.data?.detail ?? "Yukleme basarisiz, offline kuyruga alindi");
    }
  };

  useEffect(() => {
    if (!lastInspectionId || state !== "queued") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const poll = async () => {
      try {
        const { data } = await inspectionsApi.get(lastInspectionId);
        if (cancelled) return;
        setAiResult(data);

        if (data.decision && data.decision !== "pending") {
          setResultPolling(false);
          toast.success(`AI sonucu hazir: ${decisionLabel(data.decision)}`);
          return;
        }
      } catch {
        if (cancelled) return;
      }

      attempts += 1;
      if (attempts >= 20) {
        setResultPolling(false);
        return;
      }
      timer = setTimeout(poll, 1500);
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [lastInspectionId, state]);

  const selected = devices.find((device) => device.id === selectedDevice);
  const online = isOnline;

  return (
    <div className="min-h-full bg-[#090B10] p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f131c] shadow-2xl shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF7A00]">Operator capture</p>
              <h1 className="mt-1 text-xl font-semibold text-white">Factory Mobile Inspection</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill ok={online} label={online ? "Online" : "Offline"} />
              <StatusPill ok={offlineQueue === 0} label={`${offlineQueue} offline queue`} />
              <StatusPill ok={state !== "idle"} label={cameraMode === "demo" ? "Demo camera" : state === "ready" ? "Camera ready" : state} />
              {offlineQueue > 0 && (
                <button
                  onClick={() => syncOfflineQueue().catch(() => undefined)}
                  disabled={syncingQueue}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#00C2FF]/30 bg-[#00C2FF]/10 px-3 py-1 text-xs font-semibold text-sky-200 transition hover:bg-[#00C2FF]/15 disabled:opacity-60"
                >
                  <RefreshCw size={13} className={syncingQueue ? "animate-spin" : ""} />
                  Sync queue
                </button>
              )}
            </div>
          </div>

          <div className="relative aspect-[16/10] bg-black">
            <video ref={videoRef} className={`h-full w-full object-cover ${previewUrl || cameraMode === "demo" ? "hidden" : "block"}`} autoPlay muted playsInline />
            {cameraMode === "demo" && !previewUrl && (
              <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_50%_35%,#2b3645,#090B10_72%)]">
                <div className="absolute left-[16%] top-[18%] h-[58%] w-[68%] rounded-[2rem] border border-white/30 bg-gradient-to-br from-slate-300 via-slate-500 to-slate-800 shadow-2xl shadow-black/60">
                  <div className="absolute left-[8%] top-[18%] h-2 w-[82%] rounded-full bg-white/25" />
                  <div className="absolute left-[8%] top-[38%] h-2 w-[82%] rounded-full bg-black/20" />
                  <div className="absolute left-[8%] top-[58%] h-2 w-[82%] rounded-full bg-white/20" />
                  <div className="absolute left-[64%] top-[30%] h-[28%] w-[20%] rotate-12 border-2 border-[#FF7A00] bg-[#FF7A00]/10 shadow-[0_0_35px_rgba(255,122,0,.35)]" />
                  <div className="absolute left-[70%] top-[33%] h-[21%] w-1 rotate-[-28deg] rounded-full bg-slate-950" />
                </div>
                <div className="absolute left-6 top-6 rounded-xl border border-white/10 bg-black/55 px-4 py-3 text-white backdrop-blur">
                  <p className="text-sm font-semibold">KanbAI Demo Fabrika A</p>
                  <p className="text-xs text-white/60">Simulated tablet camera feed</p>
                </div>
              </div>
            )}
            {previewUrl && <img src={previewUrl} alt="Captured part" className="h-full w-full object-cover" />}

            {(state === "captured" || state === "queued") && (
              <div className="absolute inset-0">
                {demoBoxes.map((box) => (
                  <div
                    key={box.label}
                    className="absolute rounded-md border-2 border-[#FF7A00] bg-[#FF7A00]/10 shadow-[0_0_30px_rgba(255,122,0,.28)]"
                    style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` }}
                  >
                    <div className="-mt-7 inline-flex rounded-md bg-[#FF7A00] px-2 py-1 text-xs font-semibold text-black">
                      {box.label} {box.confidence}%
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs text-white backdrop-blur">Demo Fabrika A</span>
              <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs text-white backdrop-blur">
                {selected?.location_label || "Line 1 / Station 3"}
              </span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/55 p-3 backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
                <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {new Date().toLocaleString("tr-TR")}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {gps}</span>
                <span className="inline-flex items-center gap-1.5"><BatteryMedium size={14} /> {battery ?? 87}%</span>
              </div>
              <div className="flex gap-2">
                {state === "captured" || state === "queued" ? (
                  <button onClick={retake} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/10">
                    <RotateCcw size={16} /> Tekrar cek
                  </button>
                ) : (
                  <button onClick={capture} disabled={state !== "ready"} className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-50">
                    <Camera size={16} /> {cameraMode === "demo" ? "Demo fotograf cek" : "Fotograf cek"}
                  </button>
                )}
                <button onClick={submit} disabled={!capturedFile || state === "uploading" || state === "queued"} className="inline-flex items-center gap-2 rounded-lg bg-[#FF7A00] px-5 py-2 text-sm font-semibold text-black disabled:opacity-50">
                  {state === "uploading" ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  AI'a gonder
                </button>
              </div>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-[#0f131c] p-5 shadow-xl shadow-black/20">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Inspection setup</h2>
              <ShieldCheck className="text-[#00C2FF]" size={18} />
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/50">Device</span>
                <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#151a24] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00C2FF]">
                  {devices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/50">Serial number</span>
                <input value={serial} onChange={(e) => setSerial(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#151a24] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00C2FF]" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/50">Lot</span>
                <input value={lot} onChange={(e) => setLot(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#151a24] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00C2FF]" />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0f131c] p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">AI decision preview</h2>
            <div className={`rounded-2xl border p-4 ${decisionTone(aiResult?.decision)}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] opacity-70">Current decision</p>
                  <p className="mt-1 text-2xl font-semibold">{decisionLabel(aiResult?.decision)}</p>
                </div>
                {resultPolling ? (
                  <RefreshCw className="animate-spin" size={28} />
                ) : aiResult?.decision === "pass" ? (
                  <CheckCircle2 size={30} />
                ) : aiResult?.decision === "fail" || aiResult?.decision === "error" ? (
                  <XCircle size={30} />
                ) : (
                  <TriangleAlert size={30} />
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-black/20 p-3">
                  <p className="opacity-55">Confidence</p>
                  <p className="mt-1 text-lg font-semibold">
                    {aiResult?.confidence ? `${Math.round(aiResult.confidence * 100)}%` : "--"}
                  </p>
                </div>
                <div className="rounded-lg bg-black/20 p-3">
                  <p className="opacity-55">Latency</p>
                  <p className="mt-1 text-lg font-semibold">
                    {aiResult?.inference_latency_ms ? `${aiResult.inference_latency_ms}ms` : "--"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="opacity-65">Upload</span>
                  <span className="font-medium">{lastInspectionId ? "Complete" : "Waiting"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-65">AI inference</span>
                  <span className="font-medium">{resultPolling ? "Running" : aiResult ? "Complete" : "Waiting"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-65">Dataset contribution</span>
                  <span className="font-medium">{aiResult?.decision === "review" || aiResult?.decision === "fail" ? "HITL required" : aiResult ? "Auto logged" : "Waiting"}</span>
                </div>
              </div>

              {lastInspectionId && (
                <div className="mt-4 rounded-lg bg-black/20 p-3 text-xs">
                  Inspection: <span className="font-mono">{lastInspectionId.split("-")[0]}</span>
                </div>
              )}

              {(aiResult?.decision === "review" || aiResult?.decision === "fail") && (
                <Link href="/dashboard/hitl" className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#FF7A00] px-4 py-2 text-sm font-semibold text-black hover:bg-[#ff8c22]">
                  HITL onay ekranina git
                </Link>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0f131c] p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">Factory telemetry</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-white/70"><span className="inline-flex items-center gap-2"><Signal size={15} /> WebSocket</span><span className="text-emerald-300">Live</span></div>
              <div className="flex items-center justify-between text-white/70"><span className="inline-flex items-center gap-2">{online ? <Wifi size={15} /> : <WifiOff size={15} />} Network</span><span>{online ? "Online" : "Offline"}</span></div>
              <div className="flex items-center justify-between text-white/70"><span>Persistent queue</span><span>{offlineQueue} item</span></div>
              <div className="flex items-center justify-between text-white/70"><span>Model</span><span>mock-v1.0</span></div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
