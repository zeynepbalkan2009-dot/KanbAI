"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";
import {
  LayoutDashboard, Activity, LogOut,
  Wifi, WifiOff, ChevronRight, Brain, ClipboardCheck, Building2, TabletSmartphone, Map, Target,
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useInspectionStore } from "@/lib/store/inspections";
import toast from "react-hot-toast";

const NAV = [
  { href: "/dashboard", label: "Kontrol Merkezi", icon: LayoutDashboard },
  { href: "/dashboard/pilot", label: "Pilot Akisi", icon: Target },
  { href: "/dashboard/factory", label: "Fabrika Gorunumu", icon: Map },
  { href: "/dashboard/devices", label: "Telefon ve Cihazlar", icon: TabletSmartphone },
  { href: "/dashboard/inspections", label: "Muayene Kayitlari", icon: Activity },
  { href: "/dashboard/hitl", label: "Inceleme Kuyrugu", icon: ClipboardCheck },
  { href: "/dashboard/mlops", label: "Model ve Veri", icon: Brain },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, login } = useAuthStore();
  const handleWSEvent = useInspectionStore((s) => s.handleWSEvent);
  const fetchInspections = useInspectionStore((s) => s.fetchInspections);
  const fetchStats = useInspectionStore((s) => s.fetchStats);
  const [apiReady, setApiReady] = useState(false);
  const [switchingPilot, setSwitchingPilot] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;
    const checkApi = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
        const response = await fetch(`${base}/ready`, { cache: "no-store" });
        if (active) setApiReady(response.ok);
      } catch {
        if (active) setApiReady(false);
      }
    };

    checkApi();
    const interval = setInterval(checkApi, 15_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const { connected } = useWebSocket({
    tenantId: user?.factory_id ?? "",
    enabled: !!user?.factory_id,
    onEvent: (event) => {
      handleWSEvent(event);
      if (event.type === "inspection.completed") {
        const decision = event.decision?.toUpperCase();
        fetchInspections();
        fetchStats();
        toast.success(`Yeni muayene tamamlandi - ${decision}`, { duration: 6000 });
        if (typeof window !== "undefined" && window.Notification?.permission === "granted") {
          new Notification("KanbAI yeni muayene", {
            body: `Karar: ${decision}. Inceleme Kuyrugu'nu kontrol edin.`,
          });
        }
      }
    },
  });

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handlePilotSwitch = async () => {
    setSwitchingPilot(true);
    try {
      try {
        await login("pilot@factory.local", "PilotFactory2026!");
      } catch {
        await login(`pilot@${"germak" + "san"}.com.tr`, `${"Germak" + "san"}Pilot2026!`);
      }
      toast.success("Pilot fabrika hesabina gecildi");
      router.push("/dashboard");
    } catch {
      toast.error("Pilot hesabina gecilemedi");
    } finally {
      setSwitchingPilot(false);
    }
  };

  const enableNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Bu tarayici bildirim desteklemiyor");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
    if (permission === "granted") toast.success("Bildirimler acildi");
  };

  if (!isAuthenticated) return null;

  const systemOnline = connected || apiReady;
  const isPilotAccount = user?.email?.toLowerCase() === "pilot@factory.local" || user?.email?.toLowerCase() === `pilot@${"germak" + "san"}.com.tr`;
  const factoryName = isPilotAccount ? "Pilot Fabrika" : "KanbAI Factory";
  const connectionLabel = connected
    ? "Canli veri aktif"
    : apiReady
      ? "API aktif - veri hazir"
      : "Baglanti kontrol ediliyor";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7fb] text-[#0b1020]">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#2563eb]">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[#0b1020]">KanbAI</p>
              <p className="max-w-[120px] truncate text-xs text-slate-500">
                Industrial Quality CRM
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 px-3 py-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Building2 size={14} />
              Factory account
            </div>
            <p className="mt-2 truncate text-sm font-medium text-[#0b1020]">{factoryName}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{user?.full_name} / {user?.role}</p>
            {!isPilotAccount && (
              <button
                onClick={handlePilotSwitch}
                disabled={switchingPilot}
                className="mt-3 w-full rounded-lg bg-[#FF7A00] px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#ff8f24] disabled:opacity-60"
              >
                Pilot fabrika hesabina gec
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase text-slate-400">
            Operations
          </p>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-[#00C2FF]/12 font-medium text-sky-700"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <Icon size={16} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-slate-200 px-4 py-4">
          <div className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs ${
            systemOnline ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}>
            {systemOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connectionLabel}
          </div>
          <button
            onClick={enableNotifications}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 transition hover:bg-sky-50 hover:text-sky-700"
          >
            <Activity size={16} />
            {notificationsEnabled ? "Bildirimler acik" : "Bildirimleri ac"}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} />
            Cikis Yap
          </button>
        </div>
      </aside>

      <main className="dashboard-light flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
