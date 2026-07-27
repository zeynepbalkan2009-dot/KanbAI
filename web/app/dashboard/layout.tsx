"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";
import {
  LayoutDashboard, Activity, LogOut, Camera,
  Wifi, WifiOff, ChevronRight, Brain, ClipboardCheck, Building2, Presentation, TabletSmartphone, Map,
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useInspectionStore } from "@/lib/store/inspections";
import toast from "react-hot-toast";

const NAV = [
  { href: "/dashboard", label: "Workspace", icon: LayoutDashboard },
  { href: "/dashboard/factory", label: "Factory Overview", icon: Map },
  { href: "/dashboard/capture", label: "Capture", icon: Camera },
  { href: "/dashboard/devices", label: "Factory Devices", icon: TabletSmartphone },
  { href: "/dashboard/inspections", label: "Inspection Records", icon: Activity },
  { href: "/dashboard/hitl", label: "Review Queue", icon: ClipboardCheck },
  { href: "/dashboard/mlops", label: "Learning Ops", icon: Brain },
  { href: "/dashboard/executive", label: "Investor Demo", icon: Presentation },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const handleWSEvent = useInspectionStore((s) => s.handleWSEvent);
  const [apiReady, setApiReady] = useState(false);

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
        toast(`Muayene tamamlandi - ${decision}`, { duration: 4000 });
      }
    },
  });

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (!isAuthenticated) return null;

  const systemOnline = connected || apiReady;
  const connectionLabel = connected
    ? "Canli veri aktif"
    : apiReady
      ? "API aktif - veri hazir"
      : "Baglanti kontrol ediliyor";

  return (
    <div className="flex h-screen overflow-hidden bg-[#090B10]">
      <aside className="flex w-64 flex-col border-r border-white/10 bg-[#0f131c]">
        <div className="border-b border-gray-800 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#2563eb]">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">KanbAI</p>
              <p className="max-w-[120px] truncate text-xs text-gray-500">
                Industrial Quality CRM
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 px-3 py-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Building2 size={14} />
              Factory account
            </div>
            <p className="mt-2 truncate text-sm font-medium text-white">Demo Fabrika A</p>
            <p className="mt-1 truncate text-xs text-white/35">{user?.full_name} / {user?.role}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/30">
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
                    ? "bg-[#00C2FF]/10 font-medium text-[#7de4ff]"
                    : "text-white/45 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-white/10 px-4 py-4">
          <div className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs ${
            systemOnline ? "bg-emerald-900/20 text-emerald-400" : "bg-amber-900/20 text-amber-400"
          }`}>
            {systemOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connectionLabel}
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition hover:bg-red-900/20 hover:text-red-400"
          >
            <LogOut size={16} />
            Cikis Yap
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
