"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Copy, ExternalLink, MonitorCheck, Smartphone, Wifi } from "lucide-react";

export default function CaptureHandoffPage() {
  const [phoneUrl, setPhoneUrl] = useState("http://192.168.1.107/operator/capture");

  useEffect(() => {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      setPhoneUrl(`http://${host}/operator/capture`);
    }
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(phoneUrl);
    toast.success("Telefon linki kopyalandi");
  };

  return (
    <main className="min-h-full bg-[#090B10] p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00C2FF]">
            Operator handoff
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Telefon fotograf girisi</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            Dashboard kalite sorumlusu icindir. Fotograf cekimi telefondaki operator ekranindan yapilir;
            sonuc bu dashboard'daki muayene kayitlari ve inceleme kuyruguna duser.
          </p>
        </div>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-2xl border border-white/10 bg-[#111722] p-6 shadow-2xl shadow-black/25">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-[#00C2FF]/10 p-3 text-[#00C2FF]">
                <Smartphone size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Telefonda acilacak link</h2>
                <p className="text-sm text-white/45">Telefon ve laptop ayni Wi-Fi aginda olmali.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#00C2FF]/25 bg-[#00C2FF]/10 p-4">
              <p className="break-all font-mono text-lg text-[#b9efff]">{phoneUrl}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={copy}
                className="inline-flex items-center gap-2 rounded-xl bg-[#00C2FF] px-4 py-3 text-sm font-bold text-black"
              >
                <Copy size={17} />
                Linki kopyala
              </button>
              <a
                href={phoneUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
              >
                <ExternalLink size={17} />
                Bu cihazda ac
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111722] p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-400/10 p-3 text-emerald-300">
                <MonitorCheck size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Kalite sorumlusu akisi</h2>
                <p className="text-sm text-white/45">Laptop ekraninda kontrol edilecek alanlar.</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                ["1", "Telefon fotografi AI kuyruguna gonderir."],
                ["2", "Muayene Kayitlari yeni sonucu gosterir."],
                ["3", "REVIEW veya FAIL sonuc Inceleme Kuyrugu'na duser."],
                ["4", "Kalite sorumlusu onaylar, reddeder veya etiketi duzeltir."],
              ].map(([step, text]) => (
                <div key={step} className="flex gap-3 rounded-xl bg-black/20 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF7A00] text-sm font-bold text-black">
                    {step}
                  </span>
                  <p className="text-sm leading-6 text-white/70">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              <p className="flex items-center gap-2 font-semibold">
                <Wifi size={16} />
                Pilot mod aktif
              </p>
              <p className="mt-1 text-emerald-100/70">
                Demo seed/reset kapali; ekran sadece gercek pilot akisini yonlendirir.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/inspections"
            className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
          >
            Muayene Kayitlari
          </Link>
          <Link
            href="/dashboard/hitl"
            className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
          >
            Inceleme Kuyrugu
          </Link>
          <Link
            href="/dashboard/devices"
            className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
          >
            Cihazlar
          </Link>
        </div>
      </div>
    </main>
  );
}
