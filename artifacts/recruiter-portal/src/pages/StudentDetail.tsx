import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, Github, Linkedin, Globe, Phone, MapPin, Briefcase, Award,
  Code2, BookmarkCheck, Bookmark, ExternalLink, Star, TrendingUp, Zap,
  GraduationCap, Building2, Mail, Check
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace("/recruiter-portal", "");

interface FullProfile {
  id: number;
  name: string;
  email: string;
  college: string;
  city: string;
  year: number;
  field: string;
  cgpa?: string;
  targetPackage?: string;
  dreamCompany?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  phone?: string;
  bio?: string;
  openToWork: boolean;
  workMode?: string;
  preferredLocations: string[];
  expectedSalary?: string;
  profileStrength: number;
  commitmentScore: number;
  overallScore: number;
  xp: number;
  level: number;
  streakCount: number;
  skills: Record<string, number>;
  projects: { id: string; title: string; description: string; techStack: string[]; githubUrl?: string; liveUrl?: string }[];
  certifications: { id: string; name: string; issuer: string; date?: string; credentialUrl?: string }[];
  githubStats?: { username: string; publicRepos: number; followers: number; bio: string; topLanguages: string[]; topRepos: { name: string; stars: number; language: string; description: string }[] };
  linkedinData?: { strengthScore: number; profileTier: string; highlights: string[]; improvements: string[]; recruitersWillNotice: string };
  isPro: boolean;
}

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 28, c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg width="64" height="64" className="-rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#f0eeff" strokeWidth="6" />
          <motion.circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={c} initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (value / 100) * c }} transition={{ duration: 1, ease: "easeOut" }} />
        </svg>
        <span className="absolute text-sm font-black" style={{ color }}>{value}</span>
      </div>
      <span className="text-[10px] font-bold text-[#9ca3af] uppercase">{label}</span>
    </div>
  );
}

