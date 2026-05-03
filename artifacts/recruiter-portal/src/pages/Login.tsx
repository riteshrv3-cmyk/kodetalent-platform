import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Building2, User, Briefcase, ArrowRight, Zap } from "lucide-react";

const ROLES = ["HR Manager", "Technical Recruiter", "Campus Recruiter", "Talent Acquisition Lead", "Founder / CEO"];

export default function Login() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ company: "", name: "", email: "", role: "" });
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company.trim() || !form.name.trim() || !form.email.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    localStorage.setItem("recruiter", JSON.stringify({ ...form, loggedInAt: Date.now() }));
    setLocation("/talent");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-[#a78bfa]" />
            <span className="text-white/80 text-sm font-bold">Recruiter Portal</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-2">KodeTalent</h1>
          <p className="text-white/60 text-base">India's freshest engineering talent, verified & scored</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Students", value: "10K+" },
            { label: "Colleges", value: "200+" },
            { label: "Avg. Score", value: "72/100" },
          ].map(stat => (
            <div key={stat.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-3 text-center">
              <p className="text-white font-black text-xl">{stat.value}</p>
              <p className="text-white/50 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-6 shadow-[0_32px_64px_rgba(0,0,0,0.3)]"
        >
          <h2 className="text-xl font-black text-[#1e1b4b] mb-5">Access Talent Pool</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wider mb-1.5 block">Company Name *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                <input
                  type="text" required placeholder="e.g. Razorpay, Zerodha, Infosys"
                  value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wider mb-1.5 block">Your Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                <input
                  type="text" required placeholder="Full name"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wider mb-1.5 block">Work Email *</label>
              <input
                type="email" required placeholder="you@company.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wider mb-1.5 block">Your Role</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                <select
                  value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] transition-colors bg-white appearance-none"
                >
                  <option value="">Select role</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {error && <p className="text-[#ef4444] text-sm mt-3 font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full mt-5 bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(124,58,237,0.35)] hover:shadow-[0_12px_32px_rgba(124,58,237,0.45)] transition-all active:scale-[0.98]"
          >
            Browse Talent Pool <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-center text-xs text-[#9ca3af] mt-4">
            Free access during beta · No credit card needed
          </p>
        </motion.form>
      </div>
    </div>
  );
}
