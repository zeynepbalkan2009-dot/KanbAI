"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";
import {
  LayoutDashboard, Activity, Cpu, Settings, LogOut,
  Wifi, WifiOff, ChevronRight, Brain,
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useInspectionStore } from "@/lib/store/inspections";
import toast from "react-hot-toast";

const NAV = [
  { href: "/dashboard",             label: "Dashboard",  icon: LayoutDashboard },
  { href: "/dashboard/inspections", label: "Muayeneler", icon: Activity },
  { href: "/dashboard/devices",     label: "Cihazlar",   icon: Cpu },
  { href: "/dashboard/mlops",       label: "MLOps & AI", icon: Brain },
  { href: "/dashboard/settings",    label: "Ayarlar",    icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const handleWSEvent = useInspectionStore((s) => s.handleWSEvent);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  const { connected } = useWebSocket({
    tenantId: user?.factory_id ?? "",
    enabled: !!user?.factory_id,
    onEvent: (event) => {
      handleWSEvent(event);
      if (event.type === "inspection.completed") {
        const dec  = event.decision;
        const icon = dec === "pass" ? "✅" : dec === "fail" ? "❌" : "⚠️";
        toast(`${icon} Muayene tamamlandı — ${dec?.toUpperCase()}`, { duration: 4000 });
      }
    },
  });

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">QC Platform</p>
              <p className="text-xs text-gray-500 truncate max-w-[120px]">
                {user?.full_name}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                  ${active
                    ? "bg-blue-600/20 text-blue-400 font-medium"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"}`}
              >
                <Icon size={16} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-800 space-y-3">
          <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-md
            ${connected ? "text-emerald-400 bg-emerald-900/20" : "text-gray-500 bg-gray-800"}`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? "Canlı bağlantı aktif" : "Bağlantı bekleniyor..."}
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm
                       text-gray-400 hover:bg-red-900/20 hover:text-red-400 transition">
            <LogOut size={16} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
