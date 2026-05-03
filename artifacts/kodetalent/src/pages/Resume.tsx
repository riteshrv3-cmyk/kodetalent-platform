import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Download, FileText, Github, Mail, MapPin, Award, Zap } from "lucide-react";
import { useGetStudentDashboard } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import jsPDF from "jspdf";

const FIELD_DEGREES: Record<string, string> = {
  "Computer Science": "B.Tech Computer Science & Engineering",
  "Electronics": "B.Tech Electronics & Communication Engineering",
  "Mechanical": "B.Tech Mechanical Engineering",
  "Civil": "B.Tech Civil Engineering",
  "Electrical": "B.Tech Electrical Engineering",
  "Information Technology": "B.Tech Information Technology",
  "Data Science": "B.Tech Data Science & AI",
};

const FIELD_SKILLS: Record<string, string[][]> = {
  "Computer Science": [
    ["Languages", "C++, Python, Java, JavaScript"],
    ["Web & Backend", "React, Node.js, Express, REST APIs"],
    ["DSA & CS", "Data Structures, Algorithms, OOP, DBMS, OS"],
    ["Tools", "Git, VS Code, Postman, Linux"],
  ],
  "Electronics": [
    ["Core", "Digital Electronics, VLSI, Embedded Systems, Microcontrollers"],
    ["Programming", "C, Python, MATLAB, VHDL"],
    ["Tools", "Proteus, Multisim, Arduino IDE, Keil"],
  ],
  "Data Science": [
    ["Languages", "Python, R, SQL"],
    ["ML/AI", "Scikit-learn, TensorFlow, Pandas, NumPy"],
    ["Visualization", "Matplotlib, Seaborn, Tableau"],
    ["Tools", "Jupyter, Git, Google Colab"],
  ],
  default: [
    ["Programming", "Python, C++, Java"],
    ["Tools", "Git, Linux, VS Code"],
    ["CS Fundamentals", "DSA, OOP, DBMS, OS"],
  ],
};

const FIELD_PROJECTS: Record<string, { title: string; tech: string; desc: string }[]> = {
  "Computer Science": [
    { title: "Online Examination System", tech: "React, Node.js, MongoDB", desc: "Full-stack web app for conducting timed MCQ tests with auto-grading, real-time leaderboard, and admin dashboard." },
    { title: "DSA Visualizer", tech: "JavaScript, HTML5 Canvas", desc: "Interactive visualizer for sorting and graph algorithms — step-by-step animation with time complexity analysis." },
  ],
  "Data Science": [
    { title: "Student Performance Predictor", tech: "Python, Scikit-learn, Flask", desc: "ML model predicting exam scores from attendance and engagement data; 87% accuracy on test set." },
    { title: "Twitter Sentiment Dashboard", tech: "Python, NLTK, Streamlit", desc: "Real-time sentiment analysis of tweets using VADER; deployed as an interactive web dashboard." },
  ],
  default: [
    { title: "Smart Attendance System", tech: "Python, OpenCV, Flask", desc: "Face recognition-based attendance system with QR fallback; deployed for 200+ students across 5 departments." },
    { title: "E-Commerce REST API", tech: "Node.js, Express, PostgreSQL", desc: "RESTful API with JWT auth, product management, cart, and order workflows; documented with Swagger." },
  ],
};

function getGradYear(year: number) {
  const currentYear = new Date().getFullYear();
  return currentYear + (4 - year);
}

function getSkills(field: string) {
  return FIELD_SKILLS[field] || FIELD_SKILLS["default"];
}

function getProjects(field: string) {
  return FIELD_PROJECTS[field] || FIELD_PROJECTS["default"];
}

function getDegree(field: string) {
  return FIELD_DEGREES[field] || `B.Tech ${field} Engineering`;
}

