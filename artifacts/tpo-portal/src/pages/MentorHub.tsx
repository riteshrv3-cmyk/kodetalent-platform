import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Plus, Trash2, Mail, Phone, X, Loader2, UserCheck } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace("/tpo-portal", "");

function getTpo() {
  try { return JSON.parse(localStorage.getItem("tpo") || "{}"); } catch { return {}; }
}

interface Mentor {
  id: number;
  name: string;
  email: string;
  college: string;
  batchYear?: number;
  field?: string;
  designation?: string;
  phone?: string;
  createdAt: string;
}

function MentorCard({ mentor, onDelete }: { mentor: Mentor; onDelete: (id: number) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] flex items-center justify-center text-white font-bold text-base shrink-0">
            {mentor.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold text-[#1e293b]">{mentor.name}</p>
            {mentor.designation && <p className="text-xs text-[#64748b] mt-0.5">{mentor.designation}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {mentor.field && (
                <span className="text-xs bg-[#f5f3ff] text-[#7c3aed] border border-[#ede9fe] rounded-full px-2.5 py-0.5 font-medium">
                  {mentor.field}
                </span>
              )}
              {mentor.batchYear && (
                <span className="text-xs bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] rounded-full px-2.5 py-0.5 font-medium">
                  Batch {mentor.batchYear}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => onDelete(mentor.id)}
          className="text-[#cbd5e1] hover:text-red-400 transition-colors p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-[#f1f5f9] space-y-1.5">
        <div className="flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-[#94a3b8]" />
          <a href={`mailto:${mentor.email}`} className="text-xs text-[#64748b] hover:text-[#7c3aed] transition-colors">{mentor.email}</a>
        </div>
        {mentor.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-[#94a3b8]" />
            <span className="text-xs text-[#64748b]">{mentor.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AddMentorModal({ college, onClose }: { college: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", designation: "", field: "", batchYear: "", phone: "" });

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch(`${BASE}/api/colleges/${encodeURIComponent(college)}/mentors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tpo-mentors", college] });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    mutation.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      designation: form.designation.trim() || undefined,
      field: form.field.trim() || undefined,
      batchYear: form.batchYear ? parseInt(form.batchYear) : undefined,
      phone: form.phone.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f1f5f9]">
          <h3 className="text-base font-bold text-[#1e293b]">Add Mentor</h3>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-[#475569] transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wide">Full Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Dr. Anita Sharma" required
                className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wide">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="anita@example.com" required
                className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wide">Designation</label>
              <input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                placeholder="Prof. / Industry Expert"
                className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wide">Field</label>
              <input value={form.field} onChange={e => setForm(f => ({ ...f, field: e.target.value }))}
                placeholder="CSE / Data Science"
                className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wide">Batch Year</label>
              <input type="number" value={form.batchYear} onChange={e => setForm(f => ({ ...f, batchYear: e.target.value }))}
                placeholder="2024"
                className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wide">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#64748b] hover:bg-[#f8fafc] transition">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] text-white rounded-xl text-sm font-semibold disabled:opacity-60 transition">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserCheck className="w-4 h-4" /> Add Mentor</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MentorHub() {
  const tpo = getTpo();
  const college = tpo.college || "";
  const [showAdd, setShowAdd] = useState(false);
  const qc = useQueryClient();

  const { data: mentors = [], isLoading } = useQuery<Mentor[]>({
    queryKey: ["tpo-mentors", college],
    queryFn: () => fetch(`${BASE}/api/colleges/${encodeURIComponent(college)}/mentors`).then(r => r.json()),
    enabled: !!college,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`${BASE}/api/mentors/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tpo-mentors", college] }),
  });

  return (
    <div className="px-8 py-8">
      {showAdd && <AddMentorModal college={college} onClose={() => setShowAdd(false)} />}

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Mentor Hub</h1>
          <p className="text-sm text-[#64748b] mt-1">{college} · {mentors.length} mentors registered</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] text-white rounded-xl text-sm font-semibold shadow-sm shadow-[#7c3aed]/25 hover:shadow-[#7c3aed]/40 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Mentor
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#e2e8f0] p-5 h-40 animate-pulse" />
          ))}
        </div>
      ) : mentors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-16 flex flex-col items-center text-center">
          <GraduationCap className="w-12 h-12 text-[#e2e8f0] mb-4" />
          <p className="text-base font-semibold text-[#94a3b8]">No mentors yet</p>
          <p className="text-sm text-[#cbd5e1] mt-1 mb-5">Add faculty or industry mentors to support your batch's placement journey</p>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7c3aed] text-white rounded-xl text-sm font-semibold">
            <Plus className="w-4 h-4" /> Add your first mentor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mentors.map(m => (
            <MentorCard key={m.id} mentor={m} onDelete={id => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}
