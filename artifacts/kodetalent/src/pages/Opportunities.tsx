import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, ExternalLink, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DOMAINS, type Domain, type SubDomain } from "@/data/domains";
import { useCoursePreloader } from "@/hooks/useCoursePreloader";

type OpportunityType = "jobs" | "internship" | "freelancing";

const JOB_CARDS = [
  { company: "Google India", logo: "🟡", pay: "20–40 LPA", location: "Bangalore / Remote", title: "Senior {role}" },
  { company: "Microsoft India", logo: "🔵", pay: "16–32 LPA", location: "Hyderabad / Hybrid", title: "{role} Engineer" },
  { company: "Razorpay", logo: "💳", pay: "12–24 LPA", location: "Bangalore", title: "{role} Lead" },
  { company: "Flipkart", logo: "🛒", pay: "10–22 LPA", location: "Bangalore / Remote", title: "{role} Developer" },
];

const INTERNSHIP_CARDS = [
  { company: "CRED", logo: "💎", pay: "₹25,000/mo", duration: "6 months", platform: "LinkedIn", title: "{role} Intern" },
  { company: "Zepto", logo: "⚡", pay: "₹20,000/mo", duration: "3 months", platform: "Internshala", title: "{role} Trainee" },
  { company: "TCS", logo: "🏢", pay: "₹15,000/mo", duration: "6 months", platform: "Company Portal", title: "{role} Intern" },
  { company: "BrowserStack", logo: "🌐", pay: "₹18,000/mo", duration: "3–6 months", platform: "AngelList", title: "{role} Intern" },
];

const FREELANCE_CARDS = [
  { client: "US Startup", logo: "🌍", pay: "₹1,500–3,000/hr", platform: "Upwork", duration: "Ongoing", title: "{role} Consultant" },
  { client: "Direct Client", logo: "🤝", pay: "₹50K–2L / project", platform: "LinkedIn", duration: "Project-based", title: "{role} Freelancer" },
  { client: "European Agency", logo: "🏗️", pay: "$15–40/hr", platform: "Toptal", duration: "Part-time", title: "{role} Specialist" },
  { client: "Remote Company", logo: "💻", pay: "$20–55/hr", platform: "Freelancer.com", duration: "Contract", title: "{role} Expert" },
];

function fillTitle(template: string, role: string) {
  return template.replace("{role}", role);
}

