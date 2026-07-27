import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, ExternalLink, Target, Loader2, Search, X, Sparkles, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

/**
 * Deep-link support: `/opportunities?domain=webdev&sub=fullstack` opens straight
 * into that specialisation's live feed. Onboarding uses this to drop a new
 * student onto real jobs/internships/freelance work for the role they picked.
 * Unknown or missing ids fall back to the normal domain grid.
 */
function deepLinkSelection(): { domain: Domain | null; sub: SubDomain | null } {
  const params = new URLSearchParams(window.location.search);
  const domain = DOMAINS.find(d => d.id === params.get("domain")) ?? null;
  if (!domain) return { domain: null, sub: null };
  const sub = domain.subDomains.find(s => s.id === params.get("sub")) ?? null;
  return { domain, sub };
}

export default function Opportunities() {
  const [, setLocation] = useLocation();
  const initialSelection = useState(deepLinkSelection)[0];
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(initialSelection.domain);
  const [selectedSubDomain, setSelectedSubDomain] = useState<SubDomain | null>(initialSelection.sub);
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

    if (liveQuery.isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-ink" />
          <p className="text-[12px] text-ink-muted">Fetching live {activeTab}…</p>
        </div>
      );
    }

    const items = liveQuery.data?.items ?? [];
    if (!items.length) {
      return (
        <div className="text-center py-10">
          <p className="text-[14px] text-ink">No live results</p>
          <p className="text-[12px] text-ink-muted mt-1">Try another specialisation.</p>
        </div>
      );
    }

    return items.map((o, i) => (
      <motion.div key={o.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
        <div className="bg-paper rounded-2xl shadow-soft overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between mb-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {o.logo
                  ? <img src={o.logo} alt={o.company} className="w-9 h-9 rounded-lg object-cover border border-line flex-shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  : <span className="text-2xl flex-shrink-0">{emojiFor(o.source)}</span>
                }
                <div className="min-w-0">
                  <p className="text-[11px] text-ink-muted truncate">{o.company} · {o.source}</p>
                  <p className="text-[14px] font-bold text-ink leading-tight line-clamp-2">{o.title}</p>
                </div>
              </div>
              {o.pay && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-brand-soft text-brand">
                  {o.pay}
                </span>
              )}
            </div>
            <p className="text-[12px] text-ink-muted mb-3">
              📍 {o.location}{o.postedAt ? ` · ${o.postedAt}` : ""}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(o.tags.length ? o.tags : skills).slice(0, 4).map(s => (
                <span key={s} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-soft text-brand">
                  {s}
                </span>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <Button
                onClick={() => checkFit(o)}
                className="flex-1 h-10 rounded-full font-bold text-[13px] bg-brand text-white hover:bg-brand/90"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Check fit
              </Button>
              <a href={o.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" className="w-full h-10 rounded-full font-bold text-[13px] border border-line text-brand bg-paper">
                  Apply <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </a>
            </div>
            <Button
              onClick={navigateToCourse}
              variant="ghost"
              className="w-full h-8 rounded-lg font-bold text-[12px] text-brand"
            >
              <Target className="w-3 h-3 mr-1" /> Prepare for this role
            </Button>
          </div>
        </div>
      </motion.div>
    ));
  };

  const renderCards = () => renderLiveCards();


  return (
    <div className="min-h-screen bg-canvas pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-paper px-4 pt-4 pb-2 border-b border-line">
        <div className="flex items-center gap-2 mb-1">
          {(selectedDomain || selectedSubDomain) && (
            <button
              onClick={goBack}
              className="w-9 h-9 rounded-full border border-line bg-paper flex items-center justify-center text-ink flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-[26px] font-extrabold text-ink leading-[1.06] tracking-tight">
              {!selectedDomain && "Opportunities"}
              {selectedDomain && !selectedSubDomain && selectedDomain.name}
              {selectedSubDomain && selectedSubDomain.name}
            </h1>
            <p className="text-[12px] text-ink-muted mt-1">
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
                  "flex-1 py-2 rounded-xl text-[13px] font-bold border transition-colors",
                  activeTab === tab.id
                    ? "bg-brand text-white border-brand"
                    : "bg-paper text-ink-muted border-line"
                )}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-2">
        {/* mode="wait" requires exactly ONE child at a time. Level 0's search bar
            and domain grid are therefore wrapped in a single keyed child — as two
            sibling children they deadlocked the exit queue, leaving the outgoing
            level stuck at opacity:0 and the incoming one never mounting (which is
            what froze the feed when switching Jobs/Internship/Freelancing tabs). */}
        <AnimatePresence mode="wait">
          {/* Level 0 — Search bar + Domain grid */}
          {!selectedDomain && (
            <motion.div
              key="level-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search skills or roles… e.g. React, Python, ML"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-paper border border-line text-[14px] text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand"
                  data-testid="input-opportunity-search"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-line bg-paper flex items-center justify-center text-ink-muted"
                    data-testid="button-clear-search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {searchQuery.trim() && (
                <div className="mt-2 bg-paper rounded-2xl shadow-soft overflow-hidden">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-[14px] text-ink">No matches</p>
                      <p className="text-[12px] text-ink-muted mt-1">Try "React", "Data", "Cloud", or browse all domains below.</p>
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
                          "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors",
                          i !== searchResults.length - 1 && "border-b border-line"
                        )}
                        data-testid={`search-result-${sub.id}`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center text-xl shrink-0">
                          {domain.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-ink text-[14px] truncate">{sub.name}</p>
                          <p className="text-[11px] text-ink-muted truncate">
                            <span>{domain.name}</span>
                            {matchedSkill && (
                              <span> · {matchedSkill}</span>
                            )}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
                      </motion.button>
                    ))
                  )}
                </div>
              )}
            </div>

            {!searchQuery.trim() && (
            <div>
              <button
                onClick={() => setLocation("/pipeline")}
                className="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-paper shadow-soft text-left transition-colors"
                data-testid="link-my-pipeline"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center text-lg shrink-0">
                  🎯
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink text-[14px]">My Pipeline</p>
                  <p className="text-[11px] text-ink-muted">Paste any job or drive — scam check, eligibility, fit & prep</p>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
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
                    className="rounded-2xl p-3 flex flex-col items-center text-center gap-1.5 bg-brand-soft transition-colors"
                  >
                    <span className="text-3xl">{domain.emoji}</span>
                    <span className="text-[11px] font-bold leading-tight text-brand">
                      {domain.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
            )}
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
              <div className="rounded-2xl bg-paper shadow-soft p-4 mb-4 flex items-center gap-3">
                <span className="text-4xl">{selectedDomain.emoji}</span>
                <div>
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Domain</p>
                  <p className="text-[18px] font-extrabold text-ink">{selectedDomain.name}</p>
                  <p className="text-[12px] text-ink-muted">{selectedDomain.subDomains.length} specialisations</p>
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
                  className="w-full bg-paper shadow-soft rounded-2xl p-4 flex items-center justify-between text-left"
                >
                  <div>
                    <p className="font-bold text-ink text-[15px]">{sd.name}</p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {sd.skills.slice(0, 3).map(s => (
                        <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-line text-ink-muted">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-line flex items-center justify-center flex-shrink-0 ml-3">
                    <ChevronRight className="w-4 h-4 text-ink" />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Level 2 — Opportunity cards.
              Keyed on the level, NOT on activeTab: switching Jobs/Internship/
              Freelancing should swap the list in place, not unmount and remount
              the whole level. Re-keying per tab made each switch wait on an exit
              animation before the new tab could mount — a needless dependency
              that leaves the feed blank if that animation never completes (e.g.
              the tab is backgrounded, which suspends requestAnimationFrame).
              The per-card stagger below still animates on every refetch. */}
          {selectedSubDomain && (
            <motion.div
              key="cards"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {/* Sub-domain + type badge */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{selectedDomain!.emoji}</span>
                <div>
                  <p className="text-[12px] font-bold text-ink">
                    {selectedDomain!.name} › {selectedSubDomain.name}
                  </p>
                  <p className="text-[11px] text-ink-muted">
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
                className="rounded-2xl bg-paper shadow-soft p-4 mt-2"
              >
                <p className="text-[14px] font-bold text-ink mb-1">
                  Not ready to apply yet?
                </p>
                <p className="text-[12px] text-ink-muted mb-3">
                  Practice mock interviews tailored to {selectedSubDomain.name} roles and build your confidence first.
                </p>
                <Button
                  onClick={navigateToCourse}
                  className="w-full h-10 rounded-full font-bold text-[13px] bg-brand text-white hover:bg-brand/90"
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
              className="fixed inset-0 bg-ink/40 z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-paper rounded-t-3xl shadow-soft max-h-[85dvh] overflow-y-auto max-w-md mx-auto border-t border-line pb-[env(safe-area-inset-bottom)]"
              data-testid="jd-gap-sheet"
            >
              <div className="sticky top-0 bg-paper rounded-t-3xl px-5 pt-3 pb-2 border-b border-line">
                <div className="w-12 h-1 rounded-full bg-line mx-auto mb-3" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">AI Fit Check</p>
                    <p className="text-[16px] font-extrabold text-ink line-clamp-2">{gapJobTitle}</p>
                  </div>
                  <button onClick={closeGap} className="w-8 h-8 rounded-full border border-line flex items-center justify-center flex-shrink-0">
                    <X className="w-4 h-4 text-ink-muted" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-4 pb-8">
                {gapLoading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-7 h-7 animate-spin text-ink" />
                    <p className="text-[12px] text-ink-muted">Analysing your fit…</p>
                  </div>
                )}
                {gapError && !gapLoading && (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <AlertCircle className="w-7 h-7 text-danger" />
                    <p className="text-[14px] text-danger">{gapError}</p>
                    <Button onClick={closeGap} variant="outline" className="mt-2 border border-line text-brand bg-paper rounded-full">Close</Button>
                  </div>
                )}
                {gapData && !gapLoading && (() => {
                  const score = gapData.fitScore;
                  const verdict = score >= 70 ? "Strong fit — apply now" : score >= 40 ? "Decent fit — close the gaps first" : "Stretch role — build skills first";
                  const r = 42, c = 2 * Math.PI * r;
                  const offset = c - (score / 100) * c;
                  return (
                    <>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative w-[110px] h-[110px] flex-shrink-0">
                          <svg width="110" height="110" className="-rotate-90">
                            <circle cx="55" cy="55" r={r} fill="none" className="stroke-line" strokeWidth="10" />
                            <motion.circle
                              cx="55" cy="55" r={r} fill="none" className="stroke-brand" strokeWidth="10"
                              strokeLinecap="round" strokeDasharray={c}
                              initial={{ strokeDashoffset: c }}
                              animate={{ strokeDashoffset: offset }}
                              transition={{ duration: 1.1, ease: "easeOut" }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-extrabold text-ink">{score}</span>
                            <span className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">Fit</span>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-brand">{verdict}</p>
                          <p className="text-[13px] text-ink mt-1 leading-snug">{gapData.summary}</p>
                        </div>
                      </div>

                      {gapData.have.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> What you bring
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {gapData.have.map(s => (
                              <span key={s} className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-brand-soft text-brand">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {gapData.missing.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Gaps to close
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {gapData.missing.map(s => (
                              <span key={s} className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-line/60 text-ink-muted">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {gapData.plan.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" /> Your action plan
                          </p>
                          <div>
                            {gapData.plan.map((p, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="py-3 border-t border-line first:border-t-0"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="text-[13px] font-semibold text-ink leading-tight">{p.title}</p>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand whitespace-nowrap">
                                    {p.hours}h
                                  </span>
                                </div>
                                <p className="text-[12px] text-ink-muted leading-snug">{p.action}</p>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={goLearnGap}
                        className="w-full h-12 rounded-full font-bold bg-brand text-white text-[14px] hover:bg-brand/90"
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
