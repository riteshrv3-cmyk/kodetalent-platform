import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, ExternalLink, Target, Loader2, Search, X, Sparkles, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DOMAINS, type Domain, type SubDomain } from "@/data/domains";
import { useCoursePreloader, prefetchCourse } from "@/hooks/useCoursePreloader";
import { apiFetch } from "@/lib/api/authFetch";

type OpportunityType = "jobs" | "internship" | "freelancing";

interface LiveOpportunity {
  id: string;
  title: string;
  company: string;
  logo: string | null;
  location: string;
  pay: string | null;
  postedAt: string | null;
  tags: string[];
  url: string;
  source: string;
}

function emojiFor(source: string): string {
  const s = source.toLowerCase();
  if (s.includes("remote")) return "🌐";
  if (s.includes("naukri")) return "🇮🇳";
  if (s.includes("linkedin")) return "💼";
  if (s.includes("internshala")) return "🎓";
  if (s.includes("upwork")) return "💚";
  if (s.includes("toptal")) return "💎";
  if (s.includes("freelancer")) return "🛠";
  if (s.includes("fiverr")) return "🟢";
  return "✨";
}

interface JdGap {
  fitScore: number;
  summary: string;
  have: string[];
  missing: string[];
  plan: Array<{ title: string; hours: number; action: string }>;
}

