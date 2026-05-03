import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Trash2, ExternalLink, Building2, Calendar, CheckCircle2, XCircle, Eye, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace("/tpo-portal", "");

function getTpo() {
  try { return JSON.parse(localStorage.getItem("tpo") || "{}"); } catch { return {}; }
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("tpoToken") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface TpoDrive {
  id: number;
  college: string;
  postedByName: string;
  company: string;
  role: string | null;
  ctc: string | null;
  batch: string | null;
  branches: string[];
  cgpaCutoff: string | null;
  applyLink: string | null;
  notes: string | null;
  driveDate: string | null;
  expiresAt: string | null;
  status: string;
  matchedChecks: number;
  createdAt: string;
}

const BRANCH_OPTIONS = ["cse", "ece", "eee", "mech", "civil", "chem", "all"];

export default function AnnounceDrives() {
  const tpo = getTpo();
  const college: string = tpo.college || "";
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [ctc, setCtc] = useState("");
  const [batch, setBatch] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [cgpaCutoff, setCgpaCutoff] = useState("");
  const [applyLink, setApplyLink] = useState("");
  const [notes, setNotes] = useState("");
  const [driveDate, setDriveDate] = useState("");

  const { data: drives = [], isLoading } = useQuery<TpoDrive[]>({
    queryKey: ["tpo-drives", college],
    queryFn: () => fetch(`${BASE}/api/colleges/${encodeURIComponent(college)}/tpo-drives`).then(r => r.json()),
    enabled: !!college,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/colleges/${encodeURIComponent(college)}/tpo-drives`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          company, role, ctc, batch,
          branches,
          cgpaCutoff,
          applyLink,
          notes,
          driveDate: driveDate || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tpo-drives", college] });
      setShowForm(false);
      setCompany(""); setRole(""); setCtc(""); setBatch("");
      setBranches([]); setCgpaCutoff(""); setApplyLink(""); setNotes(""); setDriveDate("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      fetch(`${BASE}/api/tpo-drives/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tpo-drives", college] }),
  });

  const closeMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "active" | "closed" }) =>
      fetch(`${BASE}/api/tpo-drives/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tpo-drives", college] }),
  });

  const toggleBranch = (b: string) => {
    setBranches(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  };

  const totalMatches = drives.reduce((s, d) => s + (d.matchedChecks || 0), 0);
  const activeCount = drives.filter(d => d.status === "active").length;

  return (
    <div className="px-8 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b] flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#4f46e5]" />
            Announce Drives
          </h1>
          <p className="text-sm text-[#64748b] mt-1">Post drives officially so students see a green "Verified by TPO" badge when they paste matching messages.</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "New Drive"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
          <p className="text-2xl font-black text-[#1e293b]">{drives.length}</p>
          <p className="text-sm text-[#64748b]">Total drives posted</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
          <p className="text-2xl font-black text-[#10b981]">{activeCount}</p>
          <p className="text-sm text-[#64748b]">Currently active</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
          <p className="text-2xl font-black text-[#4f46e5]">{totalMatches}</p>
          <p className="text-sm text-[#64748b]">Student matches verified</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 mb-6">
          <h2 className="text-base font-bold text-[#1e293b] mb-4">Post a new drive</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company *">
              <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. TCS" className={inputCls} />
            </Field>
            <Field label="Role">
              <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Software Engineer" className={inputCls} />
            </Field>
            <Field label="CTC">
              <input value={ctc} onChange={e => setCtc(e.target.value)} placeholder="e.g. 7 LPA" className={inputCls} />
            </Field>
            <Field label="Batch">
              <input value={batch} onChange={e => setBatch(e.target.value)} placeholder="e.g. 2026" className={inputCls} />
            </Field>
            <Field label="CGPA cutoff">
              <input value={cgpaCutoff} onChange={e => setCgpaCutoff(e.target.value)} placeholder="e.g. 7.0" className={inputCls} />
            </Field>
            <Field label="Drive date">
              <input type="date" value={driveDate} onChange={e => setDriveDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Apply link" full>
              <input value={applyLink} onChange={e => setApplyLink(e.target.value)} placeholder="https://..." className={inputCls} />
            </Field>
            <Field label="Eligible branches" full>
              <div className="flex gap-2 flex-wrap">
                {BRANCH_OPTIONS.map(b => {
                  const on = branches.includes(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBranch(b)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                        on
                          ? "bg-[#4f46e5] text-white border-[#4f46e5]"
                          : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#4f46e5]"
                      }`}
                    >
                      {b.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Notes" full>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Anything students should know" className={inputCls} />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-sm font-medium text-[#64748b] px-4 py-2 rounded-xl hover:bg-[#f8fafc]">Cancel</button>
            <button
              disabled={!company.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
              className="bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-50 text-white text-sm font-bold px-5 py-2 rounded-xl flex items-center gap-2"
            >
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Post drive
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl h-64 animate-pulse" />
      ) : drives.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-12 text-center">
          <Megaphone className="w-12 h-12 text-[#cbd5e1] mx-auto mb-3" />
          <p className="font-bold text-[#1e293b] mb-1">No drives announced yet</p>
          <p className="text-sm text-[#94a3b8]">Once you post a drive here, any student who pastes a matching message into their Drive Check will see a verified "TPO has officially shared this" badge.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="divide-y divide-[#f1f5f9]">
            {drives.map(d => (
              <div key={d.id} className="px-6 py-4 flex items-start gap-4 hover:bg-[#f8fafc] transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#eef2ff]">
                  <Building2 className="w-5 h-5 text-[#4f46e5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[#1e293b]">{d.company}</p>
                    {d.role && <span className="text-xs text-[#64748b]">· {d.role}</span>}
                    {d.status === "closed" && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b]">Closed</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#64748b] flex-wrap">
                    {d.ctc && <span>💰 {d.ctc}</span>}
                    {d.batch && <span>🎓 {d.batch}</span>}
                    {d.cgpaCutoff && <span>CGPA ≥ {d.cgpaCutoff}</span>}
                    {d.branches.length > 0 && <span>{d.branches.map(b => b.toUpperCase()).join(", ")}</span>}
                    {d.driveDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(d.driveDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {d.notes && <p className="text-xs text-[#475569] mt-1.5 leading-snug">{d.notes}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[11px]">
                    <span className="flex items-center gap-1 text-[#4f46e5] font-bold">
                      <Eye className="w-3 h-3" />
                      {d.matchedChecks} student match{d.matchedChecks === 1 ? "" : "es"}
                    </span>
                    <span className="text-[#94a3b8]">Posted by {d.postedByName} · {new Date(d.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {d.applyLink && (
                    <a href={d.applyLink} target="_blank" rel="noopener noreferrer"
                       className="text-[#4f46e5] hover:bg-[#eef2ff] p-2 rounded-lg transition" title="Open apply link">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {d.status === "active" ? (
                    <button onClick={() => closeMut.mutate({ id: d.id, status: "closed" })}
                            className="text-[#f59e0b] hover:bg-[#fef3c7] p-2 rounded-lg transition" title="Close drive">
                      <XCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => closeMut.mutate({ id: d.id, status: "active" })}
                            className="text-[#10b981] hover:bg-[#d1fae5] p-2 rounded-lg transition" title="Reopen drive">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => { if (confirm(`Delete drive for ${d.company}?`)) deleteMut.mutate(d.id); }}
                    className="text-[#ef4444] hover:bg-[#fee2e2] p-2 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5] transition";

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
