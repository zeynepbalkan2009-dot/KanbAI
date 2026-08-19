"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Camera,
  CheckCircle2,
  Loader2,
  LogIn,
  RefreshCw,
  Send,
  ShieldCheck,
  TabletSmartphone,
  UploadCloud,
  Wifi,
  XCircle,
} from "lucide-react";
import { devicesApi, inspectionsApi, setupApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth";

type Device = {
  id: string;
  device_uuid: string;
  name: string;
  location_label?: string;
  status?: string;
};

type Station = {
  id: string;
  code: string;
  name: string;
};

type Product = {
  id: string;
  sku: string;
  name: string;
};

type InspectionResult = {
  id: string;
  decision: "pass" | "fail" | "review" | "pending" | "error";
  confidence?: number;
  defects?: Array<{ class_name: string; confidence: number }>;
  inference_latency_ms?: number;
};

const DEVICE_UUID_KEY = "kanbai_germaksan_phone_uuid";
const DEFAULT_EMAIL = "pilot@germaksan.com.tr";
const DEFAULT_PASSWORD = "GermaksanPilot2026!";

function resultLabel(decision?: InspectionResult["decision"]) {
  if (decision === "pass") return "PASS";
  if (decision === "fail") return "FAIL";
  if (decision === "review") return "REVIEW";
  if (decision === "error") return "ERROR";
  return "AI ANALYZING";
}

function resultTone(decision?: InspectionResult["decision"]) {
  if (decision === "pass") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  if (decision === "fail" || decision === "error") return "border-red-400/30 bg-red-400/10 text-red-100";
  if (decision === "review") return "border-[#FF7A00]/40 bg-[#FF7A00]/10 text-orange-100";
  return "border-[#00C2FF]/30 bg-[#00C2FF]/10 text-sky-100";
}

function makePhoneUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `germaksan-phone-${crypto.randomUUID()}`;
  }
  return `germaksan-phone-${Date.now()}`;
}

