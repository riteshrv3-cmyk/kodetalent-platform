import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft, Github, Linkedin, Globe, Phone, MapPin, Briefcase, Award,
  Code2, ExternalLink, Star, TrendingUp, Zap, GraduationCap, Building2, Mail
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "").replace("/tpo-portal", "");

interface FullProfile {
  id: number;
  name: string;
  email: string;
  college: string;
  city: string;
  year: number;
  field: string;
  cgpa?: string;
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
  githubStats?: { username: string; publicRepos: number; followers: number; topLanguages: string[]; topRepos: { name: string; stars: number; language: string; description: string }[] };
}

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 28, c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="w-16 h-16 -rotate-90 absolute">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} strokeLinecap="round" />
        </svg>
        <span className="text-sm font-bold relative z-10" style={{ color }}>{value}</span>
      </div>
      <span className="text-[11px] text-[#94a3b8] font-medium text-center leading-tight">{label}</span>
    </div>
  );
}

function SkillBar({ name, value }: { name: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#475569] w-28 truncate font-medium">{name}</span>
      <div className="flex-1 bg-[#f1f5f9] rounded-full h-2">
        <div className="h-full rounded-full bg-[#4f46e5]" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-bold text-[#475569] w-6 text-right">{value}</span>
    </div>
  );
}

export default function StudentProfile({ id }: { id: number }) {
  const [, nav] = useLocation();

  const { data: profile, isLoading, isError } = useQuery<FullProfile>({
    queryKey: ["full-profile", id],
    queryFn: () => fetch(`${BASE}/api/students/${id}/full-profile`).then(r => { if (!r.ok) throw new Error("not found"); return r.json(); }),
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="px-8 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[#f1f5f9] rounded-xl w-1/3" />
        <div className="h-48 bg-[#f1f5f9] rounded-2xl" />
        <div className="h-32 bg-[#f1f5f9] rounded-2xl" />
      </div>
    </div>
  );

  if (isError || !profile) return (
    <div className="px-8 py-8 text-center text-[#94a3b8]">Student not found</div>
  );

  const topSkills = Object.entries(profile.skills || {}).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 8);
  const strengthColor = (profile.profileStrength ?? 0) >= 70 ? "#10b981" : (profile.profileStrength ?? 0) >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Back + header */}
      <button onClick={() => nav("/students")} className="flex items-center gap-2 text-sm font-semibold text-[#64748b] hover:text-[#1e293b] transition mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Students
      </button>

      {/* Identity card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#6366f1] flex items-center justify-center text-white text-xl font-bold">
              {profile.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-[#1e293b]">{profile.name}</h1>
                {profile.openToWork && (
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">Open to Work</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-[#64748b]">
                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{profile.college}</span>
                <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />Year {profile.year} · {profile.field}</span>
                {profile.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.city}</span>}
                {profile.cgpa && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />CGPA {profile.cgpa}</span>}
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-[#94a3b8]"><Mail className="w-3.5 h-3.5" />{profile.email}</span>
                {profile.phone && <span className="flex items-center gap-1 text-xs text-[#94a3b8]"><Phone className="w-3.5 h-3.5" />{profile.phone}</span>}
                {profile.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[#4f46e5] hover:underline"><Github className="w-3.5 h-3.5" />GitHub</a>}
                {profile.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[#0077b5] hover:underline"><Linkedin className="w-3.5 h-3.5" />LinkedIn</a>}
                {profile.portfolioUrl && <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[#64748b] hover:underline"><Globe className="w-3.5 h-3.5" />Portfolio</a>}
              </div>
            </div>
          </div>

          {/* Score rings */}
          <div className="flex items-center gap-4">
            <ScoreRing value={profile.overallScore} label="Overall Score" color="#4f46e5" />
            <ScoreRing value={profile.profileStrength ?? 0} label="Profile %" color={strengthColor} />
            <ScoreRing value={profile.commitmentScore ?? 0} label="Commitment" color="#0ea5e9" />
          </div>
        </div>

        {profile.bio && (
          <div className="mt-4 pt-4 border-t border-[#f1f5f9]">
            <p className="text-sm text-[#475569] leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* XP / Level / Streak */}
        <div className="mt-4 pt-4 border-t border-[#f1f5f9] flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#f59e0b]" />
            <span className="text-sm font-bold text-[#1e293b]">{profile.xp.toLocaleString()} XP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-[#4f46e5]" />
            <span className="text-sm font-bold text-[#1e293b]">Level {profile.level}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#10b981]" />
            <span className="text-sm font-bold text-[#1e293b]">{profile.streakCount} day streak</span>
          </div>
          {profile.workMode && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-[#0ea5e9]" />
              <span className="text-sm text-[#64748b]">{profile.workMode}</span>
            </div>
          )}
          {profile.expectedSalary && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-[#64748b]">Expected: ₹{profile.expectedSalary} LPA</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Skills */}
        {topSkills.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="w-4 h-4 text-[#4f46e5]" />
              <h2 className="text-sm font-bold text-[#1e293b]">Top Skills</h2>
            </div>
            <div className="space-y-3">
              {topSkills.map(([name, value]) => <SkillBar key={name} name={name} value={value as number} />)}
            </div>
          </div>
        )}

        {/* GitHub stats */}
        {profile.githubStats && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Github className="w-4 h-4 text-[#1e293b]" />
              <h2 className="text-sm font-bold text-[#1e293b]">GitHub Activity</h2>
            </div>
            <div className="flex gap-4 mb-4">
              <div className="text-center">
                <p className="text-xl font-bold text-[#1e293b]">{profile.githubStats.publicRepos}</p>
                <p className="text-xs text-[#94a3b8]">Repos</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[#1e293b]">{profile.githubStats.followers}</p>
                <p className="text-xs text-[#94a3b8]">Followers</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {profile.githubStats.topLanguages.map(l => (
                <span key={l} className="text-xs bg-[#f8fafc] text-[#4f46e5] border border-[#e0e7ff] rounded-full px-2.5 py-0.5 font-medium">{l}</span>
              ))}
            </div>
            {profile.githubStats.topRepos.slice(0, 3).map(repo => (
              <div key={repo.name} className="flex items-start gap-2 py-2 border-t border-[#f1f5f9]">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#1e293b] truncate">{repo.name}</p>
                  {repo.description && <p className="text-xs text-[#94a3b8] truncate">{repo.description}</p>}
                </div>
                {repo.stars > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="w-3 h-3 text-[#f59e0b]" />
                    <span className="text-xs text-[#94a3b8]">{repo.stars}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects */}
      {profile.projects?.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="w-4 h-4 text-[#0ea5e9]" />
            <h2 className="text-sm font-bold text-[#1e293b]">Projects ({profile.projects.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profile.projects.map(p => (
              <div key={p.id} className="border border-[#e2e8f0] rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-[#1e293b]">{p.title}</p>
                  <div className="flex gap-1.5">
                    {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noreferrer"><Github className="w-3.5 h-3.5 text-[#94a3b8] hover:text-[#1e293b]" /></a>}
                    {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 text-[#94a3b8] hover:text-[#4f46e5]" /></a>}
                  </div>
                </div>
                <p className="text-xs text-[#64748b] mt-1 line-clamp-2">{p.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.techStack.map(t => <span key={t} className="text-[10px] bg-[#f1f5f9] text-[#64748b] rounded px-1.5 py-0.5">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {profile.certifications?.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-[#f59e0b]" />
            <h2 className="text-sm font-bold text-[#1e293b]">Certifications ({profile.certifications.length})</h2>
          </div>
          <div className="space-y-2.5">
            {profile.certifications.map(cert => (
              <div key={cert.id} className="flex items-center justify-between py-2 border-b border-[#f1f5f9] last:border-0">
                <div>
                  <p className="text-sm font-semibold text-[#1e293b]">{cert.name}</p>
                  <p className="text-xs text-[#94a3b8]">{cert.issuer}{cert.date ? ` · ${cert.date}` : ""}</p>
                </div>
                {cert.credentialUrl && (
                  <a href={cert.credentialUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 text-[#4f46e5]" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
