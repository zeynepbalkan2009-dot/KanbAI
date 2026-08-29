"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { batteryApi, devicesApi, inspectionsApi, setupApi } from "@/lib/api";
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
  production_line_id?: string | null;
  station_type?: string | null;
  metadata?: { workflow?: string; workflow_step?: number };
};

type Product = {
  id: string;
  sku: string;
  name: string;
  revision?: string | null;
  defect_policy?: {
    industry_domain?: "steel_equipment" | "battery_assembly";
    operation_stage?: string;
    inspection_mode?: string;
    defect_classes?: string[];
    quality_decision_enabled?: boolean;
    capture_mode?: "conveyor" | "fixed_station" | "handheld";
    capture_strategy?: "manual" | "stability_gated" | "external_trigger" | "continuous";
    native_camera_required?: boolean;
    alignment_overlay_required?: boolean;
  };
};

type InspectionResult = {
  id: string;
  decision: "pass" | "fail" | "review" | "pending" | "error" | "out_of_scope";
  confidence?: number | null;
  defects?: Array<{ class_name: string; confidence: number }>;
  inference_latency_ms?: number;
};

type BatteryUnit = {
  id: string;
  product_id: string;
  production_line_id?: string | null;
  serial_number: string;
  barcode?: string | null;
  status: string;
  current_step: number;
};

const DEVICE_UUID_KEY = "kanbai_device_uuid";
const LEGACY_DEVICE_UUID_KEYS = ["kanbai_operator_phone_uuid", "kanbai_pilot_phone_uuid_legacy"];
const PILOT_LABEL_KEY = "kanbai_operator_pilot_label";
const DEFAULT_PILOT_LABEL = "Pilot Fabrika";

function resultLabel(decision?: InspectionResult["decision"]) {
  if (decision === "pass") return "PASS";
  if (decision === "fail") return "FAIL";
  if (decision === "review") return "REVIEW";
  if (decision === "out_of_scope") return "OUT OF SCOPE";
  if (decision === "error") return "ERROR";
  return "AI ANALYZING";
}

function resultTone(decision?: InspectionResult["decision"]) {
  if (decision === "pass") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  if (decision === "fail" || decision === "error") return "border-red-400/30 bg-red-400/10 text-red-100";
  if (decision === "review") return "border-[#FF7A00]/40 bg-[#FF7A00]/10 text-orange-100";
  if (decision === "out_of_scope") return "border-slate-500/40 bg-slate-500/10 text-slate-100";
  return "border-[#00C2FF]/30 bg-[#00C2FF]/10 text-sky-100";
}

function makePhoneUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `kanbai-phone-${crypto.randomUUID()}`;
  }
  return `kanbai-phone-${Date.now()}`;
}

