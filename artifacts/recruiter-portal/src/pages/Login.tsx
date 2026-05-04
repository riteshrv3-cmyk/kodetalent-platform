import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Building2, User, Briefcase, ArrowRight, Zap, Mail } from "lucide-react";

const ROLES = ["HR Manager", "Technical Recruiter", "Campus Recruiter", "Talent Acquisition Lead", "Founder / CEO"];

interface PlatformStats { totalStudents: number; totalColleges: number; avgScore: number; openToWork: number; }

export default function Login() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ company: "", name: "", email: "", role: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    fetch("/api/platform/stats")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPlatformStats(d); })
      .catch(() => null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.company.trim() || !form.name.trim() || !form.email.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/recruiters/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Login failed");
      }
      const recruiter = await res.json();
      localStorage.setItem("recruiter", JSON.stringify({ ...recruiter, loggedInAt: Date.now() }));
      setLocation("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#312e81] to-[#4338ca] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-[#a78bfa]" />
            <span className="text-white/80 text-sm font-bold">Recruiter Portal</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-2">KodeTalent</h1>
          <p className="text-white/60 text-base">India's freshest engineering talent, verified & scored</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Students", value: platformStats ? `${platformStats.totalStudents.toLocaleString("en-IN")}` : "…" },
            { label: "Colleges", value: platformStats ? `${platformStats.totalColleges}` : "…" },
            { label: "Avg. Score", value: platformStats ? `${platformStats.avgScore}/100` : "…" },
          ].map(stat => (
            <div key={stat.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-3 text-center">
              <p className="text-white font-black text-xl">{stat.value}</p>
              <p className="text-white/50 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-6 shadow-[0_32px_64px_rgba(0,0,0,0.3)]"
        >
          <h2 className="text-xl font-black text-[#0f172a] mb-1">Sign in / Create account</h2>
          <p className="text-sm text-[#94a3b8] mb-5">No password — your work email is your account.</p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5 block">Work Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  type="email" required placeholder="you@company.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5 block">Company Name *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  type="text" required placeholder="e.g. Razorpay, Zerodha, Infosys"
                  value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5 block">Your Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  type="text" required placeholder="Full name"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5 block">Your Role</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <select
                  value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5] transition-colors bg-white appearance-none"
                >
                  <option value="">Select role</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {error && <p className="text-[#ef4444] text-sm mt-3 font-medium">{error}</p>}

          <button
            type="submit" disabled={submitting}
            className="w-full mt-5 bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(124,58,237,0.35)] hover:shadow-[0_12px_32px_rgba(124,58,237,0.45)] transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "Signing in..." : <>Continue to Dashboard <ArrowRight className="w-5 h-5" /></>}
          </button>

          <p className="text-center text-xs text-[#94a3b8] mt-4">
            Free during beta · No credit card · Account persists across devices
          </p>
        </motion.form>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center mt-6">
          <button onClick={() => setLocation("/welcome")} className="text-white/60 hover:text-white text-sm font-medium underline underline-offset-2">
            See sample candidates first →
          </button>
        </motion.div>
      </div>
    </div>
  );
}
