import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github, Linkedin, Globe, Phone, Edit2, Check, X, Plus, Trash2,
  Briefcase, Award, MapPin, DollarSign, FileText,
  Loader2, ExternalLink, Star,
  Code2, Building2, TrendingUp, Zap, ChevronRight, Sparkles,
  Camera, User, BookOpen, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { apiFetch } from "@/lib/api/authFetch";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  liveUrl?: string;
}
interface Certification {
  id: string;
  name: string;
  issuer: string;
  date?: string;
  credentialUrl?: string;
}
interface GitHubStats {
  username: string;
  publicRepos: number;
  followers: number;
  bio: string;
  topLanguages: string[];
  topRepos: { name: string; stars: number; language: string; description: string }[];
  analyzedAt: string;
}
interface LinkedInData {
  strengthScore: number;
  profileTier: string;
  highlights: string[];
  improvements: string[];
  recruitersWillNotice: string;
}
interface FullProfile {
  id: number;
  name: string;
  email: string;
  college: string;
  city: string;
  year: number;
  field: string;
  photoUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  phone?: string;
  bio?: string;
  cgpa?: string;
  targetPackage?: string;
  dreamCompany?: string;
  projects: Project[];
  certifications: Certification[];
  openToWork: boolean;
  workMode?: string;
  preferredLocations: string[];
  expectedSalary?: string;
  githubStats?: GitHubStats;
  linkedinData?: LinkedInData;
  profileStrength: number;
  commitmentScore: number;
  overallScore: number;
  xp: number;
  level: number;
  streakCount: number;
  skills: Record<string, number>;
  isPro: boolean;
}

async function fetchProfile(id: number): Promise<FullProfile> {
  const r = await apiFetch(`/api/students/${id}/full-profile`);
  if (!r.ok) throw new Error("Failed to load profile");
  return r.json();
}

