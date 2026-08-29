"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BatteryCharging, CheckCircle2, CircleDashed, ClipboardCheck, Factory,
  Plus, RefreshCw, ShieldAlert, XCircle,
} from "lucide-react";
import { batteryApi, setupApi } from "@/lib/api";

type StepDefinition = {
  step_id: number; code: string; name: string; expected_label: string; evidence_type: string;
  criteria: Array<{ id: string; label: string }>;
};
type Evidence = {
  id: string; step_id: number; step_name: string; expected_label: string; attempt_no: number;
  status: "awaiting_review" | "accepted" | "rejected"; human_decision?: "pass" | "fail" | null;
  observed_label?: string | null; notes?: string | null; criteria_results?: Record<string, "pass" | "fail">;
  test_results?: Record<string, unknown>;
};
type BatteryUnit = {
  id: string; product_id: string; production_line_id?: string | null; serial_number: string;
  barcode?: string | null; cell_type: "prismatic" | "cylindrical" | "pouch";
  status: string; current_step: number; expected_cell_count: number; created_at: string; steps?: Evidence[];
  cells?: Array<{ id: string; cell_identifier: string; position_code: string; declared_cell_type: string; detected_cell_type?: string | null; verification_status: string }>;
};
type Product = { id: string; sku: string; name: string; revision?: string; defect_policy?: { industry_domain?: string } };
type Resource = { id: string; code?: string; name: string };

const emptyEol = {
  voltage_v: "", insulation_resistance_mohm: "", capacity_ah: "",
  leak_test_passed: false, charge_discharge_passed: false, electrical_safety_passed: false,
  tester_id: "", tested_at: "", test_report_id: "",
};