export default function OperatorCapturePage() {
  const { user, isAuthenticated, login, fetchMe } = useAuthStore();
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [device, setDevice] = useState<Device | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [serial, setSerial] = useState(`GERMAKSAN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-001`);
  const [lot, setLot] = useState("GERMAKSAN-PILOT");
  const [submitting, setSubmitting] = useState(false);
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [result, setResult] = useState<InspectionResult | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      fetchMe().catch(() => undefined);
    }
  }, [fetchMe, isAuthenticated]);

  const previewName = useMemo(() => file?.name.replace(/\.[^.]+$/, "") || "Yeni parca fotografi", [file]);

  const loadOrRegisterDevice = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingSetup(true);
    try {
      const [devicesResponse, stationsResponse, productsResponse] = await Promise.all([
        devicesApi.list(),
        setupApi.stations({ active_only: true }),
        setupApi.products({ active_only: true }),
      ]);

      const stations = stationsResponse.data as Station[];
      const products = productsResponse.data as Product[];
      const selectedStation =
        stations.find((item) => item.code?.includes("GERMAKSAN")) ?? stations[0] ?? null;
      const selectedProduct =
        products.find((item) => item.sku?.includes("GERMAKSAN")) ?? products[0] ?? null;
      setStation(selectedStation);
      setProduct(selectedProduct);

      const devices = devicesResponse.data as Device[];
      let phoneUuid = localStorage.getItem(DEVICE_UUID_KEY);
      if (!phoneUuid) {
        phoneUuid = makePhoneUuid();
        localStorage.setItem(DEVICE_UUID_KEY, phoneUuid);
      }

      const existing =
        devices.find((item) => item.device_uuid === phoneUuid) ??
        devices.find((item) => item.name.toLowerCase().includes("phone")) ??
        devices[0] ??
        null;

      if (existing) {
        setDevice(existing);
        return;
      }

      const { data } = await devicesApi.register({
        device_uuid: phoneUuid,
        name: "GERMAKSAN Phone Capture",
        location_label: "GERMAKSAN / Mobile QC",
        station_id: selectedStation?.id,
      });
      setDevice(data as Device);
      toast.success("Telefon operator cihazi olarak kaydedildi");
    } catch {
      toast.error("Telefon cihazi hazirlanamadi");
    } finally {
      setLoadingSetup(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadOrRegisterDevice().catch(() => undefined);
  }, [loadOrRegisterDevice]);

  const handleLogin = async () => {
    setLoadingLogin(true);
    try {
      await login(email.trim(), password);
      toast.success("Operator oturumu acildi");
    } catch {
      toast.error("Giris basarisiz");
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setResult(null);
    setInspectionId(null);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  };

  const submit = async () => {
    if (!file || !device) {
      toast.error("Fotograf ve cihaz gerekli");
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const { data } = await inspectionsApi.upload(device.id, file, {
        serial_number: serial,
        lot_number: lot,
        captured_at: new Date().toISOString(),
        station_id: station?.id,
        product_id: product?.id,
      });
      setInspectionId(data.inspection_id);
      toast.success("Fotograf kalite kuyruguna gonderildi");
    } catch {
      toast.error("Yukleme basarisiz");
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!inspectionId) return;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const { data } = await inspectionsApi.get(inspectionId);
        if (cancelled) return;
        setResult(data as InspectionResult);
        if (data.decision && data.decision !== "pending") {
          setSubmitting(false);
          return;
        }
      } catch {
        if (cancelled) return;
      }

      attempts += 1;
      if (attempts >= 24) {
        setSubmitting(false);
        return;
      }
      timer = setTimeout(poll, 1250);
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [inspectionId]);

  return (
    <main className="min-h-screen bg-[#090B10] px-4 py-5 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-black tracking-tight">Kanb<span className="text-[#00C2FF]">AI</span></p>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Operator Capture</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            <Wifi size={13} />
            Local
          </span>
        </header>

        {!isAuthenticated ? (
          <section className="rounded-2xl border border-white/10 bg-[#111722] p-5 shadow-2xl shadow-black/30">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-xl bg-[#00C2FF]/10 p-2 text-[#00C2FF]">
                <LogIn size={22} />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Telefonu bagla</h1>
                <p className="mt-1 text-sm leading-6 text-white/55">
                  Bu ekran sadece fotograf gonderir. Kalite karari laptop dashboard'unda verilir.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/45">Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-base outline-none focus:border-[#00C2FF]"
                  type="email"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/45">Sifre</span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-base outline-none focus:border-[#00C2FF]"
                  type="password"
                />
              </label>
              <button
                onClick={handleLogin}
                disabled={loadingLogin}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C2FF] px-4 py-3 font-bold text-black disabled:opacity-60"
              >
                {loadingLogin ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
                Giris yap
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-white/10 bg-[#111722] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#FF7A00]">GERMAKSAN Pilot</p>
                  <h1 className="mt-1 text-2xl font-semibold">Fotograf gonder</h1>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Parca fotografini cek, AI analizini baslat. Sonuc kalite sorumlusunun dashboard'una duser.
                  </p>
                </div>
                <TabletSmartphone className="text-[#00C2FF]" size={24} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="text-white/40">Operator</p>
                  <p className="mt-1 truncate font-semibold">{user?.full_name ?? "Pilot"}</p>
                </div>
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="text-white/40">Cihaz</p>
                  <p className="mt-1 truncate font-semibold">
                    {loadingSetup ? "Hazirlaniyor" : device?.name ?? "Bekliyor"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#111722] p-4">
              <label className="flex min-h-[230px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#00C2FF]/35 bg-black/25 p-5 text-center">
                {previewUrl ? (
                  <img src={previewUrl} alt={previewName} className="max-h-[320px] w-full rounded-xl object-contain" />
                ) : (
                  <>
                    <div className="rounded-2xl bg-[#00C2FF]/10 p-4 text-[#00C2FF]">
                      <Camera size={34} />
                    </div>
                    <p className="mt-4 text-lg font-semibold">Telefondan fotograf cek</p>
                    <p className="mt-2 text-sm text-white/45">Kamera acilir veya galeriden secim yapilir.</p>
                  </>
                )}
                <input
                  className="hidden"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFile}
                />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Seri No</span>
                  <input
                    value={serial}
                    onChange={(event) => setSerial(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm outline-none focus:border-[#00C2FF]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Lot</span>
                  <input
                    value={lot}
                    onChange={(event) => setLot(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm outline-none focus:border-[#00C2FF]"
                  />
                </label>
              </div>

              <button
                onClick={submit}
                disabled={!file || !device || submitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF7A00] px-4 py-3 font-bold text-black disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                AI kuyruguna gonder
              </button>
            </section>

            <section className={`rounded-2xl border p-5 ${resultTone(result?.decision)}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] opacity-70">Sonuc</p>
                  <p className="mt-1 text-3xl font-bold">{resultLabel(result?.decision)}</p>
                </div>
                {submitting ? (
                  <RefreshCw className="animate-spin" size={30} />
                ) : result?.decision === "pass" ? (
                  <CheckCircle2 size={32} />
                ) : result?.decision === "fail" || result?.decision === "error" ? (
                  <XCircle size={32} />
                ) : (
                  <ShieldCheck size={32} />
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="opacity-55">Guven</p>
                  <p className="mt-1 text-xl font-semibold">
                    {result?.confidence ? `${Math.round(result.confidence * 100)}%` : "--"}
                  </p>
                </div>
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="opacity-55">Sure</p>
                  <p className="mt-1 text-xl font-semibold">
                    {result?.inference_latency_ms ? `${result.inference_latency_ms}ms` : "--"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 opacity-75">
                {inspectionId
                  ? `Muayene kaydi: ${inspectionId.slice(0, 8)}. Laptop dashboard'da Muayene Kayitlari ve Inceleme Kuyrugu ekranlarini kontrol edin.`
                  : "Henuz fotograf gonderilmedi."}
              </p>
            </section>
          </>
        )}

        <p className="px-1 text-center text-xs leading-5 text-white/35">
          Yerel pilot modu. Bu telefon ekrani dashboard degildir; sadece fotograf toplama ve AI kuyruguna gonderme icindir.
        </p>
      </div>
    </main>
  );
}
