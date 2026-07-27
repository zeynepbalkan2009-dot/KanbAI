"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Activity,
  BatteryMedium,
  Camera,
  CheckCircle2,
  Clock3,
  Copy,
  Factory,
  KeyRound,
  MapPin,
  Power,
  RefreshCw,
  ShieldCheck,
  TabletSmartphone,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { devicesApi, setupApi } from "@/lib/api";

type Device = {
  id: string;
  device_uuid: string;
  name: string;
  location_label?: string;
  is_active: boolean;
  last_seen_at?: string;
  firmware_version?: string;
  status: string;
  station_id?: string;
  activated_at?: string;
  created_at: string;
};

type Station = {
  id: string;
  name: string;
  code?: string;
  status?: string;
};

type ActivationToken = {
  activation_token: string;
  expires_at: string;
  station_id?: string;
};

function statusTone(status?: string, active?: boolean) {
  if (!active || status === "revoked") return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  if (status === "online" || status === "active") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  return "border-amber-500/25 bg-amber-500/10 text-amber-300";
}

function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111722] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{caption}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${tone}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function QRMosaic({ token }: { token: string }) {
  const cells = useMemo(() => {
    const seed = token || "kanbai";
    return Array.from({ length: 81 }, (_, index) => {
      const charCode = seed.charCodeAt(index % seed.length);
      const finder =
        (index < 21 && index % 9 < 3) ||
        (index % 9 > 5 && index < 27) ||
        (index > 53 && index % 9 < 3);
      return finder || ((charCode + index * 17) % 5 < 2);
    });
  }, [token]);

  return (
    <div className="grid h-32 w-32 grid-cols-9 gap-1 rounded-2xl border border-white/10 bg-white p-3">
      {cells.map((on, index) => (
        <div key={index} className={`rounded-[2px] ${on ? "bg-[#090B10]" : "bg-transparent"}`} />
      ))}
    </div>
  );
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [label, setLabel] = useState("Line 1 / Station 3 tablet");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [activation, setActivation] = useState<ActivationToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [deviceRes, stationRes] = await Promise.all([
        devicesApi.list(),
        setupApi.stations({ active_only: true }),
      ]);
      setDevices(deviceRes.data);
      setStations(stationRes.data);
      if (!selectedStation && stationRes.data.length > 0) setSelectedStation(stationRes.data[0].id);
    } catch {
      toast.error("Factory device data could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [selectedStation]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onlineCount = devices.filter((device) => device.is_active && ["online", "active"].includes(device.status)).length;
  const revokedCount = devices.filter((device) => !device.is_active || device.status === "revoked").length;
  const stationCoverage = stations.length ? Math.round((new Set(devices.map((d) => d.station_id).filter(Boolean)).size / stations.length) * 100) : 0;

  const activationUrl = activation
    ? `${typeof window !== "undefined" ? window.location.origin : "http://localhost"}/activate-device?token=${encodeURIComponent(activation.activation_token)}`
    : "";

  const createToken = async () => {
    setCreating(true);
    try {
      const { data } = await devicesApi.createActivationToken({
        station_id: selectedStation || undefined,
        label,
        expires_in_hours: expiresInHours,
      });
      setActivation(data);
      toast.success("Activation token created");
    } catch {
      toast.error("Activation token could not be created");
    } finally {
      setCreating(false);
    }
  };

  const copyText = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error("Clipboard is unavailable");
    }
  };

  const revoke = async (id: string) => {
    try {
      await devicesApi.revoke(id);
      toast.success("Device revoked");
      loadAll();
    } catch {
      toast.error("Device could not be revoked");
    }
  };

  const heartbeat = async (id: string) => {
    try {
      await devicesApi.heartbeat(id);
      toast.success("Heartbeat sent");
      loadAll();
    } catch {
      toast.error("Heartbeat failed");
    }
  };

  return (
    <div className="min-h-full bg-[#090B10] p-4 text-slate-200 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-white/10 bg-[#111722] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.32)] md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[#00C2FF]/30 bg-[#00C2FF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">
                  Factory Device CRM
                </span>
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Pilot station setup
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Device Activation Center
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Manage tablets, camera stations, activation tokens and factory readiness from one familiar operations workspace.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadAll}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07] disabled:opacity-60"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <Link
                href="/dashboard/capture"
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400"
              >
                <Camera size={16} />
                Open Capture
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Registered devices" value={devices.length} caption="Factory tablets and cameras" icon={TabletSmartphone} tone="bg-[#00C2FF]/10 text-sky-300" />
          <MetricCard label="Online or active" value={onlineCount} caption="Ready for inspection" icon={Wifi} tone="bg-emerald-500/10 text-emerald-300" />
          <MetricCard label="Station coverage" value={`${stationCoverage}%`} caption={`${stations.length} active stations`} icon={Factory} tone="bg-[#FF7A00]/10 text-orange-300" />
          <MetricCard label="Revoked" value={revokedCount} caption="Blocked devices" icon={XCircle} tone="bg-rose-500/10 text-rose-300" />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Activation workflow</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Pair a tablet with a station</h2>
              </div>
              <div className="rounded-xl border border-[#00C2FF]/25 bg-[#00C2FF]/10 p-2 text-sky-300">
                <KeyRound size={18} />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs text-slate-500">Station</span>
                <select
                  value={selectedStation}
                  onChange={(event) => setSelectedStation(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0D121B] px-3 py-3 text-sm text-white outline-none focus:border-[#00C2FF]"
                >
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name} {station.code ? `- ${station.code}` : ""}
                    </option>
                  ))}
                  {stations.length === 0 && <option value="">No station found</option>}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs text-slate-500">Activation label</span>
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0D121B] px-3 py-3 text-sm text-white outline-none focus:border-[#00C2FF]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs text-slate-500">Token expiry</span>
                <div className="grid grid-cols-3 gap-2">
                  {[8, 24, 72].map((hours) => (
                    <button
                      key={hours}
                      onClick={() => setExpiresInHours(hours)}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        expiresInHours === hours
                          ? "border-[#FF7A00]/40 bg-[#FF7A00]/15 text-orange-300"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                      }`}
                    >
                      {hours}h
                    </button>
                  ))}
                </div>
              </label>

              <button
                onClick={createToken}
                disabled={creating || stations.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF7A00] px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? <RefreshCw size={16} className="animate-spin" /> : <KeyRound size={16} />}
                Create activation token
              </button>
            </div>

            {activation && (
              <div className="mt-5 rounded-2xl border border-[#00C2FF]/20 bg-[#00C2FF]/10 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <QRMosaic token={activation.activation_token} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">Activation card</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Open this link on the tablet, or copy the token into the activation form.
                    </p>
                    <div className="mt-3 rounded-xl border border-white/10 bg-[#090B10] p-3">
                      <p className="break-all font-mono text-xs text-sky-200">{activation.activation_token}</p>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Expires: {new Date(activation.expires_at).toLocaleString("tr-TR")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => copyText(activation.activation_token, "Activation token copied")}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.07]"
                      >
                        <Copy size={14} />
                        Copy token
                      </button>
                      <button
                        onClick={() => copyText(activationUrl, "Activation link copied")}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.07]"
                      >
                        <Copy size={14} />
                        Copy link
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#111722] p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Device fleet</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Registered factory endpoints</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
                {devices.length} records
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {devices.map((device) => (
                <div key={device.id} className="rounded-2xl border border-white/10 bg-[#0D121B] p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${statusTone(device.status, device.is_active)}`}>
                          {device.is_active ? device.status : "revoked"}
                        </span>
                        <span className="font-mono text-xs text-slate-500">{device.device_uuid}</span>
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-white">{device.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {device.location_label || "No station label"}</span>
                        <span className="inline-flex items-center gap-1.5"><Clock3 size={13} /> {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString("tr-TR") : "No heartbeat yet"}</span>
                        <span className="inline-flex items-center gap-1.5"><BatteryMedium size={13} /> FW {device.firmware_version || "demo"}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => heartbeat(device.id)}
                        disabled={!device.is_active}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.07] disabled:opacity-50"
                      >
                        <Activity size={14} />
                        Heartbeat
                      </button>
                      <button
                        onClick={() => revoke(device.id)}
                        disabled={!device.is_active}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-50"
                      >
                        <Power size={14} />
                        Revoke
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {devices.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-12 text-center">
                  <TabletSmartphone size={28} className="text-slate-500" />
                  <p className="mt-3 text-sm font-semibold text-white">No registered devices</p>
                  <p className="mt-1 text-xs text-slate-500">Create an activation token to pair the first tablet.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {stations.map((station) => {
            const stationDevices = devices.filter((device) => device.station_id === station.id);
            const stationOnline = stationDevices.some((device) => device.is_active && ["online", "active"].includes(device.status));
            return (
              <div key={station.id} className="rounded-3xl border border-white/10 bg-[#111722] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{station.code || "Station"}</p>
                    <h3 className="mt-2 text-base font-semibold text-white">{station.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{stationDevices.length} paired device</p>
                  </div>
                  <div className={`rounded-xl p-2 ${stationOnline ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                    {stationOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-[#090B10] px-4 py-3 text-sm">
                  <span className="text-slate-500">Readiness</span>
                  <span className={stationOnline ? "font-semibold text-emerald-300" : "font-semibold text-amber-300"}>
                    {stationOnline ? "Ready" : "Needs pairing"}
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
