"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Loader2, Save, SlidersHorizontal } from "lucide-react";
import { setupApi } from "@/lib/api";

type InspectionMode = "visual_defect" | "assembly_presence" | "dimensional_assist" | "data_collection";
type IndustryDomain = "steel_equipment" | "battery_assembly";
type CaptureMode = "conveyor" | "fixed_station" | "handheld";
type CaptureStrategy = "manual" | "stability_gated" | "external_trigger" | "continuous";

type Product = {
  id: string;
  sku: string;
  name: string;
  revision?: string | null;
  defect_policy?: {
    industry_domain?: IndustryDomain;
    operation_stage?: string;
    inspection_mode?: InspectionMode;
    capture_mode?: CaptureMode;
    capture_strategy?: CaptureStrategy;
    native_camera_required?: boolean;
    alignment_overlay_required?: boolean;
    defect_classes?: string[];
    human_review_required?: boolean;
    quality_decision_enabled?: boolean;
  };
};

const MODE_LABELS: Record<InspectionMode, string> = {
  data_collection: "Veri toplama / kapsam analizi",
  visual_defect: "Gorsel kusur kontrolu",
  assembly_presence: "Montaj var/yok ve dogru konum",
  dimensional_assist: "Kalibre edilmis olcum destegi",
};

const DOMAIN_PRESETS: Record<IndustryDomain, { label: string; defects: string[] }> = {
  steel_equipment: {
    label: "Celikhane / Haddehane ekipmani",
    defects: ["missing_component", "assembly_misalignment", "weld_anomaly", "machining_burr", "surface_crack", "edge_damage"],
  },
  battery_assembly: {
    label: "Batarya montaj",
    defects: ["missing_cell", "reversed_polarity", "connector_not_seated", "weld_anomaly", "insulation_damage", "foreign_object"],
  },
};

