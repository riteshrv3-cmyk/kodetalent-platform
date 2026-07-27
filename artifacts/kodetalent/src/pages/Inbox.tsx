import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Building2, Briefcase, Clock, CheckCircle, XCircle, ChevronRight, Inbox as InboxIcon, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api/authFetch";

interface Invite {
  id: number;
  studentId: number;
  recruiterCompany: string;
  recruiterName: string;
  recruiterEmail: string;
  role?: string;
  message?: string;
  status: string;
  studentSeen: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function InviteCard({ invite, onUpdate }: { invite: Invite; onUpdate: (id: number, status: string) => void }) {
  const [loading, setLoading] = useState<"accepted" | "declined" | null>(null);
  const { toast } = useToast();

  async function respond(status: "accepted" | "declined") {
    setLoading(status);
    try {
      const r = await apiFetch(`/api/recruiter-invites/${invite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error();
      onUpdate(invite.id, status);
      toast({
        title: status === "accepted" ? "✅ Invite accepted!" : "Invite declined",
        description: status === "accepted" ? `${invite.recruiterCompany} will be notified.` : "We've let them know.",
      });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  const isPending = invite.status === "pending";
  const isAccepted = invite.status === "accepted";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(124,58,237,0.07)] border-2 transition-colors ${
        isPending ? "border-[#4f46e5]/20" : isAccepted ? "border-[#10b981]/20" : "border-transparent"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center text-white font-black text-base shrink-0">
          {invite.recruiterCompany.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-extrabold text-[#0f172a] text-[15px] leading-tight">{invite.recruiterCompany}</p>
              {invite.role && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Briefcase className="w-3 h-3 text-[#4f46e5]" />
                  <p className="text-xs font-bold text-[#4f46e5]">{invite.role}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isPending && (
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isAccepted ? "bg-[#ecfdf5] text-[#10b981]" : "bg-[#fef2f2] text-[#ef4444]"
                }`}>
                  {invite.status}
                </span>
              )}
              {isPending && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#f59e0b] animate-pulse">
                  New
                </span>
              )}
              <span className="text-[10px] text-[#94a3b8] font-bold">{timeAgo(invite.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Building2 className="w-3 h-3 text-[#94a3b8]" />
            <p className="text-xs text-[#94a3b8] font-medium">{invite.recruiterName}</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {invite.message && (
        <div className="mt-3 bg-[#f8f7ff] rounded-xl px-3.5 py-2.5">
          <p className="text-xs text-[#64748b] leading-relaxed italic">"{invite.message}"</p>
        </div>
      )}

      {/* Accepted: show recruiter email */}
      {isAccepted && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 bg-[#ecfdf5] rounded-xl px-3.5 py-2.5 flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4 text-[#10b981] shrink-0" />
          <div>
            <p className="text-xs font-bold text-[#065f46]">You accepted! Reach out directly:</p>
            <a href={`mailto:${invite.recruiterEmail}`} className="text-xs font-extrabold text-[#10b981] flex items-center gap-1 mt-0.5">
              {invite.recruiterEmail} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </motion.div>
      )}

      {/* Declined state */}
      {invite.status === "declined" && (
        <div className="mt-3 bg-[#fef2f2] rounded-xl px-3.5 py-2.5 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-[#ef4444] shrink-0" />
          <p className="text-xs font-bold text-[#991b1b]">You passed on this one</p>
        </div>
      )}

      {/* Action buttons for pending */}
      {isPending && (
        <div className="flex gap-2 mt-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => respond("accepted")}
            disabled={!!loading}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-bold text-sm disabled:opacity-60 transition-opacity"
          >
            {loading === "accepted" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Accept</>}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => respond("declined")}
            disabled={!!loading}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-[#fef2f2] text-[#ef4444] font-bold text-sm border border-[#fca5a5] disabled:opacity-60 transition-opacity"
          >
            {loading === "declined" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Pass</>}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

export default function Inbox() {
  const [, setLocation] = useLocation();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "accepted" | "declined">("all");

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) { setLocation("/"); return; }
    setStudentId(parseInt(id, 10));
  }, [setLocation]);

  useEffect(() => {
    if (!studentId) return;
    apiFetch(`/api/students/${studentId}/invites`)
      .then(r => r.json())
      .then((data: Invite[]) => {
        setInvites(data);
        // Mark all as seen
        apiFetch(`/api/students/${studentId}/mark-invites-seen`, { method: "POST" });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  function handleUpdate(id: number, status: string) {
    setInvites(prev => prev.map(inv => inv.id === id ? { ...inv, status, studentSeen: true } : inv));
  }

  const filtered = activeFilter === "all" ? invites : invites.filter(i => i.status === activeFilter);
  const pendingCount = invites.filter(i => i.status === "pending").length;

  const FILTERS: { key: typeof activeFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: invites.length },
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "accepted", label: "Accepted", count: invites.filter(i => i.status === "accepted").length },
    { key: "declined", label: "Declined", count: invites.filter(i => i.status === "declined").length },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#f8fafc] px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-[#0f172a]">Recruiter Inbox</h1>
              {pendingCount > 0 && !loading && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-[#4f46e5] text-white text-xs font-black px-2 py-0.5 rounded-full min-w-[22px] text-center"
                >
                  {pendingCount}
                </motion.span>
              )}
            </div>
            <p className="text-xs font-bold text-[#94a3b8] mt-0.5">Companies interested in hiring you</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${
                activeFilter === f.key
                  ? "bg-[#4f46e5] text-white shadow-sm shadow-[#4f46e5]/30"
                  : "bg-white text-[#64748b] border border-[#e0e7ff]"
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`text-[10px] font-black px-1 rounded-full ${
                  activeFilter === f.key ? "bg-white/20 text-white" : "bg-[#f3f0ff] text-[#4f46e5]"
                }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-1 space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 h-32 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center py-16 px-6"
          >
            <div className="w-20 h-20 rounded-3xl bg-[#e0e7ff] flex items-center justify-center mb-4">
              <InboxIcon className="w-9 h-9 text-[#4f46e5]" />
            </div>
            <h3 className="text-lg font-extrabold text-[#0f172a] mb-2">
              {activeFilter === "all" ? "No invites yet" : `No ${activeFilter} invites`}
            </h3>
            <p className="text-sm text-[#94a3b8] font-medium leading-relaxed">
              {activeFilter === "all"
                ? "Keep building your profile — recruiters are searching for talent like you every day."
                : `You don't have any ${activeFilter} invites right now.`}
            </p>
            {activeFilter === "all" && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setLocation("/profile")}
                className="mt-5 flex items-center gap-2 bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white font-bold text-sm px-5 py-2.5 rounded-full"
              >
                Boost your profile <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}
          </motion.div>
        ) : (
          <AnimatePresence>
            {filtered.map(invite => (
              <InviteCard key={invite.id} invite={invite} onUpdate={handleUpdate} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
