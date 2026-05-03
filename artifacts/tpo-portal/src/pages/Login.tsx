import { useState } from "react";
import { useLocation } from "wouter";
import { BookOpen, Building2, User, Lock, ChevronRight, Loader2 } from "lucide-react";

const DEMO_COLLEGES = [
  "IIT Bombay", "IIT Delhi", "IIT Madras", "NIT Trichy", "VIT Vellore",
  "BITS Pilani", "Jadavpur University", "RVCE Bangalore", "Thapar University", "COEP Pune",
];

export default function Login() {
  const [, nav] = useLocation();
  const [college, setCollege] = useState("");
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!college.trim() || !name.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password !== "tpo123") {
      setError("Incorrect password. Use: tpo123");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("tpo", JSON.stringify({ college: college.trim(), name: name.trim(), dept: dept.trim() }));
      nav("/dashboard");
    }, 600);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#312e81] to-[#4c1d95] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-11 h-11 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">KodeTalent</p>
            <p className="text-xs text-indigo-300 font-medium">Training & Placement Portal</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 p-8">
          <h2 className="text-xl font-bold text-[#0f172a] mb-1">Welcome, TPO</h2>
          <p className="text-sm text-[#64748b] mb-7">Sign in to manage your batch's placement journey</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Institution *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  value={college}
                  onChange={e => setCollege(e.target.value)}
                  list="colleges"
                  placeholder="e.g. IIT Bombay"
                  className="w-full pl-10 pr-4 py-3 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5] transition"
                />
                <datalist id="colleges">
                  {DEMO_COLLEGES.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Your Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Prof. Ramesh Kumar"
                  className="w-full pl-10 pr-4 py-3 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Department</label>
              <input
                value={dept}
                onChange={e => setDept(e.target.value)}
                placeholder="CSE, ECE, IT…"
                className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full pl-10 pr-4 py-3 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5] transition"
                />
              </div>
              <p className="text-xs text-[#94a3b8] mt-1">Demo password: tpo123</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white py-3 rounded-xl font-semibold text-sm shadow-lg shadow-[#4f46e5]/25 hover:shadow-[#4f46e5]/40 transition-all disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ChevronRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-indigo-300/60 mt-6">KodeTalent · AI Career Companion for India</p>
      </div>
    </div>
  );
}