export default function Resume() {
  const [, setLocation] = useLocation();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) {
      setLocation("/");
    } else {
      setStudentId(parseInt(id, 10));
    }
  }, [setLocation]);

  const { data: dashboardData, isLoading } = useGetStudentDashboard(studentId as number, {
    query: { enabled: !!studentId }
  });

  const student = dashboardData?.student;
  const topSkills = dashboardData?.topSkills || [];
  const collegeRank = dashboardData?.collegeRank;
  const questProgress = dashboardData?.questProgress;

  const skills = student ? getSkills(student.field) : [];
  const projects = student ? getProjects(student.field) : [];
  const degree = student ? getDegree(student.field) : "";
  const gradYear = student ? getGradYear(student.year) : 2026;
  const startYear = gradYear - 4;

  const generatePDF = () => {
    if (!student) return;
    setGenerating(true);

    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const PAGE_W = 612;
    const MARGIN = 40;
    const CONTENT_W = PAGE_W - 2 * MARGIN;
    let y = MARGIN;

    const drawLine = () => {
      doc.setDrawColor(180, 170, 220);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 10;
    };

    const sectionHeader = (title: string) => {
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(124, 58, 237);
      doc.text(title.toUpperCase(), MARGIN, y);
      y += 2;
      doc.setDrawColor(124, 58, 237);
      doc.setLineWidth(1);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 10;
      doc.setTextColor(30, 27, 75);
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 27, 75);
    doc.text(student.name.toUpperCase(), PAGE_W / 2, y, { align: "center" });
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    const contactParts = [
      student.email,
      student.city,
      student.githubUrl || "",
      `KodeTalent Score: ${student.overallScore}/100`,
    ].filter(Boolean);
    doc.text(contactParts.join("  |  "), PAGE_W / 2, y, { align: "center" });
    y += 8;

    drawLine();

    sectionHeader("Education");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 27, 75);
    doc.text(degree, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${startYear} – ${gradYear}`, PAGE_W - MARGIN, y, { align: "right" });
    y += 13;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(107, 114, 128);
    doc.text(student.college + ", " + student.city, MARGIN, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 27, 75);
    if (questProgress) {
      doc.text(`Completed ${questProgress.completed}/${questProgress.total} structured learning quests`, MARGIN, y);
      y += 11;
    }

    sectionHeader("Technical Skills");
    for (const [category, items] of skills) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 27, 75);
      doc.text(`${category}: `, MARGIN, y);
      const labelW = doc.getTextWidth(`${category}: `);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      const lines = doc.splitTextToSize(items, CONTENT_W - labelW) as string[];
      doc.text(lines[0] || "", MARGIN + labelW, y);
      y += 12;
    }

    sectionHeader("Projects");
    for (const proj of projects) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 27, 75);
      doc.text(proj.title, MARGIN, y);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(124, 58, 237);
      doc.text(proj.tech, PAGE_W - MARGIN, y, { align: "right" });
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const lines = doc.splitTextToSize(`• ${proj.desc}`, CONTENT_W) as string[];
      for (const line of lines) {
        doc.text(line, MARGIN, y);
        y += 11;
      }
      y += 3;
    }

    sectionHeader("Achievements & Certifications");
    const achievements = [
      `KodeTalent Placement Score: ${student.overallScore}/100 (Level ${student.level}, ${student.xp} XP)`,
      collegeRank ? `Top ${100 - collegeRank.percentile + 1}th percentile at ${student.college} (Rank ${collegeRank.rank}/${collegeRank.total})` : null,
      topSkills.length > 0 ? `Verified skills: ${topSkills.map(s => s.name).join(", ")}` : null,
      `Streak: ${student.streakCount} days consistent learning on KodeTalent`,
    ].filter(Boolean) as string[];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81);
    for (const ach of achievements) {
      doc.text(`• ${ach}`, MARGIN, y);
      y += 12;
    }

    doc.save(`${student.name.replace(/\s+/g, "_")}_Resume.pdf`);
    setGenerating(false);
  };

  if (isLoading || !student) {
    return (
      <div className="p-4 pb-28 max-w-md mx-auto space-y-4 min-h-screen bg-[#f8fafc]">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-5 min-h-screen bg-[#f8fafc]">
      <Button variant="ghost" onClick={() => setLocation("/profile")} className="-ml-2 text-[#64748b] font-bold">
        <ArrowLeft className="w-5 h-5 mr-2" /> Back
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f172a] flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> My Resume
          </h1>
          <p className="text-[#64748b] text-sm font-medium mt-0.5">Auto-generated from your KodeTalent profile</p>
        </div>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            onClick={generatePDF}
            disabled={generating}
            className="bg-primary text-white font-bold rounded-full shadow-[0_4px_16px_rgba(124,58,237,0.3)] h-11 px-5"
          >
            <Download className="w-4 h-4 mr-2" />
            {generating ? "Generating..." : "Download PDF"}
          </Button>
        </motion.div>
      </div>

      <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-3xl bg-white overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #4f46e5, #0ea5e9)' }} />
        <CardContent className="p-6 space-y-5">
          <div className="text-center border-b border-[#f3f4f6] pb-5">
            <h2 className="text-2xl font-black text-[#0f172a] uppercase tracking-wide">{student.name}</h2>
            <p className="text-primary font-semibold text-sm mt-1">{degree}</p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-xs text-[#64748b]">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{student.email}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{student.city}</span>
              {student.githubUrl && (
                <span className="flex items-center gap-1"><Github className="w-3 h-3" />{student.githubUrl}</span>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-extrabold text-primary uppercase tracking-widest mb-2">Education</p>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-[#0f172a]">{degree}</p>
                <p className="text-xs text-[#64748b] mt-0.5">{student.college}, {student.city}</p>
                {questProgress && (
                  <p className="text-xs text-[#64748b]">{questProgress.completed} learning quests completed</p>
                )}
              </div>
              <p className="text-xs font-bold text-[#64748b] flex-shrink-0 ml-2">{startYear}–{gradYear}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-extrabold text-primary uppercase tracking-widest mb-2">Technical Skills</p>
            <div className="space-y-1.5">
              {skills.map(([cat, items]) => (
                <div key={cat} className="flex gap-1 text-xs">
                  <span className="font-bold text-[#0f172a] flex-shrink-0">{cat}:</span>
                  <span className="text-[#64748b]">{items}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-extrabold text-primary uppercase tracking-widest mb-2">Projects</p>
            <div className="space-y-3">
              {projects.map((proj, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-[#0f172a]">{proj.title}</p>
                    <p className="text-[10px] text-primary font-semibold ml-2 flex-shrink-0">{proj.tech}</p>
                  </div>
                  <p className="text-xs text-[#64748b] mt-0.5 leading-relaxed">• {proj.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-extrabold text-primary uppercase tracking-widest mb-2">Achievements</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-[#0f172a]">
                <Award className="w-3.5 h-3.5 text-[#ec4899] flex-shrink-0" />
                KodeTalent Score: {student.overallScore}/100 · Level {student.level} · {student.xp} XP
              </div>
              {collegeRank && (
                <div className="flex items-center gap-2 text-xs text-[#0f172a]">
                  <Award className="w-3.5 h-3.5 text-[#f97316] flex-shrink-0" />
                  Top {100 - collegeRank.percentile + 1}th percentile at {student.college} (#{collegeRank.rank}/{collegeRank.total})
                </div>
              )}
              {topSkills.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-[#0f172a]">
                  <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  Verified skills: {topSkills.map(s => s.name).join(", ")}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-[#0f172a]">
                <Zap className="w-3.5 h-3.5 text-[#10b981] flex-shrink-0" />
                {student.streakCount}-day learning streak on KodeTalent
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm rounded-2xl bg-[#e0e7ff]">
        <CardContent className="p-4">
          <p className="text-sm font-bold text-primary mb-1">⚠️ Note</p>
          <p className="text-xs text-[#64748b] leading-relaxed">
            Projects and some skills are shown as representative examples for your field. Update them with your real project work before sending to recruiters.
          </p>
        </CardContent>
      </Card>

      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          onClick={generatePDF}
          disabled={generating}
          className="w-full bg-primary text-white font-bold h-14 rounded-full text-lg shadow-[0_8px_16px_rgba(124,58,237,0.25)]"
        >
          <Download className="w-5 h-5 mr-2" />
          {generating ? "Generating PDF..." : "Download PDF Resume"}
        </Button>
      </motion.div>
    </div>
  );
}
