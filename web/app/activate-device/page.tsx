"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowRight,
  CheckCircle2,
  Factory,
  KeyRound,
  Loader2,
  TabletSmartphone,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { devicesApi } from "@/lib/api";

function makeDeviceUuid() {
  if (typeof localStorage === "undefined") return "TABLET-PENDING";
  const stored = localStorage.getItem("kanbai_device_uuid");
  if (stored) return stored;
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8).toUpperCase()
    : String(Date.now()).slice(-8);
  const generated = `TABLET-${suffix}`;
  localStorage.setItem("kanbai_device_uuid", generated);
  return generated;
}

function ActivateDeviceForm() {
  const params = useSearchParams();
  const initialToken = params.get("token") || "";
  const [token, setToken] = useState(initialToken);
  const [deviceUuid, setDeviceUuid] = useState("TABLET-PENDING");
  const [name, setName] = useState("Factory Floor Tablet");
  const [location, setLocation] = useState("Line 1 / Station 3");
  const [activating, setActivating] = useState(false);
  const [activatedDeviceId, setActivatedDeviceId] = useState<string | null>(null);

  useEffect(() => {
    setDeviceUuid(makeDeviceUuid());
  }, []);

  const tokenPreview = useMemo(() => {
    if (!token) return "No token provided";
    return `${token.slice(0, 12)}...${token.slice(-6)}`;
  }, [token]);
  const setupRows: Array<{ label: string; value: string; icon: LucideIcon }> = [
    { label: "Token", value: tokenPreview, icon: KeyRound },
    { label: "Device UUID", value: deviceUuid, icon: TabletSmartphone },
    { label: "Network", value: typeof navigator !== "undefined" && navigator.onLine ? "Online" : "Offline", icon: Wifi },
  ];

  const activate = async () => {
    if (!token.trim()) return toast.error("Activation token is required");
    setActivating(true);
    try {
      const { data } = await devicesApi.activate({
        activation_token: token.trim(),
        device_uuid: deviceUuid,
        name,
        firmware_version: "kanbai-pwa-demo",
        location_label: location,
      });
      setActivatedDeviceId(data.id);
      toast.success("Device activated");
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? "Activation failed");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090B10] p-4 text-slate-200 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/10 bg-[#111722] shadow-[0_32px_140px_rgba(0,0,0,0.42)] xl:grid-cols-[0.9fr_1.1fr]">
          <section className="border-b border-white/10 bg-[#090B10] p-6 md:p-8 xl:border-b-0 xl:border-r">
            <div className="inline-flex rounded-full border border-[#00C2FF]/30 bg-[#00C2FF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">
              KanbAI device onboarding
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Pair this tablet with the factory.
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Use this secure activation flow on the device that will capture inspections. After activation, the tablet can open the operator capture workspace.
            </p>

            <div className="mt-8 space-y-3">
              {setupRows.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-300">
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="mt-1 truncate font-mono text-sm text-white">{String(value)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="p-6 md:p-8">
            {!activatedDeviceId ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-[#FF7A00]/25 bg-[#FF7A00]/10 p-3 text-orange-300">
                    <Factory size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Factory endpoint setup</p>
                    <p className="text-xs text-slate-500">Confirm tablet identity before capture.</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs text-slate-500">Activation token</span>
                    <textarea
                      value={token}
                      onChange={(event) => setToken(event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-white/10 bg-[#0D121B] px-3 py-3 font-mono text-sm text-white outline-none focus:border-[#00C2FF]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs text-slate-500">Device name</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0D121B] px-3 py-3 text-sm text-white outline-none focus:border-[#00C2FF]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs text-slate-500">Location label</span>
                    <input
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0D121B] px-3 py-3 text-sm text-white outline-none focus:border-[#00C2FF]"
                    />
                  </label>

                  <button
                    onClick={activate}
                    disabled={activating}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF7A00] px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {activating ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                    Activate device
                  </button>
                </div>
              </>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-emerald-300">
                  <CheckCircle2 size={42} />
                </div>
                <h2 className="mt-6 text-3xl font-semibold text-white">Device activated</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                  This tablet is now paired with the factory account and can start capturing inspections.
                </p>
                <Link
                  href="/dashboard/capture"
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-400"
                >
                  Open capture
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function ActivateDevicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090B10]" />}>
      <ActivateDeviceForm />
    </Suspense>
  );
}