export default function OperatorCapturePage() {
  const { user, isAuthenticated, login, fetchMe } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pilotLabel, setPilotLabel] = useState(DEFAULT_PILOT_LABEL);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [device, setDevice] = useState<Device | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [batteryUnits, setBatteryUnits] = useState<BatteryUnit[]>([]);
  const [batteryUnit, setBatteryUnit] = useState<BatteryUnit | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [serial, setSerial] = useState(`CAPTURE-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-001`);
  const [lot, setLot] = useState(`COLLECTION-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`);
  const [submitting, setSubmitting] = useState(false);
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [result, setResult] = useState<InspectionResult | null>(null);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [deviceStable, setDeviceStable] = useState(false);
  const stableSamples = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) {
      fetchMe().catch(() => undefined);
    }
  }, [fetchMe, isAuthenticated]);

  useEffect(() => {
    const storedPilotLabel = localStorage.getItem(PILOT_LABEL_KEY);
    if (storedPilotLabel?.trim()) {
      setPilotLabel(storedPilotLabel.trim());
    }
  }, []);

  const handlePilotLabelChange = (value: string) => {
    setPilotLabel(value);
    localStorage.setItem(PILOT_LABEL_KEY, value);
  };

  const previewName = useMemo(() => file?.name.replace(/\.[^.]+$/, "") || "Yeni parca fotografi", [file]);
  const configuredDefects = product?.defect_policy?.defect_classes ?? [];
  const domainLabel = product?.defect_policy?.industry_domain === "steel_equipment"
    ? "Celik ve haddehane ekipmani"
    : product?.defect_policy?.industry_domain === "battery_assembly"
      ? "Batarya montaj"
      : "Alan tanimlanmadi";
  const profileReady = Boolean(
    product?.defect_policy?.quality_decision_enabled &&
    product?.defect_policy?.operation_stage &&
    configuredDefects.length > 0
  );
  const captureMode = product?.defect_policy?.capture_mode ?? "fixed_station";
  const captureStrategy = product?.defect_policy?.capture_strategy ?? "manual";
  const alignmentOverlayRequired = product?.defect_policy?.alignment_overlay_required ?? true;

  useEffect(() => {
    if (!motionEnabled || typeof window === "undefined") return;
    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.acceleration;
      if (!acceleration) return;
      const magnitude = Math.sqrt(
        (acceleration.x ?? 0) ** 2 + (acceleration.y ?? 0) ** 2 + (acceleration.z ?? 0) ** 2
      );
      stableSamples.current = magnitude < 0.35 ? stableSamples.current + 1 : 0;
      setDeviceStable(stableSamples.current >= 8);
    };
    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [motionEnabled]);

  const enableMotionAssist = async () => {
    try {
      const motionApi = DeviceMotionEvent as typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<"granted" | "denied">;
      };
      if (motionApi.requestPermission && await motionApi.requestPermission() !== "granted") {
        toast.error("Hareket sensoru izni verilmedi");
        return;
      }
      setMotionEnabled(true);
      toast.success("Titresim kontrolu etkin");
    } catch {
      toast.error("Bu tarayici hareket sensorunu desteklemiyor");
    }
  };

  const loadOrRegisterDevice = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingSetup(true);
    try {
      const [devicesResponse, stationsResponse, productsResponse, batteryUnitsResponse] = await Promise.all([
        devicesApi.list(),
        setupApi.stations({ active_only: true }),
        setupApi.products({ active_only: true }),
        batteryApi.units({ limit: 200 }),
      ]);

      const stations = stationsResponse.data as Station[];
      const availableProducts = productsResponse.data as Product[];
      const selectedStation =
        stations.find((item) => item.code?.toUpperCase().includes("PILOT")) ?? stations[0] ?? null;
      const selectedProduct =
        availableProducts.find((item) => item.sku?.toUpperCase().includes("PILOT")) ?? availableProducts[0] ?? null;
      setStation(selectedStation);
      setStations(stations);
      setProducts(availableProducts);
      setProduct(selectedProduct);
      setBatteryUnits(batteryUnitsResponse.data as BatteryUnit[]);

      const devices = devicesResponse.data as Device[];
      let phoneUuid = localStorage.getItem(DEVICE_UUID_KEY);
      if (!phoneUuid) {
        phoneUuid = LEGACY_DEVICE_UUID_KEYS
          .map((key) => localStorage.getItem(key))
          .find((value): value is string => Boolean(value)) ?? null;
      }
      if (!phoneUuid) {
        phoneUuid = makePhoneUuid();
      }
      localStorage.setItem(DEVICE_UUID_KEY, phoneUuid);

      const existing = devices.find((item) => item.device_uuid === phoneUuid) ?? null;
      if (existing) {
        setDevice(existing);
        return;
      }

      try {
        const { data } = await devicesApi.register({
          device_uuid: phoneUuid,
          name: `${pilotLabel.trim() || DEFAULT_PILOT_LABEL} Phone Capture`,
          location_label: `${pilotLabel.trim() || DEFAULT_PILOT_LABEL} / Mobile QC`,
          station_id: selectedStation?.id,
        });
        setDevice(data as Device);
        toast.success("Telefon operator cihazi olarak kaydedildi");
      } catch {
        setDevice(null);
        throw new Error("Device registration failed; refusing to use another device identity");
      }
    } catch {
      toast.error("Telefon cihazi hazirlanamadi");
    } finally {
      setLoadingSetup(false);
    }
  }, [isAuthenticated, pilotLabel]);

  useEffect(() => {
    if (product?.defect_policy?.industry_domain !== "battery_assembly") {
      setBatteryUnit(null);
      return;
    }
    const matching = batteryUnits.find(
      (item) => item.product_id === product.id && item.status !== "completed",
    ) ?? null;
    setBatteryUnit(matching);
    if (matching) setSerial(matching.serial_number);
  }, [batteryUnits, product?.id, product?.defect_policy?.industry_domain]);

  useEffect(() => {
    if (!batteryUnit) {
      if (product?.defect_policy?.industry_domain !== "battery_assembly") {
        setStation(stations.find((item) => !item.metadata?.workflow) ?? stations[0] ?? null);
      }
      return;
    }
    const workflowStation = stations.find((item) =>
      item.metadata?.workflow === "battery_assembly_v1"
      && item.metadata?.workflow_step === batteryUnit.current_step
      && (!batteryUnit.production_line_id || item.production_line_id === batteryUnit.production_line_id)
    ) ?? null;
    setStation(workflowStation);
  }, [batteryUnit?.id, batteryUnit?.current_step, batteryUnit?.production_line_id, product?.defect_policy?.industry_domain, stations]);

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
    if (product?.defect_policy?.industry_domain === "battery_assembly" && !batteryUnit) {
      toast.error("Batarya fotografi icin once seri numarali batarya kaydi secin");
      return;
    }
    if (batteryUnit?.current_step === 6) {
      toast.error("EOL asamasi fotografla kapatilamaz; olcum verilerini Batarya Izlenebilirlik ekranina girin");
      return;
    }
    if (batteryUnit && station?.metadata?.workflow_step !== batteryUnit.current_step) {
      toast.error(`Batarya adim ${batteryUnit.current_step} icin tanimli istasyon bulunamadi`);
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
      if (batteryUnit) {
        try {
          await batteryApi.addEvidence(batteryUnit.id, batteryUnit.current_step, {
            station_id: station?.id,
            inspection_id: data.inspection_id,
            notes: `Operator capture / ${lot}`,
          });
          toast.success(`Fotograf batarya ${batteryUnit.serial_number} / adim ${batteryUnit.current_step} kanitina baglandi`);
        } catch (linkError: any) {
          toast.error(`Fotograf kaydedildi fakat batarya adimina baglanamadi: ${linkError?.response?.data?.detail ?? "bilinmeyen hata"}`);
        }
      } else {
        toast.success("Fotograf insan inceleme kuyruguna gonderildi");
      }
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
                  <p className="text-xs uppercase tracking-[0.18em] text-[#FF7A00]">
                    {pilotLabel.trim() || DEFAULT_PILOT_LABEL}
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold">Fotograf gonder</h1>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Parca fotografini cek, AI analizini baslat. Sonuc kalite sorumlusunun dashboard'una duser.
                  </p>
                </div>
                <TabletSmartphone className="text-[#00C2FF]" size={24} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <label className="col-span-2 block rounded-xl bg-black/25 p-3">
                  <span className="mb-1 block text-white/40">Pilot / fabrika adi</span>
                  <input
                    value={pilotLabel}
                    onChange={(event) => handlePilotLabelChange(event.target.value)}
                    placeholder="Orn. Batarya Montaj Pilot"
                    className="w-full border-0 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/25"
                  />
                </label>
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
                <label className="col-span-2 block rounded-xl bg-black/25 p-3">
                  <span className="text-white/40">Kontrol profili / urun</span>
                  <select
                    value={product?.id ?? ""}
                    onChange={(event) =>
                      setProduct(products.find((item) => item.id === event.target.value) ?? null)
                    }
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#090B10] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-[#00C2FF]"
                  >
                    <option value="">Urun profili secilmedi</option>
                    {products.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sku} - {item.name}{item.revision ? ` / ${item.revision}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className={`mt-2 text-[11px] font-semibold ${profileReady ? "text-emerald-300" : "text-amber-300"}`}>
                    {profileReady
                      ? `${domainLabel}: ${product?.defect_policy?.operation_stage} / ${configuredDefects.join(", ")}`
                      : `${domainLabel} - Veri toplama modu: Urune ozel operasyon ve kusur kriterleri henuz tanimli degil.`}
                  </p>
                </label>
                {product?.defect_policy?.industry_domain === "battery_assembly" && (
                  <label className="col-span-2 block rounded-xl border border-sky-400/20 bg-sky-400/10 p-3">
                    <span className="text-sky-100/70">Batarya seri kaydi / mevcut asama</span>
                    <select
                      value={batteryUnit?.id ?? ""}
                      onChange={(event) => {
                        const selectedUnit = batteryUnits.find((item) => item.id === event.target.value) ?? null;
                        setBatteryUnit(selectedUnit);
                        if (selectedUnit) setSerial(selectedUnit.serial_number);
                      }}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#090B10] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-[#00C2FF]"
                    >
                      <option value="">Batarya seri kaydi secin</option>
                      {batteryUnits
                        .filter((item) => item.product_id === product.id && item.status !== "completed")
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.serial_number}{item.barcode ? ` / ${item.barcode}` : ""} - Adim {item.current_step}/6 ({item.status})
                          </option>
                        ))}
                    </select>
                    <p className="mt-2 text-[11px] text-sky-100/70">
                      {batteryUnit
                        ? batteryUnit.current_step === 6
                          ? "EOL olcumleri Batarya Izlenebilirlik ekraninda girilmelidir."
                          : `Bu fotograf otomatik olarak adim ${batteryUnit.current_step} kanitina baglanacak; kalite karari insan tarafindan verilecek.`
                        : "Fotograf gondermeden once seri numarali batarya kaydi zorunludur."}
                    </p>
                    {batteryUnit && batteryUnit.current_step <= 5 && <p className={`mt-1 text-[11px] font-semibold ${station ? "text-emerald-300" : "text-red-300"}`}>Istasyon: {station ? `${station.code} - ${station.name}` : `Adim ${batteryUnit.current_step} icin eslesen istasyon yok`}</p>}
                  </label>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#111722] p-4">
              <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-black/25 p-3"><p className="text-white/40">Parca akisi</p><p className="mt-1 font-semibold">{captureMode === "conveyor" ? "Hareketli bant" : captureMode === "handheld" ? "Elde cihaz" : "Sabit istasyon"}</p></div>
                <div className="rounded-xl bg-black/25 p-3"><p className="text-white/40">Yakalma</p><p className="mt-1 font-semibold">{captureStrategy === "stability_gated" ? "Stabilite kapili" : captureStrategy === "external_trigger" ? "Harici tetik" : captureStrategy === "continuous" ? "Surekli akis" : "Manuel"}</p></div>
              </div>
              {captureStrategy === "stability_gated" && (
                <button onClick={enableMotionAssist} type="button" className={`mb-3 w-full rounded-xl border px-3 py-2 text-xs font-semibold ${deviceStable ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-amber-400/30 bg-amber-400/10 text-amber-200"}`}>
                  {!motionEnabled ? "Titresim kontrolunu etkinlestir" : deviceStable ? "Cihaz stabil - cekime hazir" : "Cihazi sabit tutun"}
                </button>
              )}
              <label className="relative flex min-h-[230px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#00C2FF]/35 bg-black/25 p-5 text-center">
                {alignmentOverlayRequired && <div className="pointer-events-none absolute inset-[12%] z-10 rounded-[28px] border-2 border-dashed border-emerald-300/70 shadow-[0_0_0_999px_rgba(0,0,0,0.14)]" />}
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

              {product?.defect_policy?.native_camera_required && (
                <p className="mt-3 rounded-xl border border-sky-400/20 bg-sky-400/10 p-3 text-xs leading-5 text-sky-100/80">
                  Bu profil focus/exposure lock ve otonom tetik icin native CameraX/AVFoundation istemcisi gerektirir. Web ekrani su anda guvenli manuel yedektir.
                </p>
              )}
              {captureMode === "conveyor" && (
                <p className="mt-3 rounded-xl border border-violet-400/20 bg-violet-400/10 p-3 text-xs leading-5 text-violet-100/80">
                  Hareketli bantta deterministik yakalama icin harici sensor/PLC tetigi veya native surekli kare akisi kullanilmalidir.
                </p>
              )}

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
                {profileReady ? "Kalite analizine gonder" : "Veri toplama / kapsam analizine gonder"}
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
                ) : result?.decision === "fail" || result?.decision === "error" || result?.decision === "out_of_scope" ? (
                  <XCircle size={32} />
                ) : (
                  <ShieldCheck size={32} />
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="opacity-55">Kapsam algilama guveni</p>
                  <p className="mt-1 text-xl font-semibold">
                    {result?.decision !== "out_of_scope" && result?.confidence ? `${Math.round(result.confidence * 100)}%` : "--"}
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
                  ? result?.decision === "out_of_scope"
                    ? `Muayene kaydi: ${inspectionId.slice(0, 8)}. Endustriyel metal parca algilanmadi; AI puanlama yapmadi.`
                    : `Muayene kaydi: ${inspectionId.slice(0, 8)}. Bu oran kalite skoru degildir; yalnizca mevcut modelin kapsam algilama guvenidir. Gercek PASS/FAIL, urune ozel kusur modeli ve insan karariyla belirlenir.`
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
