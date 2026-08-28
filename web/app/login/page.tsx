"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Factory, Loader2, LockKeyhole, LogIn, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard/profiles");
  }, [isAuthenticated, router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return toast.error("E-posta ve sifre gerekli");
    try {
      await login(email.trim(), password);
      toast.success("KanbAI fabrika oturumu acildi");
      router.replace("/dashboard/profiles");
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? "Giris basarisiz");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090B10] p-5 text-white">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#111722] shadow-[0_30px_120px_rgba(0,0,0,0.45)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="border-b border-white/10 bg-[#0B1018] p-7 lg:border-b-0 lg:border-r lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-300">
            <ShieldCheck size={14} /> Gercek fabrika ortami
          </div>
          <h1 className="mt-7 text-4xl font-bold tracking-tight">Kanb<span className="text-[#00C2FF]">AI</span></h1>
          <p className="mt-2 text-sm uppercase tracking-[0.2em] text-white/40">Quality Intelligence</p>
          <p className="mt-8 max-w-md text-sm leading-7 text-white/55">
            Bu giris gercek pilot backend&apos;ine baglanir. Urun kontrol profilleri, muayene kayitlari ve insan kalite kararlari bu fabrika hesabinda tutulur.
          </p>
          <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm leading-6 text-amber-100/80">
            Simulasyon sayfasi degildir. Yalnizca yetkili fabrika kullanicilari giris yapmalidir.
          </div>
        </section>

        <section className="p-7 lg:p-10">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#FF7A00]/10 p-3 text-orange-300"><Factory size={24} /></div>
            <div><p className="text-xs uppercase tracking-[0.18em] text-white/40">Factory account</p><h2 className="mt-1 text-2xl font-semibold">Oturum ac</h2></div>
          </div>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/55">E-posta</span>
              <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-base outline-none focus:border-[#00C2FF]" placeholder="admin@factory.com" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/55">Sifre</span>
              <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-base outline-none focus:border-[#00C2FF]" />
            </label>
            <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C2FF] px-4 py-3.5 font-bold text-black disabled:opacity-60">
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />} Fabrika hesabina gir
            </button>
          </form>
          <div className="mt-6 flex flex-wrap gap-3 text-xs">
            <Link href="/operator/capture" className="rounded-lg border border-white/10 px-3 py-2 text-white/60 hover:text-white">Operator goruntu yakalama</Link>
            <Link href="/demo" className="rounded-lg border border-white/10 px-3 py-2 text-white/60 hover:text-white">Simulasyonu ayri ac</Link>
          </div>
          <div className="mt-7 flex items-center gap-2 text-xs text-white/35"><LockKeyhole size={14} /> Parolaniz tarayici ekraninda gosterilmez.</div>
        </section>
      </div>
    </main>
  );
}
