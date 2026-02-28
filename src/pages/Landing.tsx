/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from "react-router-dom";
import { ArrowRight, Globe, Shield, Calendar, FileText, BarChart3, Zap } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

  const features = [
    {
      icon: <Calendar className="w-8 h-8" />,
      titleKey: "feature.1.title",
      descKey: "feature.1.desc",
    },
    {
      icon: <FileText className="w-8 h-8" />,
      titleKey: "feature.2.title",
      descKey: "feature.2.desc",
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      titleKey: "feature.3.title",
      descKey: "feature.3.desc",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500/30">
      {/* Navbar */}
      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/")}>
            <Logo className="h-8 transition-transform group-hover:scale-105" />
            <span className="font-bold text-xl tracking-tight text-white">EA APP</span>
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
            {["nl", "en", "tr"].map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l as any)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${language === l
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col justify-center relative overflow-hidden">
        {/* Soft background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <section className="relative z-10 w-full max-w-4xl mx-auto px-6 py-20 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            <span>{t('landing.badge')}</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-white leading-tight">
            {t('landing.title')}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              {t('landing.highlight')}
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            {t('landing.description')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4">
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 h-14 rounded-xl text-lg font-semibold shadow-lg shadow-blue-900/20 transition-all w-full sm:w-auto"
            >
              {t('auth.loginButton')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <Button
              onClick={() => navigate("/auth#signup")}
              size="lg"
              variant="outline"
              className="bg-transparent border-white/20 text-white hover:bg-white/10 px-8 h-14 rounded-xl text-lg font-semibold w-full sm:w-auto transition-all"
            >
              {t('auth.signupButton')}
            </Button>
          </div>

          <div className="flex items-center gap-8 mt-16 text-sm text-slate-500 justify-center">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>{t('landing.secure')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              <span>{t('landing.access')}</span>
            </div>
          </div>
        </section>

        {/* Features Minimal */}
        <section className="relative z-10 w-full bg-slate-900/50 border-t border-white/5 py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-12 text-center md:text-left">
              {features.map((f, i) => (
                <div key={i} className="flex flex-col items-center md:items-start p-6 rounded-2xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{t(f.titleKey)}</h3>
                  <p className="text-slate-400 leading-relaxed text-base">
                    {t(f.descKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-slate-500 text-sm bg-slate-950">
        <p>© {new Date().getFullYear()} EA APP — {t('footer.rights')}</p>
      </footer>
    </div>
  );
}