async function patchProfile(id: number, data: Record<string, unknown>) {
  const r = await apiFetch(`/api/students/${id}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error("Failed to save");
  return r.json();
}

// ─── Strength Ring ────────────────────────────────────────────────────────────

function StrengthRing({ value }: { value: number }) {
  const r = 36, c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#ececf0" strokeWidth="8" />
        <motion.circle
          cx="48" cy="48" r={r} fill="none" stroke="#0f0f10" strokeWidth="8"
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-extrabold" style={{ color: "#0f0f10" }}>{value}%</span>
        <span className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">Profile</span>
      </div>
    </div>
  );
}

// ─── My Resumes Card ──────────────────────────────────────────────────────────

const TEMPLATE_BADGES: Record<string, { label: string; badge: string }> = {
  classic: { label: "Classic", badge: "border border-line text-ink-muted" },
  tech: { label: "Tech", badge: "border border-line text-ink-muted" },
  minimal: { label: "Minimal", badge: "border border-line text-ink-muted" },
};

function MyResumesCard({ studentId, onNavigate }: { studentId: number; onNavigate: () => void }) {
  const [resumes, setResumes] = useState<{ id: number; name: string; templateId: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/students/${studentId}/resumes`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setResumes(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(() => setResumes([]))
      .finally(() => setLoading(false));
  }, [studentId]);

  return (
    <div className="border border-line rounded-2xl bg-paper">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold text-ink flex items-center gap-2">
            <FileText className="w-4 h-4 text-ink" /> My Resumes
          </h3>
          <button onClick={onNavigate} className="text-[11px] font-bold text-ink flex items-center gap-0.5">
            Open <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-3/4 rounded-xl" />
          </div>
        ) : resumes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <Sparkles className="w-5 h-5 text-ink-muted" />
            <p className="text-[12px] text-ink-muted">AI-tailored to any JD · 3 templates</p>
            <button
              onClick={onNavigate}
              className="w-full mt-1 bg-ink text-paper text-[13px] font-bold rounded-xl px-4 py-3"
            >
              Generate your first resume
            </button>
          </div>
        ) : (
          <div>
            {resumes.map(r => {
              const tmpl = TEMPLATE_BADGES[r.templateId] ?? TEMPLATE_BADGES["classic"];
              const date = new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
              return (
                <div key={r.id} className="flex items-center justify-between py-3 border-t border-line first:border-t-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-ink truncate">{r.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${tmpl.badge}`}>{tmpl.label}</span>
                      <span className="text-[10px] text-ink-muted">{date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {resumes.length > 0 && (
              <button
                onClick={onNavigate}
                className="w-full mt-3 bg-ink text-paper text-[13px] font-bold py-3 rounded-xl"
              >
                View all & download →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Work Mode Picker ─────────────────────────────────────────────────────────

const WORK_MODES = ["remote", "hybrid", "onsite"];

const YEAR_OPTIONS = [1, 2, 3, 4, 5];
const FIELD_OPTIONS = [
  "Computer Science", "Information Technology", "Electronics & Communication",
  "Electrical Engineering", "Mechanical Engineering", "Civil Engineering",
  "Chemical Engineering", "Biotechnology", "Data Science", "Artificial Intelligence",
  "Cybersecurity", "Other",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editSection, setEditSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState<"github" | "linkedin" | null>(null);

  // ── Edit buffers ──────────────────────────────────────────────────────────
  const [basicForm, setBasicForm] = useState({
    name: "", college: "", city: "", year: 1, field: "", cgpa: "", photoUrl: "",
  });
  const [linksForm, setLinksForm] = useState({ githubUrl: "", linkedinUrl: "", portfolioUrl: "", phone: "" });
  const [bioForm, setBioForm] = useState("");
  const [prefsForm, setPrefsForm] = useState({ workMode: "hybrid", preferredLocations: "", expectedSalary: "" });
  const [newProject, setNewProject] = useState<Omit<Project, "id">>({ title: "", description: "", techStack: [], githubUrl: "", liveUrl: "" });
  const [newCert, setNewCert] = useState<Omit<Certification, "id">>({ name: "", issuer: "", date: "", credentialUrl: "" });
  const [techInput, setTechInput] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddCert, setShowAddCert] = useState(false);
  const [linkedinForm, setLinkedinForm] = useState({ headline: "", summary: "", skills: "", experience: "" });
  const [showLinkedinForm, setShowLinkedinForm] = useState(false);

  const [photoPreview, setPhotoPreview] = useState<string>("");

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) { setLocation("/"); return; }
    setStudentId(parseInt(id, 10));
  }, [setLocation]);

  // Course → Project bridge
  useEffect(() => {
    if (!profile) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("addProject") !== "1") return;
    const from = params.get("from") || "";
    const tech = (params.get("tech") || "").split(",").map(s => s.trim()).filter(Boolean);
    setNewProject({
      title: from ? `${from} project` : "",
      description: from ? `A project I built while learning ${from}.` : "",
      techStack: tech, githubUrl: "", liveUrl: "",
    });
    setShowAddProject(true);
    setTimeout(() => {
      document.getElementById("projects-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, "", cleanUrl);
  }, [profile]);

  const loadProfile = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const p = await fetchProfile(id);
      setProfile(p);
      setBasicForm({
        name: p.name,
        college: p.college === "Not set" ? "" : p.college,
        city: p.city === "Not set" ? "" : p.city,
        year: p.year,
        field: p.field === "Not set" ? "" : p.field,
        cgpa: p.cgpa || "",
        photoUrl: p.photoUrl || "",
      });
      setPhotoPreview(p.photoUrl || "");
      setLinksForm({ githubUrl: p.githubUrl || "", linkedinUrl: p.linkedinUrl || "", portfolioUrl: p.portfolioUrl || "", phone: p.phone || "" });
      setBioForm(p.bio || "");
      setPrefsForm({ workMode: p.workMode || "hybrid", preferredLocations: (p.preferredLocations || []).join(", "), expectedSalary: p.expectedSalary || "" });
    } catch {
      toast({ title: "Error loading profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (studentId) loadProfile(studentId);
  }, [studentId, loadProfile]);

  const save = async (data: Record<string, unknown>, section: string) => {
    if (!studentId) return;
    setSaving(true);
    try {
      const result = await patchProfile(studentId, data);
      await loadProfile(studentId);
      setEditSection(null);
      if (result.profileStrength === 100) {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.4 }, colors: ["#0f0f10", "#9a9aa2", "#ececf0"] });
      }
      toast({ title: `${section} saved!` });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveBasic = () => save({
    name: basicForm.name.trim(),
    college: basicForm.college.trim(),
    city: basicForm.city.trim(),
    year: Number(basicForm.year),
    field: basicForm.field.trim(),
    cgpa: basicForm.cgpa.trim(),
    photoUrl: basicForm.photoUrl.trim(),
  }, "Profile");

  const toggleOpenToWork = async () => {
    if (!profile || !studentId) return;
    await patchProfile(studentId, { openToWork: !profile.openToWork });
    setProfile(prev => prev ? { ...prev, openToWork: !prev.openToWork } : prev);
    toast({ title: profile.openToWork ? "Hidden from recruiters" : "Now visible to recruiters!" });
  };

  const analyzeGitHub = async () => {
    if (!studentId || !linksForm.githubUrl) return;
    setAnalyzing("github");
    try {
      const r = await apiFetch(`/api/students/${studentId}/analyze-github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl: linksForm.githubUrl }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      await loadProfile(studentId);
      setEditSection(null);
      toast({ title: "GitHub analyzed! Profile updated." });
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "GitHub analysis failed", variant: "destructive" });
    } finally {
      setAnalyzing(null);
    }
  };

  const analyzeLinkedIn = async () => {
    if (!studentId || !linksForm.linkedinUrl) return;
    setAnalyzing("linkedin");
    try {
      const r = await apiFetch(`/api/students/${studentId}/analyze-linkedin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedinUrl: linksForm.linkedinUrl,
          headline: linkedinForm.headline,
          summary: linkedinForm.summary,
          skills: linkedinForm.skills.split(",").map(s => s.trim()).filter(Boolean),
          experience: linkedinForm.experience,
        }),
      });
      if (!r.ok) throw new Error("Failed");
      await loadProfile(studentId);
      setShowLinkedinForm(false);
      setEditSection(null);
      toast({ title: "LinkedIn analyzed! AI feedback ready." });
    } catch {
      toast({ title: "LinkedIn analysis failed", variant: "destructive" });
    } finally {
      setAnalyzing(null);
    }
  };

  const addProject = async () => {
    if (!profile || !studentId || !newProject.title) return;
    const updated: Project[] = [...profile.projects, { ...newProject, id: `p_${Date.now()}` }];
    await save({ projects: updated }, "Project added");
    setNewProject({ title: "", description: "", techStack: [], githubUrl: "", liveUrl: "" });
    setTechInput("");
    setShowAddProject(false);
  };

  const removeProject = async (id: string) => {
    if (!profile || !studentId) return;
    await save({ projects: profile.projects.filter(p => p.id !== id) }, "Project removed");
  };

  const addCert = async () => {
    if (!profile || !studentId || !newCert.name) return;
    const updated: Certification[] = [...profile.certifications, { ...newCert, id: `c_${Date.now()}` }];
    await save({ certifications: updated }, "Certification added");
    setNewCert({ name: "", issuer: "", date: "", credentialUrl: "" });
    setShowAddCert(false);
  };

  const removeCert = async (id: string) => {
    if (!profile || !studentId) return;
    await save({ certifications: profile.certifications.filter(c => c.id !== id) }, "Certification removed");
  };

  if (loading || !profile) {
    return (
      <div className="p-4 space-y-4 bg-paper min-h-screen">
        <div className="flex flex-col items-center py-8 gap-4">
          <Skeleton className="h-28 w-28 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
      </div>
    );
  }

  const initials = profile.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();

  const strengthTips = [
    !profile.githubUrl && "Add GitHub URL",
    !profile.linkedinUrl && "Add LinkedIn URL",
    !profile.bio && "Write a short bio",
    profile.projects.length === 0 && "Add at least 1 project",
    !profile.phone && "Add phone number",
    profile.certifications.length === 0 && "Add a certification",
    !profile.expectedSalary && "Set expected salary",
    !profile.githubStats && profile.githubUrl && "Analyze your GitHub",
  ].filter(Boolean) as string[];

  const GENERIC_SKILLS = new Set(["dsa","data structures","algorithms","problem solving","communication","teamwork","leadership","time management","critical thinking","git","linux","python","networking"]);
  const topSkills = Object.entries(profile.skills || {})
    .filter(([name]) => !GENERIC_SKILLS.has(name.toLowerCase().trim()))
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5);

  const isEditingBasic = editSection === "basic";
  const isGuest = profile.name === "Guest" || profile.email?.startsWith("guest_");

  return (
    <div className="pb-28 max-w-md mx-auto min-h-screen bg-paper">

      {/* Guest banner */}
      {isGuest && (
        <div className="border border-line rounded-2xl mx-4 mt-4 px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-ink">Exploring as Guest</p>
            <p className="text-[12px] text-ink-muted">Sign in to save your real profile</p>
          </div>
          <button
            onClick={() => setLocation("/sign-up")}
            className="shrink-0 bg-ink text-paper text-[13px] font-bold px-4 py-2.5 rounded-xl"
          >
            Sign In →
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="relative bg-paper pt-8 pb-6 px-6">

        {/* Edit profile button top-right */}
        <button
          onClick={() => setEditSection(isEditingBasic ? null : "basic")}
          className="absolute top-6 right-6 flex items-center gap-1.5 border border-line rounded-xl px-3 py-1.5 text-[11px] font-bold text-ink"
        >
          {isEditingBasic ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
          {isEditingBasic ? "Cancel" : "Edit Profile"}
        </button>

        {/* Avatar */}
        <div className="relative inline-block">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={profile.name}
              className="w-20 h-20 rounded-full border-2 border-line object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-paper border-2 border-line flex items-center justify-center text-[24px] font-extrabold text-ink">
              {initials}
            </div>
          )}

          {/* Camera overlay */}
          <button
            onClick={() => setEditSection("basic")}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-paper border border-line flex items-center justify-center"
          >
            <Camera className="w-3.5 h-3.5 text-ink-muted" />
          </button>
        </div>

        {/* Open to work badge */}
        <div className="mt-3">
          <button
            onClick={toggleOpenToWork}
            className="inline-flex items-center gap-1 border border-line rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted"
          >
            {profile.openToWork ? "OPEN" : "CLOSED"}
          </button>
        </div>

        <h1 className="text-[26px] font-extrabold text-ink leading-[1.06] tracking-tight mt-3">{profile.name}</h1>
        {profile.college !== "Not set" && <p className="text-[12px] text-ink-muted mt-1">{profile.college}</p>}
        {profile.field !== "Not set" && (
          <p className="text-[12px] text-ink-muted mt-0.5">
            {profile.field} · Year {profile.year}{profile.city && profile.city !== "Not set" ? ` · ${profile.city}` : ""}
          </p>
        )}
        {profile.cgpa && <p className="text-[12px] text-ink-muted mt-0.5">CGPA {profile.cgpa}</p>}

        {profile.openToWork && (
          <p className="mt-2 text-[12px] font-semibold text-ink">Open to Opportunities</p>
        )}
      </div>

      <div className="px-4 space-y-4">

        {/* ── Edit Basic Info ── */}
        <AnimatePresence>
          {isEditingBasic && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="border border-line rounded-2xl overflow-hidden bg-paper">
                <div className="px-5 py-3 flex items-center justify-between border-b border-line">
                  <span className="text-[14px] font-bold text-ink flex items-center gap-2">
                    <User className="w-4 h-4 text-ink" /> Edit Profile
                  </span>
                  <button onClick={() => setEditSection(null)}>
                    <X className="w-4 h-4 text-ink-muted" />
                  </button>
                </div>
                <div className="p-5 space-y-3 bg-paper">

                  {/* Photo URL */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1">
                      <Camera className="w-3 h-3" /> Profile Photo URL
                    </p>
                    <div className="flex gap-2 items-center">
                      {photoPreview && (
                        <img
                          src={photoPreview}
                          alt="preview"
                          className="w-10 h-10 rounded-full object-cover border border-line flex-shrink-0"
                          onError={() => setPhotoPreview("")}
                        />
                      )}
                      <Input
                        placeholder="Paste photo URL (e.g. from Google Photos, LinkedIn)"
                        value={basicForm.photoUrl}
                        onChange={e => {
                          setBasicForm(f => ({ ...f, photoUrl: e.target.value }));
                          setPhotoPreview(e.target.value);
                        }}
                        className="text-sm flex-1"
                      />
                    </div>
                    <p className="text-[10px] text-ink-muted pl-1">Upload a photo to Google Drive / Imgur and paste the direct link here</p>
                  </div>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Full Name</p>
                    <Input
                      placeholder="Your full name"
                      value={basicForm.name}
                      onChange={e => setBasicForm(f => ({ ...f, name: e.target.value }))}
                      className="text-sm font-bold"
                    />
                  </div>

                  {/* College + City */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> College
                    </p>
                    <Input
                      placeholder="e.g. RVCE Bangalore, IIT Delhi"
                      value={basicForm.college}
                      onChange={e => setBasicForm(f => ({ ...f, college: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> City
                    </p>
                    <Input
                      placeholder="e.g. Bangalore"
                      value={basicForm.city}
                      onChange={e => setBasicForm(f => ({ ...f, city: e.target.value }))}
                      className="text-sm"
                    />
                  </div>

                  {/* Year + Field */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Year</p>
                      <div className="flex gap-1 flex-wrap">
                        {YEAR_OPTIONS.map(y => (
                          <button
                            key={y}
                            onClick={() => setBasicForm(f => ({ ...f, year: y }))}
                            className={`w-9 h-9 rounded-xl text-[14px] font-bold transition-colors ${basicForm.year === y ? "bg-ink text-paper" : "border border-line text-ink-muted"}`}
                          >
                            {y}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">CGPA</p>
                      <Input
                        placeholder="e.g. 8.5"
                        value={basicForm.cgpa}
                        onChange={e => setBasicForm(f => ({ ...f, cgpa: e.target.value }))}
                        className="text-sm"
                        inputMode="decimal"
                      />
                    </div>
                  </div>

                  {/* Field of study */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Field of Study
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {FIELD_OPTIONS.map(f => (
                        <button
                          key={f}
                          onClick={() => setBasicForm(prev => ({ ...prev, field: f }))}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors ${basicForm.field === f ? "bg-ink text-paper" : "border border-line text-ink-muted"}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="Or type your branch..."
                      value={FIELD_OPTIONS.includes(basicForm.field) ? "" : basicForm.field}
                      onChange={e => setBasicForm(prev => ({ ...prev, field: e.target.value }))}
                      className="text-sm mt-1"
                    />
                  </div>

                  <Button
                    onClick={saveBasic}
                    disabled={saving || !basicForm.name.trim() || !basicForm.college.trim()}
                    className="w-full bg-ink text-paper font-bold rounded-xl h-11"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Profile Strength ── */}
        <div className="border border-line rounded-2xl bg-paper">
          <div className="p-5">
            <div className="flex items-center gap-4">
              <StrengthRing value={profile.profileStrength} />
              <div className="flex-1">
                <h3 className="text-[14px] font-bold text-ink">Profile Strength</h3>
                {strengthTips.length > 0 ? (
                  <ul className="mt-1 space-y-0.5">
                    {strengthTips.slice(0, 2).map((tip, i) => (
                      <li key={i} className="text-[11px] text-ink-muted flex items-center gap-1">
                        <span className="text-ink-muted">+</span> {tip}
                      </li>
                    ))}
                    {strengthTips.length > 2 && (
                      <li className="text-[11px] text-ink-muted">+{strengthTips.length - 2} more</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-[12px] text-ink font-semibold mt-1">Profile complete!</p>
                )}
              </div>
            </div>

            {/* Only show scores when they have real data */}
            {(profile.githubUrl || profile.overallScore > 0) && (
              <div className={`grid gap-3 mt-4 pt-4 border-t border-line ${profile.githubUrl && profile.overallScore > 0 ? "grid-cols-2" : ""}`}>
                {profile.githubUrl && (
                  <div className="border border-line rounded-xl p-3 text-center">
                    <p className="text-xl font-extrabold text-ink">{profile.commitmentScore}</p>
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Commitment</p>
                  </div>
                )}
                {profile.overallScore > 0 && (
                  <div className="border border-line rounded-xl p-3 text-center">
                    <p className="text-xl font-extrabold text-ink">{Math.round(profile.overallScore)}</p>
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">AI Score</p>
                  </div>
                )}
              </div>
            )}

            {(profile.githubUrl || profile.overallScore > 0) && (
              <p className="text-[10px] text-center text-ink-muted mt-2">Recruiters see these scores on your profile</p>
            )}
          </div>
        </div>

        {/* ── Links Section ── */}
        <div className="border border-line rounded-2xl bg-paper">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-ink flex items-center gap-2"><Zap className="w-4 h-4 text-ink" /> Links</h3>
              <button onClick={() => setEditSection(editSection === "links" ? null : "links")} className="text-ink">
                {editSection === "links" ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              </button>
            </div>

            <AnimatePresence>
              {editSection === "links" ? (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="GitHub URL" value={linksForm.githubUrl} onChange={e => setLinksForm(f => ({ ...f, githubUrl: e.target.value }))} className="text-sm" />
                      <Button size="sm" variant="outline" onClick={analyzeGitHub} disabled={!linksForm.githubUrl || analyzing === "github"} className="whitespace-nowrap text-xs border border-line text-ink">
                        {analyzing === "github" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Analyze"}
                      </Button>
                    </div>
                    {linksForm.githubUrl && !showLinkedinForm && (
                      <p className="text-[10px] text-ink-muted pl-1">Tap Analyze to auto-fetch your GitHub stats</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="LinkedIn URL" value={linksForm.linkedinUrl} onChange={e => setLinksForm(f => ({ ...f, linkedinUrl: e.target.value }))} className="text-sm" />
                      <Button size="sm" variant="outline" onClick={() => setShowLinkedinForm(!showLinkedinForm)} disabled={!linksForm.linkedinUrl} className="whitespace-nowrap text-xs border border-line text-ink">
                        {showLinkedinForm ? "Hide" : "Analyze"}
                      </Button>
                    </div>
                    {showLinkedinForm && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pl-1">
                        <Input placeholder="LinkedIn Headline" value={linkedinForm.headline} onChange={e => setLinkedinForm(f => ({ ...f, headline: e.target.value }))} className="text-sm" />
                        <Input placeholder="Top skills (comma separated)" value={linkedinForm.skills} onChange={e => setLinkedinForm(f => ({ ...f, skills: e.target.value }))} className="text-sm" />
                        <Textarea placeholder="Brief experience summary..." value={linkedinForm.experience} onChange={e => setLinkedinForm(f => ({ ...f, experience: e.target.value }))} className="text-sm h-16" />
                        <Button
                          size="sm"
                          onClick={analyzeLinkedIn}
                          disabled={!linksForm.linkedinUrl || analyzing === "linkedin"}
                          className="w-full bg-ink text-paper font-bold rounded-xl"
                        >
                          {analyzing === "linkedin" ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Analyzing...</> : "Get AI Feedback on LinkedIn"}
                        </Button>
                      </motion.div>
                    )}
                  </div>

                  <Input placeholder="Portfolio / Website URL" value={linksForm.portfolioUrl} onChange={e => setLinksForm(f => ({ ...f, portfolioUrl: e.target.value }))} className="text-sm" />
                  <Input placeholder="Phone Number" value={linksForm.phone} onChange={e => setLinksForm(f => ({ ...f, phone: e.target.value }))} className="text-sm" />
                  <Button onClick={() => save({ ...linksForm }, "Links")} disabled={saving} className="w-full bg-ink text-paper font-bold rounded-xl">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-2" /> Save Links</>}
                  </Button>
                </motion.div>
              ) : (
                <div>
                  {[
                    { icon: Github, label: "GitHub", value: profile.githubUrl },
                    { icon: Linkedin, label: "LinkedIn", value: profile.linkedinUrl },
                    { icon: Globe, label: "Portfolio", value: profile.portfolioUrl },
                    { icon: Phone, label: "Phone", value: profile.phone },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 py-3 border-t border-line first:border-t-0">
                      <div className="w-8 h-8 rounded-full border border-line bg-paper flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-ink" />
                      </div>
                      {value ? (
                        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
                          className="text-[14px] font-semibold text-ink truncate flex-1">
                          {value.replace(/^https?:\/\/(www\.)?/, "")} <ExternalLink className="w-3 h-3 inline-block ml-0.5" />
                        </a>
                      ) : (
                        <span className="text-[14px] text-ink-muted">Add {label}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </AnimatePresence>

            {/* GitHub Stats */}
            {profile.githubStats && editSection !== "links" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-line">
                <div className="flex items-center gap-2 mb-3">
                  <Github className="w-4 h-4 text-ink" />
                  <span className="text-[14px] font-bold text-ink">@{profile.githubStats.username}</span>
                  <Badge className="text-[10px] bg-paper border-line text-ink-muted font-bold uppercase tracking-wider">Verified</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="border border-line rounded-xl p-2 text-center">
                    <p className="font-extrabold text-ink">{profile.githubStats.publicRepos}</p>
                    <p className="text-[10px] text-ink-muted">Repos</p>
                  </div>
                  <div className="border border-line rounded-xl p-2 text-center">
                    <p className="font-extrabold text-ink">{profile.githubStats.followers}</p>
                    <p className="text-[10px] text-ink-muted">Followers</p>
                  </div>
                </div>
                {profile.githubStats.topLanguages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.githubStats.topLanguages.map(lang => (
                      <Badge key={lang} className="text-[11px] bg-paper border-line text-ink-muted font-bold">{lang}</Badge>
                    ))}
                  </div>
                )}
                {profile.githubStats.topRepos.length > 0 && (
                  <div className="mt-3">
                    {profile.githubStats.topRepos.map(repo => (
                      <div key={repo.name} className="flex items-center justify-between text-[12px] py-2 border-t border-line first:border-t-0">
                        <span className="font-semibold text-ink truncate">{repo.name}</span>
                        <span className="flex items-center gap-1 text-ink-muted ml-2 shrink-0"><Star className="w-3 h-3" />{repo.stars}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* LinkedIn AI feedback */}
            {profile.linkedinData && editSection !== "links" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-line">
                <div className="flex items-center gap-2 mb-2">
                  <Linkedin className="w-4 h-4 text-ink" />
                  <span className="text-[14px] font-bold text-ink">LinkedIn AI Feedback</span>
                  <Badge className="text-[10px] bg-paper border-line text-ink-muted font-bold uppercase tracking-wider">
                    {profile.linkedinData.profileTier}
                  </Badge>
                </div>
                {profile.linkedinData.recruitersWillNotice && (
                  <p className="text-[12px] text-ink-muted italic mb-2">"{profile.linkedinData.recruitersWillNotice}"</p>
                )}
                {profile.linkedinData.improvements?.slice(0, 2).map((tip: string, i: number) => (
                  <p key={i} className="text-[11px] text-ink-muted flex items-start gap-1"><span>→</span>{tip}</p>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* ── About / Bio ── */}
        <div className="border border-line rounded-2xl bg-paper">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-ink">About</h3>
              <button onClick={() => setEditSection(editSection === "bio" ? null : "bio")} className="text-ink">
                {editSection === "bio" ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              </button>
            </div>
            {editSection === "bio" ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <Textarea
                  value={bioForm}
                  onChange={e => setBioForm(e.target.value)}
                  placeholder="Write 2-3 lines about yourself. What makes you stand out? What are you passionate about building?"
                  className="h-28 text-sm"
                />
                <Button onClick={() => save({ bio: bioForm }, "About")} disabled={saving} className="w-full bg-ink text-paper font-bold rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-2" /> Save</>}
                </Button>
              </motion.div>
            ) : profile.bio ? (
              <p className="text-[14px] text-ink leading-relaxed">{profile.bio}</p>
            ) : (
              <button onClick={() => setEditSection("bio")} className="w-full py-3 border border-line rounded-xl text-[13px] font-bold text-ink transition-colors">
                + Write a short bio (helps recruiters remember you)
              </button>
            )}
          </div>
        </div>

        {/* ── Projects ── */}
        <div id="projects-section" className="border border-line rounded-2xl bg-paper scroll-mt-4">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-ink flex items-center gap-2"><Code2 className="w-4 h-4 text-ink" /> Projects</h3>
              <button onClick={() => setShowAddProject(!showAddProject)} className="flex items-center gap-1 text-[12px] font-bold text-ink">
                {showAddProject ? <X className="w-4 h-4" /> : <><Plus className="w-4 h-4" /> Add</>}
              </button>
            </div>

            <AnimatePresence>
              {showAddProject && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 space-y-2 overflow-hidden">
                  <Input placeholder="Project Title *" value={newProject.title} onChange={e => setNewProject(p => ({ ...p, title: e.target.value }))} className="text-sm" />
                  <Textarea placeholder="What does it do? Problem it solves?" value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} className="text-sm h-16" />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tech (press Enter)"
                      value={techInput}
                      onChange={e => setTechInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && techInput.trim()) {
                          setNewProject(p => ({ ...p, techStack: [...p.techStack, techInput.trim()] }));
                          setTechInput("");
                        }
                      }}
                      className="text-sm"
                    />
                  </div>
                  {newProject.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {newProject.techStack.map((t, i) => (
                        <Badge key={i} className="text-xs bg-paper border-line text-ink-muted cursor-pointer" onClick={() => setNewProject(p => ({ ...p, techStack: p.techStack.filter((_, j) => j !== i) }))}>{t} ×</Badge>
                      ))}
                    </div>
                  )}
                  <Input placeholder="GitHub URL (optional)" value={newProject.githubUrl || ""} onChange={e => setNewProject(p => ({ ...p, githubUrl: e.target.value }))} className="text-sm" />
                  <Input placeholder="Live URL (optional)" value={newProject.liveUrl || ""} onChange={e => setNewProject(p => ({ ...p, liveUrl: e.target.value }))} className="text-sm" />
                  <Button onClick={addProject} disabled={saving || !newProject.title} className="w-full bg-ink text-paper font-bold rounded-xl text-sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Project"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {profile.projects.length === 0 && !showAddProject && (
              <div className="text-center">
                <p className="text-[14px] text-ink">No projects yet</p>
                <p className="text-[12px] text-ink-muted mt-0.5">Recruiters love seeing real work</p>
                <button onClick={() => setShowAddProject(true)} className="w-full mt-3 bg-ink text-paper text-[13px] font-bold rounded-xl px-4 py-3">
                  Add your first project
                </button>
              </div>
            )}

            <div>
              {profile.projects.map(proj => (
                <div key={proj.id} className="py-4 border-t border-line first:border-t-0 relative group">
                  <button onClick={() => removeProject(proj.id)} className="absolute top-4 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-ink-muted">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <h4 className="text-[14px] font-semibold text-ink pr-6">{proj.title}</h4>
                  {proj.description && <p className="text-[12px] text-ink-muted mt-1 leading-relaxed">{proj.description}</p>}
                  {proj.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {proj.techStack.map(t => <Badge key={t} className="text-[10px] bg-paper text-ink-muted border-line">{t}</Badge>)}
                    </div>
                  )}
                  <div className="flex gap-3 mt-2">
                    {proj.githubUrl && <a href={proj.githubUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-ink flex items-center gap-1"><Github className="w-3 h-3" /> Code</a>}
                    {proj.liveUrl && <a href={proj.liveUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-ink flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Live</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Certifications ── */}
        <div className="border border-line rounded-2xl bg-paper">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-ink flex items-center gap-2"><Award className="w-4 h-4 text-ink" /> Certifications</h3>
              <button onClick={() => setShowAddCert(!showAddCert)} className="flex items-center gap-1 text-[12px] font-bold text-ink">
                {showAddCert ? <X className="w-4 h-4" /> : <><Plus className="w-4 h-4" /> Add</>}
              </button>
            </div>

            <AnimatePresence>
              {showAddCert && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 space-y-2 overflow-hidden">
                  <Input placeholder="Certificate Name *" value={newCert.name} onChange={e => setNewCert(c => ({ ...c, name: e.target.value }))} className="text-sm" />
                  <Input placeholder="Issuer (e.g. Google, AWS, Coursera)" value={newCert.issuer} onChange={e => setNewCert(c => ({ ...c, issuer: e.target.value }))} className="text-sm" />
                  <Input placeholder="Date (e.g. March 2024)" value={newCert.date || ""} onChange={e => setNewCert(c => ({ ...c, date: e.target.value }))} className="text-sm" />
                  <Input placeholder="Credential URL (optional)" value={newCert.credentialUrl || ""} onChange={e => setNewCert(c => ({ ...c, credentialUrl: e.target.value }))} className="text-sm" />
                  <Button onClick={addCert} disabled={saving || !newCert.name} className="w-full bg-ink text-paper font-bold rounded-xl text-sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Certification"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {profile.certifications.length === 0 && !showAddCert && (
              <div className="text-center">
                <p className="text-[14px] text-ink">No certifications yet</p>
                <p className="text-[12px] text-ink-muted mt-0.5">AWS, Google, Coursera, etc.</p>
                <button onClick={() => setShowAddCert(true)} className="w-full mt-3 bg-ink text-paper text-[13px] font-bold rounded-xl px-4 py-3">
                  Add a certification
                </button>
              </div>
            )}

            <div>
              {profile.certifications.map(cert => (
                <div key={cert.id} className="flex items-center gap-3 py-4 border-t border-line first:border-t-0 relative group">
                  <div className="w-8 h-8 rounded-full border border-line bg-paper flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4 text-ink" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-ink truncate">{cert.name}</p>
                    <p className="text-[12px] text-ink-muted">{cert.issuer}{cert.date ? ` · ${cert.date}` : ""}</p>
                  </div>
                  <button onClick={() => removeCert(cert.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-muted shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Job Preferences ── */}
        <div className="border border-line rounded-2xl bg-paper">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-ink flex items-center gap-2"><Briefcase className="w-4 h-4 text-ink" /> Job Preferences</h3>
              <button onClick={() => setEditSection(editSection === "prefs" ? null : "prefs")} className="text-ink">
                {editSection === "prefs" ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              </button>
            </div>

            {editSection === "prefs" ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div>
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">Work Mode</p>
                  <div className="grid grid-cols-3 gap-2">
                    {WORK_MODES.map(mode => (
                      <button
                        key={mode}
                        onClick={() => setPrefsForm(f => ({ ...f, workMode: mode }))}
                        className={`py-2 rounded-xl text-[13px] font-bold transition-colors ${prefsForm.workMode === mode ? "bg-ink text-paper" : "border border-line text-ink-muted"}`}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">Preferred Cities</p>
                  <Input placeholder="Bangalore, Mumbai, Remote..." value={prefsForm.preferredLocations} onChange={e => setPrefsForm(f => ({ ...f, preferredLocations: e.target.value }))} className="text-sm" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">Expected Salary (LPA)</p>
                  <Input placeholder="e.g. 8-12 LPA" value={prefsForm.expectedSalary} onChange={e => setPrefsForm(f => ({ ...f, expectedSalary: e.target.value }))} className="text-sm" />
                </div>
                <Button
                  onClick={() => save({
                    workMode: prefsForm.workMode,
                    preferredLocations: prefsForm.preferredLocations.split(",").map(s => s.trim()).filter(Boolean),
                    expectedSalary: prefsForm.expectedSalary,
                  }, "Preferences")}
                  disabled={saving}
                  className="w-full bg-ink text-paper font-bold rounded-xl"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-2" /> Save Preferences</>}
                </Button>
              </motion.div>
            ) : (
              <div>
                <div className="flex items-center gap-3 py-3 border-t border-line first:border-t-0">
                  <div className="w-8 h-8 rounded-full border border-line bg-paper flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4 text-ink" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Work Mode</p>
                    <p className="text-[14px] font-semibold text-ink">{(profile.workMode || "hybrid").charAt(0).toUpperCase() + (profile.workMode || "hybrid").slice(1)}</p>
                  </div>
                </div>
                {profile.preferredLocations.length > 0 && (
                  <div className="flex items-center gap-3 py-3 border-t border-line">
                    <div className="w-8 h-8 rounded-full border border-line bg-paper flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-ink" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Preferred Cities</p>
                      <p className="text-[14px] font-semibold text-ink">{profile.preferredLocations.join(", ")}</p>
                    </div>
                  </div>
                )}
                {profile.expectedSalary && (
                  <div className="flex items-center gap-3 py-3 border-t border-line">
                    <div className="w-8 h-8 rounded-full border border-line bg-paper flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4 text-ink" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Expected Salary</p>
                      <p className="text-[14px] font-semibold text-ink">{profile.expectedSalary}</p>
                    </div>
                  </div>
                )}
                {!profile.preferredLocations.length && !profile.expectedSalary && (
                  <button onClick={() => setEditSection("prefs")} className="w-full mt-3 border border-line rounded-xl py-3 text-[13px] font-bold text-ink transition-colors">
                    + Add job preferences
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Skills (only when populated by AI/quiz) ── */}
        {topSkills.length > 0 && (
          <div className="border border-line rounded-2xl bg-paper">
            <div className="p-5">
              <h3 className="text-[14px] font-bold text-ink mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-ink" /> Skills</h3>
              <div className="space-y-3">
                {topSkills.map(([name, score]) => {
                  const s = score as number;
                  return (
                    <div key={name} className="space-y-1.5">
                      <div className="flex justify-between text-[14px]">
                        <span className="font-semibold text-ink">{name}</span>
                        <span className="font-extrabold text-ink">{Math.round(s)}%</span>
                      </div>
                      <div className="h-2 w-full bg-line rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${s}%` }} transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full rounded-full bg-ink" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── My Resumes ── */}
        <MyResumesCard studentId={studentId!} onNavigate={() => setLocation("/resume")} />

        {/* ── Resume ── */}
        <div className="pb-4">
          <Button
            variant="outline"
            className="w-full h-14 rounded-2xl font-bold border border-line text-ink text-sm bg-paper"
            onClick={() => setLocation("/resume")}
          >
            <FileText className="w-4 h-4 mr-2" /> Resume
          </Button>
        </div>
      </div>
    </div>
  );
}