export default function Opportunities() {
  const [, setLocation] = useLocation();
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [selectedSubDomain, setSelectedSubDomain] = useState<SubDomain | null>(null);
  const [activeTab, setActiveTab] = useState<OpportunityType>("jobs");
  const [searchQuery, setSearchQuery] = useState("");

  // JD-gap analyser state
  const [gapOpen, setGapOpen] = useState(false);
  const [gapJobTitle, setGapJobTitle] = useState("");
  const [gapData, setGapData] = useState<JdGap | null>(null);
  const [gapLoading, setGapLoading] = useState(false);
  const [gapError, setGapError] = useState<string | null>(null);

  const checkFit = async (op: LiveOpportunity) => {
    const studentId = Number(localStorage.getItem("studentId") || "0");
    if (!studentId) {
      setLocation("/");
      return;
    }
    setGapOpen(true);
    setGapJobTitle(op.title);
    setGapData(null);
    setGapError(null);
    setGapLoading(true);
    try {
      const r = await apiFetch(`/api/ai/jd-gap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          jobTitle: op.title,
          company: op.company,
          tags: op.tags,
          source: op.source,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || "Couldn't analyse fit");
      }
      const data: JdGap = await r.json();
      setGapData(data);
    } catch (err) {
      setGapError(err instanceof Error ? err.message : "Failed to analyse fit");
    } finally {
      setGapLoading(false);
    }
  };

  const closeGap = () => {
    setGapOpen(false);
    setGapData(null);
    setGapError(null);
  };

  const goLearnGap = () => {
    closeGap();
    if (selectedDomain && selectedSubDomain) {
      navigateToCourse();
    } else {
      setLocation("/opportunities");
    }
  };

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [] as { domain: Domain; sub: SubDomain; matchedSkill?: string }[];
    const out: { domain: Domain; sub: SubDomain; matchedSkill?: string; score: number }[] = [];
    for (const d of DOMAINS) {
      const dHit = d.name.toLowerCase().includes(q);
      for (const sd of d.subDomains) {
        const nameHit = sd.name.toLowerCase().includes(q);
        const exactName = sd.name.toLowerCase() === q;
        const skillHit = sd.skills.find(s => s.toLowerCase().includes(q));
        const exactSkill = sd.skills.find(s => s.toLowerCase() === q);
        if (nameHit || skillHit || dHit) {
          let score = 0;
          if (exactName) score += 100;
          else if (nameHit && sd.name.toLowerCase().startsWith(q)) score += 60;
          else if (nameHit) score += 40;
          if (exactSkill) score += 80;
          else if (skillHit) score += 30;
          if (dHit) score += 10;
          out.push({ domain: d, sub: sd, matchedSkill: skillHit, score });
        }
      }
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [searchQuery]);

  const jumpToSubDomain = (domain: Domain, sub: SubDomain) => {
    setSelectedDomain(domain);
    setSelectedSubDomain(sub);
    setSearchQuery("");
    prefetchCourse(sub.id, sub.name, domain.name, sub.skills);
  };

  // Silently pre-generate all 48 courses in the background
  useCoursePreloader();

  const navigateToCourse = () => {
    if (!selectedDomain || !selectedSubDomain) return;
    sessionStorage.setItem("courseContext", JSON.stringify({
      subDomainId: selectedSubDomain.id,
      subDomainName: selectedSubDomain.name,
      domainName: selectedDomain.name,
      domainColor: selectedDomain.color,
      domainBg: selectedDomain.bg,
      domainEmoji: selectedDomain.emoji,
      skills: selectedSubDomain.skills,
    }));
    setLocation("/opportunities/course");
  };

  const goBack = () => {
    if (selectedSubDomain) {
      setSelectedSubDomain(null);
      setActiveTab("jobs");
    } else if (selectedDomain) {
      setSelectedDomain(null);
    }
  };

  const TABS: { id: OpportunityType; label: string; emoji: string }[] = [
    { id: "jobs", label: "Jobs", emoji: "💼" },
    { id: "internship", label: "Internship", emoji: "🎓" },
    { id: "freelancing", label: "Freelancing", emoji: "🌍" },
  ];

  const skillsParam = selectedSubDomain?.skills.join(",") ?? "";
  const roleParam = selectedSubDomain?.name ?? "";
  const liveQuery = useQuery<{ items: LiveOpportunity[] }>({
    queryKey: ["opportunities", activeTab, roleParam, skillsParam],
    queryFn: async () => {
      const url = `/api/opportunities?kind=${activeTab}&role=${encodeURIComponent(roleParam)}&skills=${encodeURIComponent(skillsParam)}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("fetch failed");
      return r.json();
    },
    enabled: !!selectedSubDomain,
    staleTime: 5 * 60 * 1000,
  });

  const renderLiveCards = () => {
    if (!selectedSubDomain || !selectedDomain) return null;
    const skills = selectedSubDomain.skills.slice(0, 3);
    const accent = selectedDomain.color;
    const accentBg = selectedDomain.bg;
    const payColor =
      activeTab === "jobs" ? "#10b981"
      : activeTab === "internship" ? "#4f46e5"
      : "#f97316";
    const payBg =
      activeTab === "jobs" ? "#ecfdf5"
      : activeTab === "internship" ? "#eef2ff"
      : "#fff7ed";

    if (liveQuery.isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: accent }} />
          <p className="text-xs text-[#64748b] font-bold">Fetching live {activeTab}…</p>
        </div>
      );
    }

    const items = liveQuery.data?.items ?? [];
    if (!items.length) {
      return (
        <div className="text-center py-10">
          <p className="text-sm font-bold text-[#64748b]">No live results — try another specialisation.</p>
        </div>
      );
    }

    return items.map((o, i) => (
      <motion.div key={o.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
        <Card className="border-0 shadow-[0_4px_16px_rgba(0,0,0,0.07)] rounded-2xl bg-white overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {o.logo
                  ? <img src={o.logo} alt={o.company} className="w-9 h-9 rounded-lg object-cover bg-[#f1f5f9] flex-shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  : <span className="text-2xl flex-shrink-0">{emojiFor(o.source)}</span>
                }
                <div className="min-w-0">
                  <p className="text-xs text-[#64748b] font-bold truncate">{o.company} · {o.source}</p>
                  <p className="text-sm font-extrabold text-[#0f172a] leading-tight line-clamp-2">{o.title}</p>
                </div>
              </div>
              {o.pay && (
                <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ color: payColor, background: payBg }}>
                  {o.pay}
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748b] mb-3">
              📍 {o.location}{o.postedAt ? ` · ${o.postedAt}` : ""}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(o.tags.length ? o.tags : skills).slice(0, 4).map(s => (
                <span key={s} className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: accentBg, color: accent }}>
                  {s}
                </span>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <Button
                onClick={() => checkFit(o)}
                className="flex-1 h-10 rounded-xl font-bold text-[13px] text-white"
                style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)" }}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Check fit
              </Button>
              <a href={o.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" className="w-full h-10 rounded-xl font-bold text-[13px] border-2" style={{ borderColor: accent, color: accent }}>
                  Apply <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </a>
            </div>
            <Button
              onClick={navigateToCourse}
              variant="ghost"
              className="w-full h-8 rounded-lg font-bold text-[12px]"
              style={{ color: accent }}
            >
              <Target className="w-3 h-3 mr-1" /> Prepare for this role
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    ));
  };

  const renderCards = () => renderLiveCards();


  return (
    <div className="min-h-screen bg-[#f8fafc] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#f8fafc] px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          {(selectedDomain || selectedSubDomain) && (
            <button
              onClick={goBack}
              className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-[#0f172a] flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-[#0f172a]">
              {!selectedDomain && "Opportunities"}
              {selectedDomain && !selectedSubDomain && selectedDomain.name}
              {selectedSubDomain && selectedSubDomain.name}
            </h1>
            <p className="text-xs font-bold text-[#64748b]">
              {!selectedDomain && `Explore ${DOMAINS.length} tech domains · 100+ AI courses · Jobs · Internships`}
              {selectedDomain && !selectedSubDomain && "Select a specialisation to explore roles"}
              {selectedSubDomain && "Browse opportunities and get prepared"}
            </p>
          </div>
        </div>

        {/* Tabs — shown only at sub-domain level */}
        {selectedSubDomain && (
          <div className="flex gap-2 mt-3 pb-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[13px] font-extrabold transition-all",
                  activeTab === tab.id
                    ? "text-white shadow-sm"
                    : "bg-white text-[#64748b]"
                )}
                style={activeTab === tab.id ? { background: selectedDomain!.color } : {}}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-2">
        <AnimatePresence mode="wait">
          {/* Level 0 — Search bar + Domain grid */}
          {!selectedDomain && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search skills or roles… e.g. React, Python, ML"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white border border-[#e2e8f0] text-sm font-bold text-[#0f172a] placeholder:text-[#94a3b8] placeholder:font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
                  data-testid="input-opportunity-search"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#64748b]"
                    data-testid="button-clear-search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {searchQuery.trim() && (
                <div className="mt-2 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm font-bold text-[#0f172a]">No matches</p>
                      <p className="text-xs text-[#64748b] mt-1">Try "React", "Data", "Cloud", or browse all domains below.</p>
                    </div>
                  ) : (
                    searchResults.map(({ domain, sub, matchedSkill }, i) => (
                      <motion.button
                        key={`${domain.id}-${sub.id}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => jumpToSubDomain(domain, sub)}
                        className={cn(
                          "w-full px-4 py-3 flex items-center gap-3 text-left active:bg-[#f8fafc] transition-colors",
                          i !== searchResults.length - 1 && "border-b border-[#f1f5f9]"
                        )}
                        data-testid={`search-result-${sub.id}`}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                          style={{ background: domain.bg }}
                        >
                          {domain.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-[#0f172a] text-sm truncate">{sub.name}</p>
                          <p className="text-[11px] font-bold text-[#64748b] truncate">
                            <span style={{ color: domain.color }}>{domain.name}</span>
                            {matchedSkill && (
                              <span className="text-[#94a3b8]"> · {matchedSkill}</span>
                            )}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#cbd5e1] shrink-0" />
                      </motion.button>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}
          {!selectedDomain && !searchQuery.trim() && (
            <motion.div
              key="domains"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button
                onClick={() => setLocation("/pipeline")}
                className="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-[#e2e8f0] shadow-sm text-left active:bg-[#f8fafc] transition-colors"
                data-testid="link-my-pipeline"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 bg-[#eef2ff]">
                  🎯
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[#0f172a] text-sm">My Pipeline</p>
                  <p className="text-[11px] font-bold text-[#64748b]">Paste any job or drive — scam check, eligibility, fit & prep</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#cbd5e1] shrink-0" />
              </button>
              <div className="grid grid-cols-3 gap-3">
                {DOMAINS.map((domain, i) => (
                  <motion.button
                    key={domain.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setSelectedDomain(domain)}
                    className="rounded-2xl p-3 flex flex-col items-center text-center gap-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-2 border-transparent hover:border-current transition-all"
                    style={{ background: domain.bg }}
                  >
                    <span className="text-3xl">{domain.emoji}</span>
                    <span className="text-[11px] font-extrabold leading-tight" style={{ color: domain.color }}>
                      {domain.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Level 1 — Sub-domain list */}
          {selectedDomain && !selectedSubDomain && (
            <motion.div
              key="subdomains"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-2"
            >
              {/* Domain banner */}
              <div
                className="rounded-2xl p-4 mb-4 flex items-center gap-3"
                style={{ background: selectedDomain.bg }}
              >
                <span className="text-4xl">{selectedDomain.emoji}</span>
                <div>
                  <p className="text-xs font-extrabold text-[#64748b] uppercase tracking-wider">Domain</p>
                  <p className="text-lg font-extrabold" style={{ color: selectedDomain.color }}>{selectedDomain.name}</p>
                  <p className="text-xs text-[#64748b]">{selectedDomain.subDomains.length} specialisations</p>
                </div>
              </div>

              {selectedDomain.subDomains.map((sd, i) => (
                <motion.button
                  key={sd.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setSelectedSubDomain(sd);
                    // Eagerly generate the course in the background so that
                    // by the time the student clicks "Prepare" on a job card
                    // the Course page loads from cache in <1s.
                    prefetchCourse(sd.id, sd.name, selectedDomain.name, sd.skills);
                  }}
                  className="w-full bg-white rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.05)] text-left"
                >
                  <div>
                    <p className="font-extrabold text-[#0f172a] text-[15px]">{sd.name}</p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {sd.skills.slice(0, 3).map(s => (
                        <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: selectedDomain.bg, color: selectedDomain.color }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-3"
                    style={{ background: selectedDomain.bg }}
                  >
                    <ChevronRight className="w-4 h-4" style={{ color: selectedDomain.color }} />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Level 2 — Opportunity cards */}
          {selectedSubDomain && (
            <motion.div
              key={`cards-${activeTab}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {/* Sub-domain + type badge */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{selectedDomain!.emoji}</span>
                <div>
                  <p className="text-xs font-extrabold" style={{ color: selectedDomain!.color }}>
                    {selectedDomain!.name} › {selectedSubDomain.name}
                  </p>
                  <p className="text-[11px] text-[#64748b] font-bold">
                    {activeTab === "jobs" ? "Full-time roles" : activeTab === "internship" ? "Internship openings" : "Freelance gigs"}
                  </p>
                </div>
              </div>

              {renderCards()}

              {/* Prepare CTA */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl p-4 mt-2"
                style={{ background: selectedDomain!.bg }}
              >
                <p className="text-sm font-extrabold mb-1" style={{ color: selectedDomain!.color }}>
                  🎯 Not ready to apply yet?
                </p>
                <p className="text-xs text-[#64748b] mb-3">
                  Practice mock interviews tailored to {selectedSubDomain.name} roles and build your confidence first.
                </p>
                <Button
                  onClick={navigateToCourse}
                  className="w-full h-10 rounded-xl font-bold text-[13px] text-white"
                  style={{ background: selectedDomain!.color }}
                >
                  Start Practice Session →
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* JD-Gap bottom sheet */}
      <AnimatePresence>
        {gapOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeGap}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto max-w-md mx-auto shadow-[0_-8px_32px_rgba(0,0,0,0.2)]"
              data-testid="jd-gap-sheet"
            >
              <div className="sticky top-0 bg-white rounded-t-3xl px-5 pt-3 pb-2 border-b border-[#f1f5f9]">
                <div className="w-12 h-1 rounded-full bg-[#cbd5e1] mx-auto mb-3" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#8b5cf6]">AI Fit Check</p>
                    <p className="text-base font-extrabold text-[#0f172a] line-clamp-2">{gapJobTitle}</p>
                  </div>
                  <button onClick={closeGap} className="w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                    <X className="w-4 h-4 text-[#64748b]" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-4 pb-8">
                {gapLoading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-7 h-7 animate-spin text-[#8b5cf6]" />
                    <p className="text-xs text-[#64748b] font-bold">Analysing your fit…</p>
                  </div>
                )}
                {gapError && !gapLoading && (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <AlertCircle className="w-7 h-7 text-[#ef4444]" />
                    <p className="text-sm font-bold text-[#0f172a]">{gapError}</p>
                    <Button onClick={closeGap} variant="outline" className="mt-2">Close</Button>
                  </div>
                )}
                {gapData && !gapLoading && (() => {
                  const score = gapData.fitScore;
                  const ringColor = score >= 70 ? "#10b981" : score >= 40 ? "#f97316" : "#ef4444";
                  const ringBg = score >= 70 ? "#d1fae5" : score >= 40 ? "#ffedd5" : "#fee2e2";
                  const verdict = score >= 70 ? "Strong fit — apply now" : score >= 40 ? "Decent fit — close the gaps first" : "Stretch role — build skills first";
                  const r = 42, c = 2 * Math.PI * r;
                  const offset = c - (score / 100) * c;
                  return (
                    <>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative w-[110px] h-[110px] flex-shrink-0">
                          <svg width="110" height="110" className="-rotate-90">
                            <circle cx="55" cy="55" r={r} fill="none" stroke={ringBg} strokeWidth="10" />
                            <motion.circle
                              cx="55" cy="55" r={r} fill="none" stroke={ringColor} strokeWidth="10"
                              strokeLinecap="round" strokeDasharray={c}
                              initial={{ strokeDashoffset: c }}
                              animate={{ strokeDashoffset: offset }}
                              transition={{ duration: 1.1, ease: "easeOut" }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black" style={{ color: ringColor }}>{score}</span>
                            <span className="text-[9px] font-extrabold text-[#64748b] uppercase">Fit</span>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: ringColor }}>{verdict}</p>
                          <p className="text-[13px] font-bold text-[#0f172a] mt-1 leading-snug">{gapData.summary}</p>
                        </div>
                      </div>

                      {gapData.have.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-extrabold text-[#10b981] uppercase tracking-wider mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> What you bring
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {gapData.have.map(s => (
                              <span key={s} className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-[#d1fae5] text-[#047857]">
                                ✓ {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {gapData.missing.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-extrabold text-[#ef4444] uppercase tracking-wider mb-2 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Gaps to close
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {gapData.missing.map(s => (
                              <span key={s} className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-[#fee2e2] text-[#b91c1c]">
                                ✗ {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {gapData.plan.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-extrabold text-[#8b5cf6] uppercase tracking-wider mb-2 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" /> Your action plan
                          </p>
                          <div className="space-y-2">
                            {gapData.plan.map((p, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="bg-gradient-to-br from-[#faf5ff] to-[#fdf2f8] rounded-2xl p-3 border border-[#f3e8ff]"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="text-[13px] font-extrabold text-[#0f172a] leading-tight">{p.title}</p>
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#8b5cf6] text-white whitespace-nowrap">
                                    {p.hours}h
                                  </span>
                                </div>
                                <p className="text-[12px] text-[#64748b] font-medium leading-snug">{p.action}</p>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={goLearnGap}
                        className="w-full h-12 rounded-2xl font-extrabold text-white text-[14px] shadow-lg"
                        style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)" }}
                        data-testid="button-learn-gap"
                      >
                        <Sparkles className="w-4 h-4 mr-1.5" /> Learn the gap →
                      </Button>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
