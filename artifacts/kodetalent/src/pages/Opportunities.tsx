import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, ExternalLink, Target, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DOMAINS, type Domain, type SubDomain } from "@/data/domains";
import { useCoursePreloader } from "@/hooks/useCoursePreloader";

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

export default function Opportunities() {
  const [, setLocation] = useLocation();
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [selectedSubDomain, setSelectedSubDomain] = useState<SubDomain | null>(null);
  const [activeTab, setActiveTab] = useState<OpportunityType>("jobs");

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
            <div className="flex gap-2">
              <Button
                onClick={navigateToCourse}
                className="flex-1 h-10 rounded-xl text-white font-bold text-[13px]"
                style={{ background: accent }}
              >
                <Target className="w-3.5 h-3.5 mr-1.5" /> Prepare
              </Button>
              <a href={o.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" className="w-full h-10 rounded-xl font-bold text-[13px] border-2" style={{ borderColor: accent, color: accent }}>
                  Apply <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </a>
            </div>
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
          {/* Level 0 — Domain grid */}
          {!selectedDomain && (
            <motion.div
              key="domains"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-3 gap-3"
            >
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
                  onClick={() => setSelectedSubDomain(sd)}
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
    </div>
  );
}