function statusTone(status: string) {
  if (status === "completed" || status === "accepted") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "blocked_by_quality" || status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function BatteryWorkflowPage() {
  const [steps, setSteps] = useState<StepDefinition[]>([]);
  const [units, setUnits] = useState<BatteryUnit[]>([]);
  const [selected, setSelected] = useState<BatteryUnit | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<Resource[]>([]);
  const [stations, setStations] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serial, setSerial] = useState("");
  const [barcode, setBarcode] = useState("");
  const [cellType, setCellType] = useState<"prismatic" | "cylindrical" | "pouch">("prismatic");
  const [expectedCellCount, setExpectedCellCount] = useState("1");
  const [productId, setProductId] = useState("");
  const [lineId, setLineId] = useState("");
  const [stationId, setStationId] = useState("");
  const [inspectionId, setInspectionId] = useState("");
  const [observedLabel, setObservedLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [criteriaResults, setCriteriaResults] = useState<Record<string, "" | "pass" | "fail">>({});
  const [eol, setEol] = useState(emptyEol);
  const [cellIdentifier, setCellIdentifier] = useState("");
  const [cellPosition, setCellPosition] = useState("");
  const [cellMismatchReason, setCellMismatchReason] = useState("");

  const batteryProducts = useMemo(
    () => products.filter((item) => item.defect_policy?.industry_domain === "battery_assembly"),
    [products],
  );
  const currentDefinition = steps.find((item) => item.step_id === selected?.current_step);
  const pendingEvidence = selected?.steps?.find(
    (item) => item.step_id === selected.current_step && item.status === "awaiting_review",
  );

  const loadDetail = useCallback(async (id: string) => {
    const response = await batteryApi.getUnit(id);
    setSelected(response.data);
    const definition = steps.find((item) => item.step_id === response.data.current_step);
    setObservedLabel(definition?.expected_label ?? "");
    setCriteriaResults(Object.fromEntries((definition?.criteria ?? []).map((criterion) => [criterion.id, ""])));
  }, [steps]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [workflowRes, unitsRes, productsRes, linesRes, stationsRes] = await Promise.all([
        batteryApi.workflow(), batteryApi.units({ limit: 100 }), setupApi.products({ active_only: true }),
        setupApi.productionLines({ active_only: true }), setupApi.stations({ active_only: true }),
      ]);
      setSteps(workflowRes.data.steps);
      setUnits(unitsRes.data);
      setProducts(productsRes.data);
      setLines(linesRes.data);
      setStations(stationsRes.data);
      setProductId((value) => value || productsRes.data.find((item: Product) => item.defect_policy?.industry_domain === "battery_assembly")?.id || "");
      if (selected?.id) await loadDetail(selected.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? "Batarya akisi yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, [loadDetail, selected?.id]);

  useEffect(() => { load(); }, []);

  const createUnit = async () => {
    if (!productId || !serial.trim()) return toast.error("Batarya urunu ve seri numarasi gerekli");
    setSaving(true);
    try {
      const response = await batteryApi.createUnit({
        product_id: productId, production_line_id: lineId || undefined,
        serial_number: serial.trim(), barcode: barcode.trim() || undefined, cell_type: cellType,
        expected_cell_count: Number(expectedCellCount),
      });
      toast.success("Batarya izlenebilirlik kaydi olusturuldu");
      setSerial(""); setBarcode("");
      await load();
      await loadDetail(response.data.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? "Kayit olusturulamadi");
    } finally { setSaving(false); }
  };

  const registerCell = async () => {
    if (!selected || !cellIdentifier.trim() || !cellPosition.trim()) return toast.error("Hucre barkodu ve pozisyonu gerekli");
    setSaving(true);
    try {
      await batteryApi.registerCell(selected.id, {
        cell_identifier: cellIdentifier.trim(), position_code: cellPosition.trim(), declared_cell_type: selected.cell_type,
      });
      setCellIdentifier(""); setCellPosition("");
      toast.success("Hucre insan dogrulamasina kaydedildi");
      await loadDetail(selected.id);
    } catch (error: any) { toast.error(error?.response?.data?.detail ?? "Hucre kaydedilemedi"); }
    finally { setSaving(false); }
  };

  const verifyCell = async (cellId: string, decision: "match" | "mismatch") => {
    if (decision === "mismatch" && !cellMismatchReason.trim()) return toast.error("Uyusmazlik nedeni gerekli");
    setSaving(true);
    try {
      await batteryApi.verifyCell(cellId, { decision, mismatch_reason: decision === "mismatch" ? cellMismatchReason.trim() : undefined });
      setCellMismatchReason("");
      toast.success("Hucre dogrulamasi kaydedildi");
      if (selected) await loadDetail(selected.id);
    } catch (error: any) { toast.error(error?.response?.data?.detail ?? "Dogrulama kaydedilemedi"); }
    finally { setSaving(false); }
  };

  const addEvidence = async () => {
    if (!selected || !currentDefinition) return;
    if (!stationId) return toast.error("Kanit icin istasyon secimi gerekli");
    if (currentDefinition.step_id <= 5 && !inspectionId.trim()) return toast.error("Gorsel asamalar icin muayene UUID gerekli");
    if (currentDefinition.step_id === 6 && (!eol.voltage_v || !eol.insulation_resistance_mohm || !eol.capacity_ah || !eol.tester_id.trim() || !eol.tested_at)) {
      return toast.error("EOL icin olcumler, test cihazi ve test zamani gerekli");
    }
    const testResults = currentDefinition.step_id === 6
      ? {
          voltage_v: Number(eol.voltage_v), insulation_resistance_mohm: Number(eol.insulation_resistance_mohm),
          capacity_ah: Number(eol.capacity_ah), leak_test_passed: eol.leak_test_passed,
          charge_discharge_passed: eol.charge_discharge_passed,
          electrical_safety_passed: eol.electrical_safety_passed, tester_id: eol.tester_id.trim(),
          tested_at: new Date(eol.tested_at).toISOString(), test_report_id: eol.test_report_id.trim() || undefined,
        }
      : {};
    setSaving(true);
    try {
      await batteryApi.addEvidence(selected.id, currentDefinition.step_id, {
        station_id: stationId || undefined, inspection_id: inspectionId.trim() || undefined,
        observed_label: observedLabel || currentDefinition.expected_label, notes: notes || undefined,
        test_results: testResults,
      });
      toast.success("Kanit insan incelemesine gonderildi");
      await loadDetail(selected.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? "Kanit kaydedilemedi");
    } finally { setSaving(false); }
  };

  const review = async (decision: "pass" | "fail") => {
    if (!selected || !pendingEvidence) return;
    if (!currentDefinition?.criteria.every((criterion) => criteriaResults[criterion.id] === "pass" || criteriaResults[criterion.id] === "fail")) {
      return toast.error("Tum kontrol kriterleri icin PASS veya FAIL secin");
    }
    const failedCriteria = currentDefinition.criteria.filter((criterion) => criteriaResults[criterion.id] === "fail");
    if (decision === "pass" && failedCriteria.length) return toast.error("Basarisiz kriter varken asama PASS olamaz");
    if (decision === "fail" && !failedCriteria.length) return toast.error("FAIL karari icin en az bir kriteri FAIL secin");
    setSaving(true);
    try {
      await batteryApi.reviewEvidence(pendingEvidence.id, {
        decision, observed_label: observedLabel || pendingEvidence.expected_label, notes: notes || undefined,
        criteria_results: criteriaResults as Record<string, "pass" | "fail">,
      });
      toast.success(decision === "pass" ? "Asama insan tarafindan onaylandi" : "Batarya kalite blokajina alindi");
      await load();
      await loadDetail(selected.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? "Karar kaydedilemedi");
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-full bg-[#f5f7fb] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase text-sky-600">Battery traceability</p><h1 className="mt-1 text-3xl font-semibold">Batarya Montaj Akisi</h1><p className="mt-1 text-sm text-slate-500">Alti asamali kanit ve insan karar kaydi. Otomatik kalite karari kapali.</p></div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/> Yenile</button>
        </header>

        <section className="grid gap-3 md:grid-cols-6">
          {steps.map((step) => <div key={step.step_id} className="rounded-xl border bg-white p-3"><p className="text-xs text-sky-600">ADIM {step.step_id}</p><p className="mt-1 text-sm font-semibold">{step.name}</p><p className="mt-2 text-xs text-slate-500">{step.expected_label}</p></div>)}
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Plus size={18}/> Yeni batarya kaydi</h2>
          <div className="grid gap-3 md:grid-cols-6">
            <select value={productId} onChange={(e)=>setProductId(e.target.value)} className="rounded-lg border px-3 py-2"><option value="">Batarya urunu</option>{batteryProducts.map(p=><option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}</select>
            <input value={serial} onChange={(e)=>setSerial(e.target.value)} placeholder="Seri numarasi" className="rounded-lg border px-3 py-2"/>
            <input value={barcode} onChange={(e)=>setBarcode(e.target.value)} placeholder="Barkod / QR referansi" className="rounded-lg border px-3 py-2"/>
            <select value={cellType} onChange={(e)=>setCellType(e.target.value as typeof cellType)} className="rounded-lg border px-3 py-2"><option value="prismatic">Prizmatik</option><option value="cylindrical">Silindirik</option><option value="pouch">Pouch</option></select>
            <input type="number" min="1" max="10000" value={expectedCellCount} onChange={(e)=>setExpectedCellCount(e.target.value)} placeholder="Hucre adedi" className="rounded-lg border px-3 py-2"/>
            <select value={lineId} onChange={(e)=>setLineId(e.target.value)} className="rounded-lg border px-3 py-2"><option value="">Uretim hatti</option>{lines.map(l=><option key={l.id} value={l.id}>{l.code} - {l.name}</option>)}</select>
          </div>
          <button disabled={saving} onClick={createUnit} className="mt-4 rounded-lg bg-[#FF7A00] px-5 py-2 text-sm font-semibold text-black disabled:opacity-50">Kaydi olustur</button>
        </section>

        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <section className="rounded-2xl border bg-white p-3 shadow-sm">
            <h2 className="px-2 py-2 font-semibold">Batarya kayitlari</h2>
            <div className="space-y-2">{units.map(unit=><button key={unit.id} onClick={()=>loadDetail(unit.id)} className={`w-full rounded-xl border p-3 text-left ${selected?.id===unit.id?"border-sky-400 bg-sky-50":"hover:bg-slate-50"}`}><div className="flex justify-between"><span className="font-mono text-sm">{unit.serial_number}</span><span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusTone(unit.status)}`}>{unit.status}</span></div><p className="mt-2 text-xs text-slate-500">{unit.cell_type} · adim {unit.current_step}/6</p></button>)}</div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            {!selected ? <div className="py-20 text-center text-slate-400"><BatteryCharging className="mx-auto mb-3"/>Bir batarya kaydi secin</div> : <>
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-lg font-semibold">{selected.serial_number}</p><p className="text-sm text-slate-500">{selected.barcode || "Barkod yok"} · {selected.cell_type}</p></div><span className={`rounded-full border px-3 py-1 text-xs ${statusTone(selected.status)}`}>{selected.status}</span></div>
              <div className="mt-5 grid gap-2 sm:grid-cols-6">{steps.map(step=>{const evidence=selected.steps?.filter(e=>e.step_id===step.step_id).at(-1); const active=selected.current_step===step.step_id; return <div key={step.step_id} className={`rounded-xl border p-3 ${active?"border-sky-400 bg-sky-50":""}`}>{evidence?.status==="accepted"?<CheckCircle2 className="text-emerald-600" size={18}/>:evidence?.status==="rejected"?<XCircle className="text-red-600" size={18}/>:<CircleDashed className="text-slate-400" size={18}/>}<p className="mt-2 text-xs font-semibold">{step.step_id}. {step.name}</p><p className="mt-1 text-[11px] text-slate-500">{evidence?.status || (active?"kanit bekleniyor":"sirada")}</p></div>})}</div>

              {selected.current_step === 1 && <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4">
                <h3 className="font-semibold text-sky-900">Incoming hucre kimligi ({selected.cells?.length ?? 0}/{selected.expected_cell_count})</h3>
                <p className="mt-1 text-xs text-sky-700">Barkod, fiziksel pozisyon ve tip insan tarafindan dogrulanmadan 1. asama PASS olamaz.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input value={cellIdentifier} onChange={e=>setCellIdentifier(e.target.value)} placeholder="Hucre barkod / QR" className="rounded-lg border bg-white px-3 py-2"/><input value={cellPosition} onChange={e=>setCellPosition(e.target.value)} placeholder="Pozisyon (orn. M1-C01)" className="rounded-lg border bg-white px-3 py-2"/><button disabled={saving} onClick={registerCell} className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white">Hucre ekle</button></div>
                <input value={cellMismatchReason} onChange={e=>setCellMismatchReason(e.target.value)} placeholder="Uyusmazlik nedeni (mismatch icin)" className="mt-2 w-full rounded-lg border bg-white px-3 py-2"/>
                <div className="mt-3 space-y-2">{selected.cells?.map(cell=><div key={cell.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3 text-sm"><div><b>{cell.position_code}</b> · {cell.cell_identifier}<p className="text-xs text-slate-500">Beyan: {cell.declared_cell_type} · {cell.verification_status}</p></div>{cell.verification_status==="awaiting_human"&&<div className="flex gap-2"><button onClick={()=>verifyCell(cell.id,"match")} className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Eslesiyor</button><button onClick={()=>verifyCell(cell.id,"mismatch")} className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white">Uyusmuyor</button></div>}</div>)}</div>
              </div>}

              {selected.status !== "completed" && currentDefinition && <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="flex items-center gap-2 font-semibold"><ClipboardCheck size={18}/>{currentDefinition.name}</h3>
                <p className="mt-1 text-xs text-slate-500">Beklenen referans: {currentDefinition.expected_label}. Son karar insana aittir.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <select value={stationId} onChange={(e)=>setStationId(e.target.value)} className="rounded-lg border bg-white px-3 py-2"><option value="">Istasyon secilmedi</option>{stations.map(s=><option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}</select>
                  <input value={inspectionId} onChange={(e)=>setInspectionId(e.target.value)} placeholder={currentDefinition.step_id <= 5 ? "Muayene UUID (zorunlu)" : "Muayene UUID (opsiyonel)"} className="rounded-lg border px-3 py-2"/>
                  <input value={observedLabel} onChange={(e)=>setObservedLabel(e.target.value)} placeholder="Gozlenen etiket" className="rounded-lg border px-3 py-2"/>
                  <input value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Operator / kalite notu" className="rounded-lg border px-3 py-2"/>
                </div>
                {currentDefinition.step_id===6 && <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <input value={eol.voltage_v} onChange={e=>setEol({...eol,voltage_v:e.target.value})} placeholder="Voltaj (V)" type="number" step="any" className="rounded-lg border px-3 py-2"/>
                  <input value={eol.insulation_resistance_mohm} onChange={e=>setEol({...eol,insulation_resistance_mohm:e.target.value})} placeholder="Izolasyon (MOhm)" type="number" step="any" className="rounded-lg border px-3 py-2"/>
                  <input value={eol.capacity_ah} onChange={e=>setEol({...eol,capacity_ah:e.target.value})} placeholder="Kapasite (Ah)" type="number" step="any" className="rounded-lg border px-3 py-2"/>
                  <input value={eol.tester_id} onChange={e=>setEol({...eol,tester_id:e.target.value})} placeholder="Test cihazi kimligi" className="rounded-lg border px-3 py-2"/>
                  <input value={eol.tested_at} onChange={e=>setEol({...eol,tested_at:e.target.value})} type="datetime-local" aria-label="Test zamani" className="rounded-lg border px-3 py-2"/>
                  <input value={eol.test_report_id} onChange={e=>setEol({...eol,test_report_id:e.target.value})} placeholder="Test raporu / MES referansi (opsiyonel)" className="rounded-lg border px-3 py-2"/>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={eol.leak_test_passed} onChange={e=>setEol({...eol,leak_test_passed:e.target.checked})}/> Sizdirmazlik sonucu: PASS</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={eol.charge_discharge_passed} onChange={e=>setEol({...eol,charge_discharge_passed:e.target.checked})}/> Sarj-desarj sonucu: PASS</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={eol.electrical_safety_passed} onChange={e=>setEol({...eol,electrical_safety_passed:e.target.checked})}/> Elektriksel guvenlik: PASS</label>
                  <p className="text-xs text-slate-500 md:col-span-3">Isaretlenmeyen testler FAIL sonucu olarak kaydedilir. Sistem otomatik kalite karari vermez; son karar insan incelemesindedir.</p>
                </div>}
                {!pendingEvidence ? <button disabled={saving} onClick={addEvidence} className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Kaniti incelemeye gonder</button> : <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-800"><ShieldAlert size={17}/> Insan karari bekleniyor</p>
                  {currentDefinition.step_id <= 5 && <p className="mt-2 text-xs text-amber-800">Once bagli fotografi Inceleme Kuyrugu'nda etiketleyin. Asama karari bu HITL karariyla ayni olmalidir.</p>}
                  <div className="mt-3 grid gap-2">{currentDefinition.criteria.map((criterion)=><label key={criterion.id} className="grid gap-2 rounded-lg border border-amber-200 bg-white p-3 text-sm sm:grid-cols-[1fr_150px] sm:items-center"><span>{criterion.label}</span><select value={criteriaResults[criterion.id] ?? ""} onChange={(event)=>setCriteriaResults({...criteriaResults,[criterion.id]:event.target.value as ""|"pass"|"fail"})} className="rounded border px-2 py-1"><option value="">Secin</option><option value="pass">PASS</option><option value="fail">FAIL</option></select></label>)}</div>
                  <div className="mt-3 flex gap-2"><button disabled={saving} onClick={()=>review("pass")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">PASS - asamayi onayla</button><button disabled={saving} onClick={()=>review("fail")} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">FAIL - kalite blokaji</button></div>
                </div>}
              </div>}
            </>}
          </section>
        </div>
      </div>
    </div>
  );
}