function getApplyLink(type: OpportunityType, domain: Domain, subDomain: SubDomain) {
  const q = encodeURIComponent(`${subDomain.name}`);
  if (type === "jobs") return `https://naukri.com/jobs-listings?searchType=yourSearch&src=googsearchnaukri&keyword=${q}&jobAge=15&salary=0&industry=&noOfResults=20`;
  if (type === "internship") return `https://internshala.com/internships/${q.toLowerCase().replace(/\s/g, "-")}-internship`;
  return `https://www.upwork.com/nx/search/jobs/?q=${q}`;
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

  const renderCards = () => {
    if (!selectedSubDomain) return null;
    const role = selectedSubDomain.name;
    const skills = selectedSubDomain.skills.slice(0, 3);

    if (activeTab === "jobs") {
      return JOB_CARDS.map((t, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <Card className="border-0 shadow-[0_4px_16px_rgba(0,0,0,0.07)] rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{t.logo}</span>
                  <div>
                    <p className="text-xs text-[#6b7280] font-bold">{t.company}</p>
                    <p className="text-sm font-extrabold text-[#1e1b4b] leading-tight">{fillTitle(t.title, role)}</p>
                  </div>
                </div>
                <span className="text-[11px] font-extrabold text-[#10b981] bg-[#ecfdf5] px-2.5 py-1 rounded-full whitespace-nowrap">
                  {t.pay}
                </span>
              </div>
              <p className="text-xs text-[#6b7280] mb-3">📍 {t.location} · Full-time</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {skills.map(s => (
                  <span key={s} className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${selectedDomain!.bg}`, color: selectedDomain!.color }}>
                    {s}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={navigateToCourse}
                  className="flex-1 h-10 rounded-xl text-white font-bold text-[13px]"
                  style={{ background: selectedDomain!.color }}
                >
                  <Target className="w-3.5 h-3.5 mr-1.5" /> Prepare
                </Button>
                <a
                  href={getApplyLink("jobs", selectedDomain!, selectedSubDomain)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full h-10 rounded-xl font-bold text-[13px] border-2" style={{ borderColor: selectedDomain!.color, color: selectedDomain!.color }}>
                    Apply <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ));
    }

    if (activeTab === "internship") {
      return INTERNSHIP_CARDS.map((t, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <Card className="border-0 shadow-[0_4px_16px_rgba(0,0,0,0.07)] rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{t.logo}</span>
                  <div>
                    <p className="text-xs text-[#6b7280] font-bold">{t.company}</p>
                    <p className="text-sm font-extrabold text-[#1e1b4b] leading-tight">{fillTitle(t.title, role)}</p>
                  </div>
                </div>
                <span className="text-[11px] font-extrabold text-[#7c3aed] bg-[#f5f3ff] px-2.5 py-1 rounded-full whitespace-nowrap">
                  {t.pay}
                </span>
              </div>
              <p className="text-xs text-[#6b7280] mb-1">⏱ {t.duration} · via {t.platform}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {skills.map(s => (
                  <span key={s} className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: selectedDomain!.bg, color: selectedDomain!.color }}>
                    {s}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={navigateToCourse}
                  className="flex-1 h-10 rounded-xl text-white font-bold text-[13px]"
                  style={{ background: selectedDomain!.color }}
                >
                  <Target className="w-3.5 h-3.5 mr-1.5" /> Prepare
                </Button>
                <a
                  href={getApplyLink("internship", selectedDomain!, selectedSubDomain)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full h-10 rounded-xl font-bold text-[13px] border-2" style={{ borderColor: selectedDomain!.color, color: selectedDomain!.color }}>
                    Apply <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ));
    }

    // Freelancing
    return FREELANCE_CARDS.map((t, i) => (
      <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
        <Card className="border-0 shadow-[0_4px_16px_rgba(0,0,0,0.07)] rounded-2xl bg-white overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{t.logo}</span>
                <div>
                  <p className="text-xs text-[#6b7280] font-bold">{t.client} · {t.platform}</p>
                  <p className="text-sm font-extrabold text-[#1e1b4b] leading-tight">{fillTitle(t.title, role)}</p>
                </div>
              </div>
              <span className="text-[11px] font-extrabold text-[#f97316] bg-[#fff7ed] px-2.5 py-1 rounded-full whitespace-nowrap">
                {t.pay}
              </span>
            </div>
            <p className="text-xs text-[#6b7280] mb-3">📅 {t.duration}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {skills.map(s => (
                <span key={s} className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: selectedDomain!.bg, color: selectedDomain!.color }}>
                  {s}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={navigateToCourse}
                className="flex-1 h-10 rounded-xl text-white font-bold text-[13px]"
                style={{ background: selectedDomain!.color }}
              >
                <Target className="w-3.5 h-3.5 mr-1.5" /> Prepare
              </Button>
              <a
                href={getApplyLink("freelancing", selectedDomain!, selectedSubDomain)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full h-10 rounded-xl font-bold text-[13px] border-2" style={{ borderColor: selectedDomain!.color, color: selectedDomain!.color }}>
                  Apply <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ));
  };

  return (
    <div className="min-h-screen bg-[#f5f3ff] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#f5f3ff] px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          {(selectedDomain || selectedSubDomain) && (
            <button
              onClick={goBack}
              className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-[#1e1b4b] flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-[#1e1b4b]">
              {!selectedDomain && "Opportunities"}
              {selectedDomain && !selectedSubDomain && selectedDomain.name}
              {selectedSubDomain && selectedSubDomain.name}
            </h1>
            <p className="text-xs font-bold text-[#6b7280]">
              {!selectedDomain && "Explore 12 tech domains · Jobs · Internships · Freelancing"}
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
                    : "bg-white text-[#6b7280]"
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
                  <p className="text-xs font-extrabold text-[#6b7280] uppercase tracking-wider">Domain</p>
                  <p className="text-lg font-extrabold" style={{ color: selectedDomain.color }}>{selectedDomain.name}</p>
                  <p className="text-xs text-[#6b7280]">{selectedDomain.subDomains.length} specialisations</p>
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
                    <p className="font-extrabold text-[#1e1b4b] text-[15px]">{sd.name}</p>
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
                  <p className="text-[11px] text-[#6b7280] font-bold">
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
                <p className="text-xs text-[#6b7280] mb-3">
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
