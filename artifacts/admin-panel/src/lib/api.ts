export type Overview = {
  counts: {
    students: number;
    recruiters: number;
    jobs: number;
    invites: number;
    driveChecks: number;
    mentors: number;
    interviews: number;
    tests: number;
    colleges: number;
    openToWork: number;
    pro: number;
  };
  last24h: {
    students: number;
    invites: number;
    driveChecks: number;
    interviews: number;
    tests: number;
  };
  averages: {
    avgScore: number;
    avgStrength: number;
    avgCommitment: number;
    totalXp: number;
  };
  inviteBreakdown: { status: string; c: number }[];
  driveVerdictBreakdown: { verdict: string; c: number }[];
};

export type AdminStudent = {
  id: number;
  name: string;
  email: string;
  college: string;
  city: string;
  year: number;
  field: string;
  cgpa: string | null;
  overallScore: number;
  profileStrength: number;
  commitmentScore: number;
  xp: number;
  level: number;
  streakCount: number;
  openToWork: boolean;
  isPro: boolean;
  createdAt: string;
};

export type AdminRecruiter = {
  id: number;
  email: string;
  name: string;
  company: string;
  role: string | null;
  invitesSent: number;
  jobsPosted: number;
  createdAt: string;
  lastSeenAt: string;
};

export type AdminJob = {
  id: number;
  title: string;
  status: string;
  invitesSent: number;
  createdAt: string;
  recruiterName: string | null;
  recruiterCompany: string | null;
  parsedRequirements: {
    role: string;
    seniority: string;
    mustHaveSkills: string[];
    location: string | null;
  } | null;
};

export type AdminInvite = {
  id: number;
  studentId: number;
  studentName: string | null;
  studentCollege: string | null;
  recruiterCompany: string;
  recruiterName: string;
  role: string | null;
  status: string;
  createdAt: string;
};

export type AdminDriveCheck = {
  id: number;
  studentId: number;
  studentName: string | null;
  studentCollege: string | null;
  company: string | null;
  role: string | null;
  ctc: string | null;
  scamScore: number;
  scamVerdict: string;
  outcome: string;
  createdAt: string;
};

export type AdminCollege = {
  college: string;
  students: number;
  avgScore: number;
  avgStrength: number;
  openToWork: number;
  totalXp: number;
};

export type ActivityEvent = {
  kind: "student_signup" | "recruiter_invite" | "drive_check" | "interview" | "test";
  at: string;
  title: string;
  subtitle: string;
  entityId: number;
};