export default function StudentDetail({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [shortlisted, setShortlisted] = useState<boolean>(false);
  const [contactRequested, setContactRequested] = useState(false);

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem("shortlist") || "[]");
    setShortlisted(list.includes(id));
    fetch(`/api/students/${id}/full-profile`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleShortlist = () => {
    const list: number[] = JSON.parse(localStorage.getItem("shortlist") || "[]");
    const updated = shortlisted ? list.filter(s => s !== id) : [...list, id];
    localStorage.setItem("shortlist", JSON.stringify(updated));
    setShortlisted(!shortlisted);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f7ff] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#7c3aed]/20 border-t-[#7c3aed] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#9ca3af]">Loading profile...</p>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-[#f8f7ff] flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-3">😕</p>
        <p className="text-lg font-bold text-[#1e1b4b]">Profile not found</p>
        <button onClick={() => setLocation("/talent")} className="mt-4 text-[#7c3aed] font-bold text-sm">← Back to Talent Pool</button>
      </div>
    </div>
  );

  const initials = profile.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
  const topSkills = Object.entries(profile.skills || {}).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 8);
  const strengthColor = profile.profileStrength >= 70 ? "#10b981" : profile.profileStrength >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      {/* Sticky top bar */}
      <div className="bg-white border-b border-[#f0eeff] sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={() => setLocation("/talent")} className="flex items-center gap-2 text-sm font-bold text-[#6b7280] hover:text-[#1e1b4b] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Talent Pool
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleShortlist}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${shortlisted ? "bg-[#7c3aed] text-white" : "bg-[#f5f3ff] text-[#7c3aed] hover:bg-[#ede9fe]"}`}
            >
              {shortlisted ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {shortlisted ? "Shortlisted" : "Shortlist"}
            </button>
            <button
              onClick={() => setContactRequested(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] text-white rounded-xl text-sm font-bold shadow-[0_4px_12px_rgba(124,58,237,0.3)] hover:shadow-[0_8px_20px_rgba(124,58,237,0.4)] transition-all"
            >
              {contactRequested ? <><Check className="w-4 h-4" /> Request Sent</> : "Request Contact Info"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Hero card */}
        <div className="bg-white rounded-3xl border border-[#f0eeff] overflow-hidden">
          <div className="bg-gradient-to-br from-[#7c3aed] to-[#4338ca] p-8">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-3xl font-black text-white flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-2xl font-black text-white">{profile.name}</h1>
                  {profile.openToWork && (
                    <span className="flex items-center gap-1 text-xs font-black text-[#10b981] bg-[#10b981]/20 border border-[#10b981]/30 px-3 py-1 rounded-full">
                      <span className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" /> Open to Opportunities
                    </span>
                  )}
                  {profile.isPro && <span className="text-xs font-black text-[#f59e0b] bg-[#fef3c7] px-2 py-1 rounded-full">PRO</span>}
                </div>
                <p className="text-white/70 font-medium">{profile.college}</p>
                <p className="text-white/50 text-sm mt-0.5">{profile.field} · Year {profile.year} · {profile.city}</p>
                {profile.bio && <p className="text-white/80 text-sm mt-3 leading-relaxed">{profile.bio}</p>}
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Score rings */}
            <div className="flex items-center justify-around mb-6">
              <ScoreRing value={profile.profileStrength} label="Profile" color={strengthColor} />
              <ScoreRing value={profile.commitmentScore} label="Commitment" color="#7c3aed" />
              <ScoreRing value={profile.overallScore} label="AI Score" color="#06b6d4" />
              {profile.cgpa && <ScoreRing value={parseFloat(profile.cgpa) * 10} label={`CGPA ${profile.cgpa}`} color="#f59e0b" />}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                profile.workMode && { icon: Briefcase, label: "Work Mode", value: (profile.workMode.charAt(0).toUpperCase() + profile.workMode.slice(1)), color: "#7c3aed" },
                profile.expectedSalary && { icon: TrendingUp, label: "Expected", value: profile.expectedSalary, color: "#10b981" },
                profile.preferredLocations.length > 0 && { icon: MapPin, label: "Cities", value: profile.preferredLocations.slice(0, 2).join(", "), color: "#06b6d4" },
                profile.dreamCompany && { icon: Building2, label: "Dream Co", value: profile.dreamCompany, color: "#f59e0b" },
                profile.targetPackage && { icon: TrendingUp, label: "Target", value: profile.targetPackage, color: "#f97316" },
              ].filter(Boolean).map((item: any) => (
                <div key={item.label} className="bg-[#fafafa] rounded-xl p-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}18` }}>
                    <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[#9ca3af] uppercase">{item.label}</p>
                    <p className="text-sm font-bold text-[#1e1b4b] truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-[#f5f3ff]">
              {profile.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-bold text-[#1e1b4b] hover:text-[#7c3aed] transition-colors"><Github className="w-4 h-4" /> GitHub <ExternalLink className="w-3 h-3" /></a>}
              {profile.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-bold text-[#0077b5] hover:opacity-80 transition-opacity"><Linkedin className="w-4 h-4" /> LinkedIn <ExternalLink className="w-3 h-3" /></a>}
              {profile.portfolioUrl && <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-bold text-[#7c3aed] hover:opacity-80 transition-opacity"><Globe className="w-4 h-4" /> Portfolio <ExternalLink className="w-3 h-3" /></a>}
              {contactRequested && profile.phone && <span className="flex items-center gap-1.5 text-sm font-bold text-[#10b981]"><Phone className="w-4 h-4" /> {profile.phone}</span>}
              {contactRequested && <span className="flex items-center gap-1.5 text-sm font-bold text-[#10b981]"><Mail className="w-4 h-4" /> {profile.email}</span>}
              {!contactRequested && <span className="text-sm text-[#9ca3af] italic">Click "Request Contact Info" to see email & phone</span>}
            </div>
          </div>
        </div>

        {/* GitHub stats */}
        {profile.githubStats && (
          <div className="bg-white rounded-2xl border border-[#f0eeff] p-6">
            <h2 className="font-black text-[#1e1b4b] text-lg mb-4 flex items-center gap-2"><Github className="w-5 h-5" /> GitHub Analysis</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Username", value: `@${profile.githubStats.username}` },
                { label: "Public Repos", value: profile.githubStats.publicRepos },
                { label: "Followers", value: profile.githubStats.followers },
                { label: "Top Language", value: profile.githubStats.topLanguages[0] || "—" },
              ].map(stat => (
                <div key={stat.label} className="bg-[#fafafa] rounded-xl p-3 text-center">
                  <p className="font-black text-[#1e1b4b] text-base">{stat.value}</p>
                  <p className="text-[10px] text-[#9ca3af] uppercase font-bold mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.githubStats.topLanguages.map(lang => (
                <span key={lang} className="text-xs font-bold bg-[#f5f3ff] text-[#7c3aed] px-3 py-1 rounded-full">{lang}</span>
              ))}
            </div>
            {profile.githubStats.topRepos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#9ca3af] uppercase">Top Repos</p>
                {profile.githubStats.topRepos.map(repo => (
                  <div key={repo.name} className="flex items-center justify-between bg-[#fafafa] rounded-xl p-3">
                    <div>
                      <p className="font-bold text-sm text-[#1e1b4b]">{repo.name}</p>
                      {repo.description && <p className="text-xs text-[#9ca3af] mt-0.5 truncate max-w-xs">{repo.description}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      {repo.language && <span className="text-xs text-[#7c3aed] font-bold">{repo.language}</span>}
                      <span className="text-xs text-[#6b7280] flex items-center gap-1"><Star className="w-3 h-3" />{repo.stars}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Skills */}
        {topSkills.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#f0eeff] p-6">
            <h2 className="font-black text-[#1e1b4b] text-lg mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#7c3aed]" /> Skills</h2>
            <div className="space-y-3">
              {topSkills.map(([name, score]) => {
                const s = score as number;
                const color = s >= 70 ? "#10b981" : s >= 40 ? "#f97316" : "#ef4444";
                return (
                  <div key={name} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-[#1e1b4b]">{name}</span>
                      <span className="font-black" style={{ color }}>{Math.round(s)}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#f5f3ff] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${s}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full" style={{ background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Projects */}
        {profile.projects.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#f0eeff] p-6">
            <h2 className="font-black text-[#1e1b4b] text-lg mb-4 flex items-center gap-2"><Code2 className="w-5 h-5 text-[#7c3aed]" /> Projects ({profile.projects.length})</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {profile.projects.map(proj => (
                <div key={proj.id} className="bg-[#fafafa] rounded-xl p-4 border border-[#f0eeff]">
                  <h3 className="font-black text-[#1e1b4b] text-base mb-1">{proj.title}</h3>
                  {proj.description && <p className="text-xs text-[#6b7280] leading-relaxed mb-2">{proj.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {proj.techStack.map(t => <span key={t} className="text-[10px] font-bold bg-white border border-[#e5e7eb] text-[#7c3aed] px-2 py-0.5 rounded-md">{t}</span>)}
                  </div>
                  <div className="flex gap-3">
                    {proj.githubUrl && <a href={proj.githubUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#1e1b4b] flex items-center gap-1 hover:text-[#7c3aed]"><Github className="w-3 h-3" /> Code</a>}
                    {proj.liveUrl && <a href={proj.liveUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#7c3aed] flex items-center gap-1 hover:opacity-80"><ExternalLink className="w-3 h-3" /> Live</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {profile.certifications.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#f0eeff] p-6">
            <h2 className="font-black text-[#1e1b4b] text-lg mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-[#f59e0b]" /> Certifications</h2>
            <div className="space-y-2">
              {profile.certifications.map(cert => (
                <div key={cert.id} className="flex items-center gap-3 bg-[#fffbeb] rounded-xl p-3">
                  <div className="w-8 h-8 rounded-xl bg-[#f59e0b]/20 flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-[#f59e0b]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-[#1e1b4b]">{cert.name}</p>
                    <p className="text-xs text-[#9ca3af]">{cert.issuer}{cert.date ? ` · ${cert.date}` : ""}</p>
                  </div>
                  {cert.credentialUrl && <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-[#7c3aed] hover:opacity-80"><ExternalLink className="w-3.5 h-3.5" /></a>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LinkedIn AI feedback */}
        {profile.linkedinData && (
          <div className="bg-white rounded-2xl border border-[#f0eeff] p-6">
            <h2 className="font-black text-[#1e1b4b] text-lg mb-4 flex items-center gap-2"><Linkedin className="w-5 h-5 text-[#0077b5]" /> LinkedIn AI Analysis</h2>
            {profile.linkedinData.recruitersWillNotice && (
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 mb-4">
                <p className="text-sm font-bold text-[#10b981] mb-1">What stands out</p>
                <p className="text-sm text-[#374151]">"{profile.linkedinData.recruitersWillNotice}"</p>
              </div>
            )}
            {profile.linkedinData.highlights?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold text-[#9ca3af] uppercase mb-2">Highlights</p>
                {profile.linkedinData.highlights.map((h: string, i: number) => (
                  <p key={i} className="text-sm text-[#374151] flex items-start gap-2 mb-1"><span className="text-[#10b981] mt-0.5">✓</span>{h}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