export default function InspectionProfilesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [industryDomain, setIndustryDomain] = useState<IndustryDomain>("steel_equipment");
  const [operationStage, setOperationStage] = useState("");
  const [inspectionMode, setInspectionMode] = useState<InspectionMode>("data_collection");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("fixed_station");
  const [captureStrategy, setCaptureStrategy] = useState<CaptureStrategy>("manual");
  const [nativeCameraRequired, setNativeCameraRequired] = useState(false);
  const [alignmentOverlayRequired, setAlignmentOverlayRequired] = useState(true);
  const [defectText, setDefectText] = useState("");
  const [humanReviewRequired, setHumanReviewRequired] = useState(true);
  const [qualityDecisionEnabled, setQualityDecisionEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => products.find((product) => product.id === selectedId) ?? null,
    [products, selectedId]
  );
  const defectClasses = useMemo(
    () => Array.from(new Set(defectText.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))),
    [defectText]
  );
  const canEnableQuality = inspectionMode !== "data_collection" && operationStage.trim().length >= 2 && defectClasses.length > 0;

  const applyProduct = (product: Product | null) => {
    const policy = product?.defect_policy ?? {};
    setIndustryDomain(policy.industry_domain ?? "steel_equipment");
    setOperationStage(policy.operation_stage ?? "");
    setInspectionMode(policy.inspection_mode ?? "data_collection");
    setCaptureMode(policy.capture_mode ?? "fixed_station");
    setCaptureStrategy(policy.capture_strategy ?? "manual");
    setNativeCameraRequired(policy.native_camera_required ?? false);
    setAlignmentOverlayRequired(policy.alignment_overlay_required ?? true);
    setDefectText((policy.defect_classes ?? []).join(", "));
    setHumanReviewRequired(policy.human_review_required ?? true);
    setQualityDecisionEnabled(policy.quality_decision_enabled ?? false);
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data } = await setupApi.products({ active_only: true });
      const items = data as Product[];
      setProducts(items);
      const firstId = selectedId && items.some((item) => item.id === selectedId) ? selectedId : items[0]?.id ?? "";
      setSelectedId(firstId);
      applyProduct(items.find((item) => item.id === firstId) ?? null);
    } catch {
      toast.error("Urun profilleri yuklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts().catch(() => undefined);
    // The initial request should run once; later refreshes happen after save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeProduct = (productId: string) => {
    setSelectedId(productId);
    applyProduct(products.find((item) => item.id === productId) ?? null);
  };

  const save = async () => {
    if (!selected) return;
    if (operationStage.trim().length < 2) return toast.error("Operasyon asamasi gerekli");
    if (qualityDecisionEnabled && !canEnableQuality) {
      return toast.error("Kalite karari icin gercek kontrol modu ve en az bir kusur sinifi gerekli");
    }
    setSaving(true);
    try {
      const { data } = await setupApi.updateInspectionProfile(selected.id, {
        industry_domain: industryDomain,
        operation_stage: operationStage.trim(),
        inspection_mode: inspectionMode,
        capture_mode: captureMode,
        capture_strategy: captureStrategy,
        native_camera_required: nativeCameraRequired,
        alignment_overlay_required: alignmentOverlayRequired,
        defect_classes: defectClasses,
        human_review_required: humanReviewRequired,
        quality_decision_enabled: qualityDecisionEnabled,
      });
      const updated = data as Product;
      setProducts((items) => items.map((item) => item.id === updated.id ? updated : item));
      applyProduct(updated);
      toast.success("Kontrol profili kaydedildi");
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? "Kontrol profili kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f5f7fb] p-5 md:p-7">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-sky-50 p-3 text-sky-600"><SlidersHorizontal size={24} /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Urun bazli kalite</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-950">Kontrol Profilleri</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Her SKU icin operasyonu ve gercek kusur kriterlerini tanimlayin. Bu profil hazir olmadan model guveni kalite skoru sayilmaz.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={18} /> Profiller yukleniyor</div>
          ) : products.length === 0 ? (
            <p className="text-sm text-slate-500">Aktif urun bulunamadi.</p>
          ) : (
            <div className="space-y-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Urun / SKU</span>
                <select value={selectedId} onChange={(event) => changeProduct(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-sky-500">
                  {products.map((product) => <option key={product.id} value={product.id}>{product.sku} - {product.name}{product.revision ? ` / ${product.revision}` : ""}</option>)}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Fabrika / dataset alani</span>
                  <div className="grid gap-3 md:grid-cols-2">
                    {(Object.keys(DOMAIN_PRESETS) as IndustryDomain[]).map((domain) => (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => {
                          setIndustryDomain(domain);
                          setDefectText(DOMAIN_PRESETS[domain].defects.join(", "));
                          setQualityDecisionEnabled(false);
                        }}
                        className={`rounded-xl border p-4 text-left ${industryDomain === domain ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white"}`}
                      >
                        <span className="block text-sm font-semibold text-slate-900">{DOMAIN_PRESETS[domain].label}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">Ayri dataset ve kusur ontolojisi</span>
                      </button>
                    ))}
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Operasyon asamasi</span>
                  <input value={operationStage} onChange={(event) => setOperationStage(event.target.value)} placeholder="Orn. CNC sonrasi / final montaj" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-sky-500" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Kontrol modu</span>
                  <select value={inspectionMode} onChange={(event) => { const mode = event.target.value as InspectionMode; setInspectionMode(mode); if (mode === "data_collection") setQualityDecisionEnabled(false); }} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-sky-500">
                    {(Object.keys(MODE_LABELS) as InspectionMode[]).map((mode) => <option key={mode} value={mode}>{MODE_LABELS[mode]}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Kusur siniflari (virgulle ayirin)</span>
                <input value={defectText} onChange={(event) => setDefectText(event.target.value)} placeholder="Orn. eksik_delik, capak, kenar_kirigi" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-sky-500" />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Parca akisi</span>
                  <select value={captureMode} onChange={(event) => setCaptureMode(event.target.value as CaptureMode)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-sky-500">
                    <option value="conveyor">Hareketli uretim bandi</option>
                    <option value="fixed_station">Sabit kontrol istasyonu</option>
                    <option value="handheld">Elde tablet / telefon</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Yakalma stratejisi</span>
                  <select value={captureStrategy} onChange={(event) => setCaptureStrategy(event.target.value as CaptureStrategy)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-sky-500">
                    <option value="manual">Operator tetigi</option>
                    <option value="stability_gated">Hareketsizlikte otonom cekim</option>
                    <option value="external_trigger">Harici sensor / PLC tetigi</option>
                    <option value="continuous">Surekli kare akisi</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <span><span className="block text-sm font-semibold text-slate-800">Native kamera istemcisi</span><span className="mt-1 block text-xs text-slate-500">CameraX / AVFoundation donanim kilidi</span></span>
                  <input type="checkbox" checked={nativeCameraRequired} onChange={(event) => setNativeCameraRequired(event.target.checked)} className="h-5 w-5" />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <span><span className="block text-sm font-semibold text-slate-800">Hizalama silueti</span><span className="mt-1 block text-xs text-slate-500">Urun sablonu / bounding guide</span></span>
                  <input type="checkbox" checked={alignmentOverlayRequired} onChange={(event) => setAlignmentOverlayRequired(event.target.checked)} className="h-5 w-5" />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <span><span className="block text-sm font-semibold text-slate-800">Insan incelemesi</span><span className="mt-1 block text-xs text-slate-500">Pilot boyunca onerilir</span></span>
                  <input type="checkbox" checked={humanReviewRequired} onChange={(event) => setHumanReviewRequired(event.target.checked)} className="h-5 w-5" />
                </label>
                <label className={`flex items-center justify-between rounded-xl border p-4 ${canEnableQuality ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  <span><span className="block text-sm font-semibold text-slate-800">Kalite kararini etkinlestir</span><span className="mt-1 block text-xs text-slate-500">Profil ve egitilmis model dogrulandiktan sonra</span></span>
                  <input type="checkbox" checked={qualityDecisionEnabled} disabled={!canEnableQuality} onChange={(event) => setQualityDecisionEnabled(event.target.checked)} className="h-5 w-5" />
                </label>
              </div>

              <div className={`flex gap-3 rounded-xl border p-4 ${qualityDecisionEnabled ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                {qualityDecisionEnabled ? <CheckCircle2 className="shrink-0 text-emerald-600" size={20} /> : <AlertTriangle className="shrink-0 text-amber-600" size={20} />}
                <p className="text-sm leading-6 text-slate-700">
                  {qualityDecisionEnabled ? "Profil kalite karari icin etkin. Pilot modunda insan incelemesi yine uygulanir." : "Bu urun veri toplama modunda. AI sonucu kapsam sinyali olarak kaydedilir, kalite skoru sayilmaz."}
                </p>
              </div>

              <button onClick={save} disabled={saving || !selected} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />} Profili kaydet
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
