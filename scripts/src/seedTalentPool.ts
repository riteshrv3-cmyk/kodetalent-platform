import { db, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type Seed = {
  name: string; email: string; college: string; city: string; year: number; field: string;
  cgpa: string; githubUrl: string; linkedinUrl: string; portfolioUrl?: string | null; phone: string;
  bio: string; targetPackage: string; dreamCompany: string;
  projects: Array<{ id: string; title: string; description: string; techStack: string[]; githubUrl: string | null; liveUrl: string | null }>;
  certifications: Array<{ id: string; name: string; issuer: string; year: number }>;
  workMode: string; preferredLocations: string[]; expectedSalary: string;
  githubStats: { repos: number; stars: number; followers: number; contributions: number; topLanguages: string[] };
  skills: Record<string, number>;
  profileStrength: number; commitmentScore: number; overallScore: number; xp: number; level: number;
};

const seeds: Seed[] = [
  {
    name: "Arjun Reddy", email: "arjun.reddy@iiith.ac.in", college: "IIIT Hyderabad", city: "Hyderabad", year: 3, field: "CSE",
    cgpa: "8.9", githubUrl: "https://github.com/arjunreddy", linkedinUrl: "https://linkedin.com/in/arjunreddy",
    portfolioUrl: "https://arjunreddy.dev", phone: "+91 98480 11223",
    bio: "Frontend-leaning full stack dev. Love React internals + design systems. Open-source contributor to shadcn/ui.",
    targetPackage: "18", dreamCompany: "Vercel",
    projects: [
      { id: "p1", title: "FinTrack — UPI expense analyzer", description: "React + Recharts dashboard that ingests UPI SMS and categorizes spending using Gemini", techStack: ["React", "TypeScript", "Tailwind", "Recharts"], githubUrl: "https://github.com/arjunreddy/fintrack", liveUrl: "https://fintrack-demo.vercel.app" },
      { id: "p2", title: "shadcn-themes-cli", description: "CLI tool to swap shadcn theme variants in any Next.js project. 340+ stars.", techStack: ["TypeScript", "Node.js", "Commander"], githubUrl: "https://github.com/arjunreddy/shadcn-themes", liveUrl: null },
    ],
    certifications: [{ id: "c1", name: "Meta Frontend Developer", issuer: "Coursera", year: 2025 }],
    workMode: "hybrid", preferredLocations: ["Bangalore", "Hyderabad", "Remote"], expectedSalary: "15-20",
    githubStats: { repos: 28, stars: 412, followers: 89, contributions: 1240, topLanguages: ["TypeScript", "JavaScript", "CSS"] },
    skills: { React: 88, TypeScript: 85, Tailwind: 82, "Next.js": 78, "Node.js": 72, "Design Systems": 80 },
    profileStrength: 91, commitmentScore: 84, overallScore: 87, xp: 2840, level: 7,
  },
  {
    name: "Kavya Iyer", email: "kavya.iyer@iitb.ac.in", college: "IIT Bombay", city: "Mumbai", year: 4, field: "CSE",
    cgpa: "9.4", githubUrl: "https://github.com/kavyaiyer", linkedinUrl: "https://linkedin.com/in/kavyaiyer",
    portfolioUrl: "https://kavyaiyer.com", phone: "+91 99205 33445",
    bio: "ML researcher. NeurIPS workshop paper on retrieval. SDE intern @ Google Bangalore.",
    targetPackage: "45", dreamCompany: "Anthropic",
    projects: [
      { id: "p1", title: "RAG-Eval — open eval harness for RAG systems", description: "Evaluation framework comparing 12 retrieval strategies across MS-MARCO & HotpotQA", techStack: ["Python", "PyTorch", "FAISS", "LangChain"], githubUrl: "https://github.com/kavyaiyer/rag-eval", liveUrl: null },
      { id: "p2", title: "TinyLlama-Hindi", description: "Fine-tuned 1.1B param LLM on Hindi literature corpus, released on HuggingFace (5k downloads)", techStack: ["Python", "PyTorch", "Transformers", "DeepSpeed"], githubUrl: "https://github.com/kavyaiyer/tinyllama-hindi", liveUrl: "https://huggingface.co/kavyaiyer/tinyllama-hindi" },
    ],
    certifications: [{ id: "c1", name: "DeepLearning.AI NLP Specialization", issuer: "Coursera", year: 2024 }, { id: "c2", name: "AWS ML Specialty", issuer: "AWS", year: 2025 }],
    workMode: "hybrid", preferredLocations: ["Bangalore", "Remote", "Mumbai"], expectedSalary: "40-50",
    githubStats: { repos: 41, stars: 890, followers: 234, contributions: 2180, topLanguages: ["Python", "Jupyter", "C++"] },
    skills: { Python: 94, PyTorch: 90, "Machine Learning": 92, NLP: 88, "System Design": 78, "C++": 75 },
    profileStrength: 96, commitmentScore: 92, overallScore: 94, xp: 4280, level: 9,
  },
  {
    name: "Rohan Joshi", email: "rohan.joshi@coep.ac.in", college: "COEP Pune", city: "Pune", year: 3, field: "CSE",
    cgpa: "8.4", githubUrl: "https://github.com/rohanjoshi", linkedinUrl: "https://linkedin.com/in/rohanjoshi",
    portfolioUrl: null, phone: "+91 98220 55678",
    bio: "Backend engineer. Love Go + distributed systems. Built and deployed a job queue used by 3 startups.",
    targetPackage: "16", dreamCompany: "Razorpay",
    projects: [
      { id: "p1", title: "GoQueue — Redis-backed job queue", description: "Lightweight Sidekiq alternative for Go. Production-tested at 50k jobs/min.", techStack: ["Go", "Redis", "Docker"], githubUrl: "https://github.com/rohanjoshi/goqueue", liveUrl: null },
      { id: "p2", title: "PG-Inspect", description: "CLI tool to find slow queries + missing indexes in Postgres", techStack: ["Go", "PostgreSQL"], githubUrl: "https://github.com/rohanjoshi/pg-inspect", liveUrl: null },
    ],
    certifications: [],
    workMode: "remote", preferredLocations: ["Remote", "Pune", "Bangalore"], expectedSalary: "12-18",
    githubStats: { repos: 22, stars: 156, followers: 43, contributions: 980, topLanguages: ["Go", "Python", "Shell"] },
    skills: { Go: 88, PostgreSQL: 82, Redis: 78, Docker: 75, "System Design": 72, Kubernetes: 60 },
    profileStrength: 84, commitmentScore: 78, overallScore: 81, xp: 2150, level: 6,
  },
  {
    name: "Ishita Banerjee", email: "ishita.b@jadavpur.edu", college: "Jadavpur University", city: "Kolkata", year: 2, field: "CSE",
    cgpa: "8.7", githubUrl: "https://github.com/ishitab", linkedinUrl: "https://linkedin.com/in/ishitab",
    portfolioUrl: "https://ishita.dev", phone: "+91 98300 77891",
    bio: "Mobile + web. Flutter for hackathons, React for production. Won Smart India Hackathon 2025.",
    targetPackage: "14", dreamCompany: "Razorpay",
    projects: [
      { id: "p1", title: "Saheli — women safety app", description: "SIH 2025 winner. Live location share + SOS to 5 contacts. 12k Play Store installs.", techStack: ["Flutter", "Firebase", "Google Maps API"], githubUrl: "https://github.com/ishitab/saheli", liveUrl: "https://play.google.com/store/apps/details?id=com.saheli" },
      { id: "p2", title: "BookSwap-Kolkata", description: "P2P book exchange platform for college students", techStack: ["React", "Node.js", "MongoDB"], githubUrl: "https://github.com/ishitab/bookswap", liveUrl: "https://bookswap-kol.vercel.app" },
    ],
    certifications: [{ id: "c1", name: "Google Associate Android Developer", issuer: "Google", year: 2025 }],
    workMode: "hybrid", preferredLocations: ["Bangalore", "Kolkata", "Remote"], expectedSalary: "10-14",
    githubStats: { repos: 18, stars: 234, followers: 67, contributions: 720, topLanguages: ["Dart", "JavaScript", "TypeScript"] },
    skills: { Flutter: 86, Dart: 84, React: 75, Firebase: 80, "Node.js": 65, MongoDB: 62 },
    profileStrength: 82, commitmentScore: 81, overallScore: 82, xp: 1980, level: 6,
  },
  {
    name: "Aditya Verma", email: "aditya.verma@iiitd.ac.in", college: "IIIT Delhi", city: "Delhi", year: 4, field: "CSE",
    cgpa: "8.2", githubUrl: "https://github.com/adityaverma", linkedinUrl: "https://linkedin.com/in/adityaverma",
    portfolioUrl: null, phone: "+91 98110 22334",
    bio: "DevOps + cloud. AWS Community Builder. Migrated 3 startups from Heroku to ECS.",
    targetPackage: "20", dreamCompany: "AWS",
    projects: [
      { id: "p1", title: "terraform-aws-startup-stack", description: "Opinionated Terraform module for VPC + ECS + RDS + ALB. 180 stars.", techStack: ["Terraform", "AWS", "HCL"], githubUrl: "https://github.com/adityaverma/tf-startup-stack", liveUrl: null },
      { id: "p2", title: "CostGuard", description: "Slack bot that alerts on AWS cost anomalies using Cost Explorer API", techStack: ["Python", "AWS Lambda", "Slack API"], githubUrl: "https://github.com/adityaverma/costguard", liveUrl: null },
    ],
    certifications: [{ id: "c1", name: "AWS Solutions Architect Associate", issuer: "AWS", year: 2024 }, { id: "c2", name: "HashiCorp Certified Terraform Associate", issuer: "HashiCorp", year: 2025 }],
    workMode: "remote", preferredLocations: ["Remote", "Bangalore", "Delhi"], expectedSalary: "18-25",
    githubStats: { repos: 31, stars: 287, followers: 92, contributions: 1450, topLanguages: ["Python", "HCL", "Go"] },
    skills: { AWS: 88, Terraform: 85, Docker: 82, Kubernetes: 78, Python: 75, "CI/CD": 80 },
    profileStrength: 88, commitmentScore: 80, overallScore: 85, xp: 3120, level: 8,
  },
  {
    name: "Sneha Pillai", email: "sneha.pillai@nitc.ac.in", college: "NIT Calicut", city: "Kozhikode", year: 3, field: "CSE",
    cgpa: "9.0", githubUrl: "https://github.com/snehapillai", linkedinUrl: "https://linkedin.com/in/snehapillai",
    portfolioUrl: "https://snehapillai.com", phone: "+91 94470 88991",
    bio: "Full-stack + product mindset. Co-founded campus food delivery startup, now break-even.",
    targetPackage: "16", dreamCompany: "Swiggy",
    projects: [
      { id: "p1", title: "CampusEats", description: "Food delivery for NIT-C campus. 800+ daily orders, 45 delivery partners.", techStack: ["Next.js", "TypeScript", "Postgres", "Stripe"], githubUrl: null, liveUrl: "https://campuseats.in" },
      { id: "p2", title: "MalayalamGPT-finetune", description: "Fine-tuning notebook for Malayalam instruction-following on Llama-3 8B", techStack: ["Python", "PyTorch", "PEFT", "LoRA"], githubUrl: "https://github.com/snehapillai/malayalam-llama", liveUrl: null },
    ],
    certifications: [{ id: "c1", name: "Stripe Certified Developer", issuer: "Stripe", year: 2025 }],
    workMode: "onsite", preferredLocations: ["Bangalore", "Mumbai"], expectedSalary: "14-18",
    githubStats: { repos: 19, stars: 142, followers: 56, contributions: 890, topLanguages: ["TypeScript", "Python", "JavaScript"] },
    skills: { React: 84, "Next.js": 86, TypeScript: 82, PostgreSQL: 75, Python: 70, "Product Sense": 85 },
    profileStrength: 87, commitmentScore: 88, overallScore: 87, xp: 2670, level: 7,
  },
  {
    name: "Karan Malhotra", email: "karan.m@bits-pilani.ac.in", college: "BITS Pilani", city: "Pilani", year: 3, field: "CSE",
    cgpa: "8.6", githubUrl: "https://github.com/karanmalhotra", linkedinUrl: "https://linkedin.com/in/karanmalhotra",
    portfolioUrl: null, phone: "+91 98290 44567",
    bio: "Competitive programmer (Codeforces Expert, 1850). System design enthusiast.",
    targetPackage: "30", dreamCompany: "Google",
    projects: [
      { id: "p1", title: "MiniRedis-rs", description: "Reimplemented Redis in Rust to learn async + lock-free data structures", techStack: ["Rust", "Tokio"], githubUrl: "https://github.com/karanmalhotra/miniredis-rs", liveUrl: null },
      { id: "p2", title: "LeetTracker", description: "CP-friendly LeetCode tracker with spaced repetition + Anki export", techStack: ["React", "Chrome Extension API"], githubUrl: "https://github.com/karanmalhotra/leettracker", liveUrl: null },
    ],
    certifications: [],
    workMode: "hybrid", preferredLocations: ["Bangalore", "Hyderabad", "Remote"], expectedSalary: "25-35",
    githubStats: { repos: 24, stars: 198, followers: 71, contributions: 1320, topLanguages: ["C++", "Rust", "Python"] },
    skills: { "C++": 92, DSA: 94, "System Design": 78, Rust: 70, Python: 75, React: 65 },
    profileStrength: 85, commitmentScore: 82, overallScore: 83, xp: 2890, level: 7,
  },
  {
    name: "Tanvi Deshpande", email: "tanvi.d@vit.ac.in", college: "VIT Vellore", city: "Vellore", year: 4, field: "CSE",
    cgpa: "8.1", githubUrl: "https://github.com/tanvideshpande", linkedinUrl: "https://linkedin.com/in/tanvideshpande",
    portfolioUrl: "https://tanvi.dev", phone: "+91 98230 11445",
    bio: "Frontend specialist. Animation nerd (Framer Motion + GSAP). Freelanced for 4 startups.",
    targetPackage: "12", dreamCompany: "Linear",
    projects: [
      { id: "p1", title: "Awwwards-clone", description: "Pixel-perfect clone of awwwards.com with smooth GSAP animations", techStack: ["Next.js", "GSAP", "Three.js", "Tailwind"], githubUrl: "https://github.com/tanvideshpande/awwwards-clone", liveUrl: "https://awwwards-clone-tanvi.vercel.app" },
      { id: "p2", title: "MotionLib", description: "React component library of 30+ pre-built motion patterns", techStack: ["React", "Framer Motion", "TypeScript", "Storybook"], githubUrl: "https://github.com/tanvideshpande/motionlib", liveUrl: "https://motionlib.tanvi.dev" },
    ],
    certifications: [{ id: "c1", name: "Frontend Masters Complete Path", issuer: "Frontend Masters", year: 2024 }],
    workMode: "remote", preferredLocations: ["Remote", "Bangalore"], expectedSalary: "10-14",
    githubStats: { repos: 33, stars: 312, followers: 104, contributions: 1640, topLanguages: ["TypeScript", "JavaScript", "CSS"] },
    skills: { React: 90, "Next.js": 85, "Framer Motion": 92, GSAP: 88, TypeScript: 82, "UI/UX": 86 },
    profileStrength: 89, commitmentScore: 86, overallScore: 88, xp: 3340, level: 8,
  },
  {
    name: "Vivek Saxena", email: "vivek.saxena@dtu.ac.in", college: "DTU Delhi", city: "Delhi", year: 2, field: "ECE",
    cgpa: "8.3", githubUrl: "https://github.com/viveksaxena", linkedinUrl: "https://linkedin.com/in/viveksaxena",
    portfolioUrl: null, phone: "+91 99100 22887",
    bio: "Embedded + IoT. Built smart-home automation that runs on ESP32 with no cloud dependency.",
    targetPackage: "10", dreamCompany: "Tessolve",
    projects: [
      { id: "p1", title: "HomeMesh", description: "Local-first smart home hub. ESP32 nodes mesh over ESP-NOW, no internet needed.", techStack: ["C++", "ESP-IDF", "MQTT", "React Native"], githubUrl: "https://github.com/viveksaxena/homemesh", liveUrl: null },
      { id: "p2", title: "Plant-monitor-shield", description: "Custom PCB + Arduino sketch for soil moisture + light + temp logging", techStack: ["C", "Arduino", "KiCad"], githubUrl: "https://github.com/viveksaxena/plant-monitor", liveUrl: null },
    ],
    certifications: [{ id: "c1", name: "ARM Cortex-M Microcontrollers", issuer: "Coursera", year: 2025 }],
    workMode: "onsite", preferredLocations: ["Bangalore", "Delhi", "Pune"], expectedSalary: "8-12",
    githubStats: { repos: 14, stars: 87, followers: 31, contributions: 580, topLanguages: ["C", "C++", "Python"] },
    skills: { "C++": 82, "C": 80, "Embedded Systems": 85, IoT: 82, Arduino: 78, "PCB Design": 70 },
    profileStrength: 76, commitmentScore: 75, overallScore: 76, xp: 1540, level: 5,
  },
  {
    name: "Riya Agarwal", email: "riya.a@srm.edu.in", college: "SRM Chennai", city: "Chennai", year: 3, field: "CSE",
    cgpa: "7.9", githubUrl: "https://github.com/riyaagarwal", linkedinUrl: "https://linkedin.com/in/riyaagarwal",
    portfolioUrl: "https://riya.work", phone: "+91 98410 33558",
    bio: "Data engineer in training. Love SQL + dbt. Currently learning Spark.",
    targetPackage: "12", dreamCompany: "Razorpay",
    projects: [
      { id: "p1", title: "Chennai-traffic-pipeline", description: "ETL pipeline ingesting Chennai traffic API → S3 → Snowflake → Tableau dashboard", techStack: ["Python", "Airflow", "dbt", "Snowflake"], githubUrl: "https://github.com/riyaagarwal/chennai-traffic", liveUrl: null },
      { id: "p2", title: "SQLGym", description: "Interactive SQL exercise platform with 80+ challenges", techStack: ["Next.js", "DuckDB-Wasm", "TypeScript"], githubUrl: "https://github.com/riyaagarwal/sqlgym", liveUrl: "https://sqlgym.vercel.app" },
    ],
    certifications: [{ id: "c1", name: "dbt Fundamentals", issuer: "dbt Labs", year: 2025 }],
    workMode: "hybrid", preferredLocations: ["Bangalore", "Chennai", "Remote"], expectedSalary: "10-14",
    githubStats: { repos: 16, stars: 103, followers: 39, contributions: 720, topLanguages: ["Python", "SQL", "TypeScript"] },
    skills: { SQL: 88, Python: 80, dbt: 78, Airflow: 72, Snowflake: 70, Tableau: 75 },
    profileStrength: 79, commitmentScore: 76, overallScore: 78, xp: 1820, level: 5,
  },
  {
    name: "Manish Kumar", email: "manish.k@nitw.ac.in", college: "NIT Warangal", city: "Warangal", year: 4, field: "CSE",
    cgpa: "8.5", githubUrl: "https://github.com/manishkumar", linkedinUrl: "https://linkedin.com/in/manishkumar",
    portfolioUrl: null, phone: "+91 99480 11226",
    bio: "Backend + Kafka. Interned at Flipkart, worked on order fulfillment service handling 2M req/day.",
    targetPackage: "22", dreamCompany: "Flipkart",
    projects: [
      { id: "p1", title: "Order-Saga", description: "Distributed transaction coordinator using Kafka + saga pattern, with idempotency tokens", techStack: ["Java", "Kafka", "Spring Boot", "PostgreSQL"], githubUrl: "https://github.com/manishkumar/order-saga", liveUrl: null },
      { id: "p2", title: "RateLimiter4j", description: "Open-source rate limiter library for Java with token bucket + sliding window", techStack: ["Java", "Redis"], githubUrl: "https://github.com/manishkumar/ratelimiter4j", liveUrl: null },
    ],
    certifications: [{ id: "c1", name: "Confluent Apache Kafka Developer", issuer: "Confluent", year: 2025 }],
    workMode: "hybrid", preferredLocations: ["Bangalore", "Hyderabad"], expectedSalary: "20-28",
    githubStats: { repos: 20, stars: 178, followers: 52, contributions: 1090, topLanguages: ["Java", "Python", "Shell"] },
    skills: { Java: 90, "Spring Boot": 85, Kafka: 82, PostgreSQL: 78, "System Design": 80, Redis: 72 },
    profileStrength: 87, commitmentScore: 84, overallScore: 86, xp: 3010, level: 7,
  },
  {
    name: "Pooja Mishra", email: "pooja.m@pec.edu.in", college: "PEC Chandigarh", city: "Chandigarh", year: 2, field: "CSE",
    cgpa: "8.0", githubUrl: "https://github.com/poojamishra", linkedinUrl: "https://linkedin.com/in/poojamishra",
    portfolioUrl: null, phone: "+91 98140 55671",
    bio: "Beginner-friendly full stack. Just shipped my first SaaS — a study planner for college students.",
    targetPackage: "8", dreamCompany: "Zoho",
    projects: [
      { id: "p1", title: "StudyPilot", description: "AI-powered weekly study planner that adapts to exam dates. 200 active users.", techStack: ["React", "Node.js", "MongoDB", "OpenAI"], githubUrl: "https://github.com/poojamishra/studypilot", liveUrl: "https://studypilot.in" },
    ],
    certifications: [],
    workMode: "remote", preferredLocations: ["Remote", "Chandigarh", "Bangalore"], expectedSalary: "6-10",
    githubStats: { repos: 9, stars: 41, followers: 18, contributions: 320, topLanguages: ["JavaScript", "TypeScript", "HTML"] },
    skills: { React: 70, "Node.js": 65, MongoDB: 60, JavaScript: 75, "REST APIs": 68 },
    profileStrength: 64, commitmentScore: 70, overallScore: 66, xp: 980, level: 4,
  },
  {
    name: "Aakash Pandey", email: "aakash.p@iitd.ac.in", college: "IIT Delhi", city: "Delhi", year: 4, field: "CSE",
    cgpa: "9.2", githubUrl: "https://github.com/aakashpandey", linkedinUrl: "https://linkedin.com/in/aakashpandey",
    portfolioUrl: "https://aakash.dev", phone: "+91 99110 33445",
    bio: "Systems + compilers. Wrote a tiny C compiler from scratch. Interned at Microsoft Hyderabad.",
    targetPackage: "50", dreamCompany: "Apple",
    projects: [
      { id: "p1", title: "TinyCC", description: "C compiler in 4k lines of OCaml. Compiles a non-trivial subset including structs + pointers.", techStack: ["OCaml", "LLVM"], githubUrl: "https://github.com/aakashpandey/tinycc", liveUrl: null },
      { id: "p2", title: "OS-from-scratch", description: "Following 'Operating Systems: Three Easy Pieces' — built a toy OS that boots on QEMU", techStack: ["C", "Assembly", "QEMU"], githubUrl: "https://github.com/aakashpandey/toy-os", liveUrl: null },
    ],
    certifications: [],
    workMode: "onsite", preferredLocations: ["Bangalore", "Hyderabad", "Remote"], expectedSalary: "45-55",
    githubStats: { repos: 26, stars: 524, followers: 187, contributions: 1890, topLanguages: ["C", "OCaml", "Rust"] },
    skills: { "C": 92, "C++": 88, OCaml: 80, "Operating Systems": 90, Compilers: 85, "System Design": 82 },
    profileStrength: 93, commitmentScore: 89, overallScore: 91, xp: 4010, level: 9,
  },
  {
    name: "Megha Shetty", email: "megha.s@manipal.edu", college: "Manipal Institute of Technology", city: "Manipal", year: 3, field: "AI/ML",
    cgpa: "8.8", githubUrl: "https://github.com/meghashetty", linkedinUrl: "https://linkedin.com/in/meghashetty",
    portfolioUrl: "https://megha.ai", phone: "+91 98456 22113",
    bio: "Computer vision researcher. Interned at NVIDIA Bangalore on autonomous driving perception.",
    targetPackage: "28", dreamCompany: "NVIDIA",
    projects: [
      { id: "p1", title: "PotholeNet", description: "Real-time pothole detection from dashcam video using YOLOv8. Deployed in BMTC bus pilot.", techStack: ["Python", "PyTorch", "YOLOv8", "OpenCV"], githubUrl: "https://github.com/meghashetty/potholenet", liveUrl: null },
      { id: "p2", title: "SignSpeak", description: "ISL (Indian Sign Language) → text translator using MediaPipe + transformer", techStack: ["Python", "PyTorch", "MediaPipe", "Streamlit"], githubUrl: "https://github.com/meghashetty/signspeak", liveUrl: "https://signspeak.streamlit.app" },
    ],
    certifications: [{ id: "c1", name: "NVIDIA Deep Learning Institute — Computer Vision", issuer: "NVIDIA", year: 2025 }],
    workMode: "hybrid", preferredLocations: ["Bangalore", "Hyderabad"], expectedSalary: "25-32",
    githubStats: { repos: 17, stars: 245, followers: 78, contributions: 1140, topLanguages: ["Python", "Jupyter", "C++"] },
    skills: { Python: 90, PyTorch: 88, "Computer Vision": 92, OpenCV: 86, "Deep Learning": 88, "C++": 70 },
    profileStrength: 90, commitmentScore: 86, overallScore: 89, xp: 3450, level: 8,
  },
  {
    name: "Faizan Khan", email: "faizan.k@jmi.ac.in", college: "Jamia Millia Islamia", city: "Delhi", year: 3, field: "CSE",
    cgpa: "7.8", githubUrl: "https://github.com/faizankhan", linkedinUrl: "https://linkedin.com/in/faizankhan",
    portfolioUrl: null, phone: "+91 98180 22341",
    bio: "Cybersecurity + bug bounty hunter. Reported XSS to 4 Indian unicorns, earned ₹85k in bounties.",
    targetPackage: "14", dreamCompany: "CRED",
    projects: [
      { id: "p1", title: "subhunter", description: "Subdomain enumeration tool combining 6 techniques, faster than Sublist3r in benchmarks", techStack: ["Go", "DNS"], githubUrl: "https://github.com/faizankhan/subhunter", liveUrl: null },
      { id: "p2", title: "JWT-vuln-lab", description: "Educational lab with 12 deliberately vulnerable JWT implementations", techStack: ["Node.js", "Docker"], githubUrl: "https://github.com/faizankhan/jwt-vuln-lab", liveUrl: null },
    ],
    certifications: [{ id: "c1", name: "OSCP", issuer: "Offensive Security", year: 2025 }, { id: "c2", name: "eJPT", issuer: "INE", year: 2024 }],
    workMode: "remote", preferredLocations: ["Remote", "Bangalore", "Delhi"], expectedSalary: "12-18",
    githubStats: { repos: 21, stars: 167, followers: 58, contributions: 840, topLanguages: ["Go", "Python", "Shell"] },
    skills: { "Cybersecurity": 88, Go: 76, Python: 80, "Pentesting": 85, "Network Security": 78, "Web Security": 86 },
    profileStrength: 81, commitmentScore: 82, overallScore: 81, xp: 2240, level: 6,
  },
  {
    name: "Anjali Rao", email: "anjali.r@iiitb.ac.in", college: "IIIT Bangalore", city: "Bangalore", year: 2, field: "CSE",
    cgpa: "8.6", githubUrl: "https://github.com/anjalirao", linkedinUrl: "https://linkedin.com/in/anjalirao",
    portfolioUrl: "https://anjali.codes", phone: "+91 99720 11885",
    bio: "Building in public. Indie hacker mindset. Two side-projects making ₹8k/mo combined.",
    targetPackage: "12", dreamCompany: "Notion",
    projects: [
      { id: "p1", title: "InvoiceLite", description: "Free invoice generator for Indian freelancers — GST-compliant, 1200 active users", techStack: ["Next.js", "Tailwind", "PostgreSQL"], githubUrl: null, liveUrl: "https://invoicelite.in" },
      { id: "p2", title: "ColdMailer", description: "Templated cold-email tool for college students reaching out to startups", techStack: ["Next.js", "Resend", "Stripe"], githubUrl: null, liveUrl: "https://coldmailer.dev" },
    ],
    certifications: [],
    workMode: "remote", preferredLocations: ["Remote", "Bangalore"], expectedSalary: "10-15",
    githubStats: { repos: 12, stars: 89, followers: 34, contributions: 670, topLanguages: ["TypeScript", "JavaScript"] },
    skills: { "Next.js": 84, React: 82, TypeScript: 80, "Product Sense": 88, Stripe: 70, PostgreSQL: 68 },
    profileStrength: 80, commitmentScore: 89, overallScore: 83, xp: 2080, level: 6,
  },
  {
    name: "Suresh Kannan", email: "suresh.k@psgtech.edu", college: "PSG Tech Coimbatore", city: "Coimbatore", year: 4, field: "ECE",
    cgpa: "8.4", githubUrl: "https://github.com/sureshkannan", linkedinUrl: "https://linkedin.com/in/sureshkannan",
    portfolioUrl: null, phone: "+91 98430 33778",
    bio: "VLSI + chip design. RTL coded a small RISC-V core for my B.Tech thesis.",
    targetPackage: "14", dreamCompany: "Qualcomm",
    projects: [
      { id: "p1", title: "RV32I-core", description: "5-stage pipelined RISC-V (RV32I) processor in Verilog with hazard detection + forwarding", techStack: ["Verilog", "SystemVerilog", "Vivado"], githubUrl: "https://github.com/sureshkannan/rv32i", liveUrl: null },
      { id: "p2", title: "UART-IP", description: "Reusable UART IP block with FIFO + parity + framing error detection", techStack: ["Verilog", "Yosys"], githubUrl: "https://github.com/sureshkannan/uart-ip", liveUrl: null },
    ],
    certifications: [{ id: "c1", name: "Coursera VLSI CAD: Logic to Layout", issuer: "Coursera", year: 2025 }],
    workMode: "onsite", preferredLocations: ["Bangalore", "Hyderabad", "Chennai"], expectedSalary: "12-16",
    githubStats: { repos: 11, stars: 56, followers: 22, contributions: 410, topLanguages: ["Verilog", "C", "Python"] },
    skills: { Verilog: 86, SystemVerilog: 78, "VLSI Design": 82, "Digital Design": 88, "C": 70, Python: 65 },
    profileStrength: 78, commitmentScore: 76, overallScore: 78, xp: 1720, level: 5,
  },
  {
    name: "Neha Bhatt", email: "neha.b@daiict.ac.in", college: "DAIICT Gandhinagar", city: "Gandhinagar", year: 3, field: "Data",
    cgpa: "8.7", githubUrl: "https://github.com/nehabhatt", linkedinUrl: "https://linkedin.com/in/nehabhatt",
    portfolioUrl: "https://neha.data", phone: "+91 98250 44119",
    bio: "Data science + storytelling. Wrote 12 Substack posts analyzing Indian startup data, 4k subscribers.",
    targetPackage: "16", dreamCompany: "Atlan",
    projects: [
      { id: "p1", title: "IndianStartups-eda", description: "Public dataset + EDA notebooks of 8000+ Indian startups (2010-2025) scraped from Crunchbase", techStack: ["Python", "Pandas", "Plotly", "Streamlit"], githubUrl: "https://github.com/nehabhatt/indian-startups", liveUrl: "https://indian-startups.streamlit.app" },
      { id: "p2", title: "WhatsApp-chat-analyzer", description: "Streamlit app that parses WhatsApp exports + visualizes group dynamics", techStack: ["Python", "Streamlit", "Plotly", "WordCloud"], githubUrl: "https://github.com/nehabhatt/wa-analyzer", liveUrl: "https://wa-analyzer.streamlit.app" },
    ],
    certifications: [{ id: "c1", name: "IBM Data Science Professional", issuer: "Coursera", year: 2024 }],
    workMode: "hybrid", preferredLocations: ["Bangalore", "Mumbai", "Remote"], expectedSalary: "14-18",
    githubStats: { repos: 19, stars: 187, followers: 84, contributions: 1010, topLanguages: ["Python", "Jupyter", "SQL"] },
    skills: { Python: 88, Pandas: 90, SQL: 82, "Data Visualization": 86, Streamlit: 80, "Statistics": 78 },
    profileStrength: 84, commitmentScore: 83, overallScore: 84, xp: 2470, level: 6,
  },
  {
    name: "Yash Agrawal", email: "yash.a@thapar.edu", college: "Thapar University", city: "Patiala", year: 4, field: "CSE",
    cgpa: "7.6", githubUrl: "https://github.com/yashagrawal", linkedinUrl: "https://linkedin.com/in/yashagrawal",
    portfolioUrl: null, phone: "+91 98140 99887",
    bio: "Game dev hobbyist turned web dev. Shipped 3 itch.io games, now building B2B SaaS.",
    targetPackage: "10", dreamCompany: "Unity",
    projects: [
      { id: "p1", title: "PixelDungeon-rs", description: "Roguelike inspired by Pixel Dungeon, written in Rust + Bevy", techStack: ["Rust", "Bevy", "WASM"], githubUrl: "https://github.com/yashagrawal/pixel-dungeon-rs", liveUrl: "https://yashagrawal.itch.io/pixel-dungeon-rs" },
      { id: "p2", title: "MeetingNotes", description: "Chrome extension that auto-summarizes Google Meet transcripts using Claude", techStack: ["TypeScript", "Chrome Extension", "Claude API"], githubUrl: "https://github.com/yashagrawal/meeting-notes", liveUrl: null },
    ],
    certifications: [],
    workMode: "remote", preferredLocations: ["Remote", "Bangalore", "Pune"], expectedSalary: "8-12",
    githubStats: { repos: 22, stars: 134, followers: 46, contributions: 870, topLanguages: ["Rust", "TypeScript", "JavaScript"] },
    skills: { Rust: 78, TypeScript: 82, React: 76, "Game Dev": 80, "WASM": 65, "Chrome Extensions": 70 },
    profileStrength: 75, commitmentScore: 79, overallScore: 76, xp: 1860, level: 5,
  },
  {
    name: "Lavanya Subramanian", email: "lavanya.s@ssn.edu.in", college: "SSN College of Engineering", city: "Chennai", year: 3, field: "CSE",
    cgpa: "9.1", githubUrl: "https://github.com/lavanyas", linkedinUrl: "https://linkedin.com/in/lavanyas",
    portfolioUrl: "https://lavanya.tech", phone: "+91 98410 22557",
    bio: "Backend Python + Django. Maintainer of a popular OSS Django package (django-tasks-runner, 800 stars).",
    targetPackage: "20", dreamCompany: "Zerodha",
    projects: [
      { id: "p1", title: "django-tasks-runner", description: "Lightweight async task runner for Django without Celery overhead. 800+ stars, 12 contributors.", techStack: ["Python", "Django", "PostgreSQL"], githubUrl: "https://github.com/lavanyas/django-tasks-runner", liveUrl: null },
      { id: "p2", title: "ChennaiCommute", description: "Public transport route planner integrating MTC bus + metro APIs", techStack: ["Django", "PostGIS", "React"], githubUrl: "https://github.com/lavanyas/chennai-commute", liveUrl: "https://chennai-commute.in" },
    ],
    certifications: [{ id: "c1", name: "Django Certified Developer", issuer: "Django Software Foundation", year: 2025 }],
    workMode: "hybrid", preferredLocations: ["Bangalore", "Chennai", "Remote"], expectedSalary: "18-25",
    githubStats: { repos: 24, stars: 912, followers: 156, contributions: 1730, topLanguages: ["Python", "JavaScript", "HTML"] },
    skills: { Python: 92, Django: 94, PostgreSQL: 86, "REST APIs": 88, React: 70, "OSS Maintenance": 90 },
    profileStrength: 92, commitmentScore: 91, overallScore: 92, xp: 3780, level: 8,
  },
];

async function run() {
  console.log(`Seeding ${seeds.length} students...`);
  let inserted = 0, skipped = 0;
  for (const s of seeds) {
    const existing = await db.select().from(studentsTable).where(eq(studentsTable.email, s.email)).limit(1);
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    await db.insert(studentsTable).values({
      ...s,
      openToWork: true,
      streakCount: Math.floor(Math.random() * 30) + 5,
      lastActiveDate: new Date().toISOString().slice(0, 10),
      isPro: false,
    });
    inserted++;
  }
  console.log(`✓ Inserted ${inserted}, skipped ${skipped} (already existed)`);

  // Cleanup empty placeholder rows so recruiters don't see junk
  const empties = await db.select().from(studentsTable);
  let purged = 0;
  for (const e of empties) {
    if ((e.profileStrength ?? 0) === 0 && (e.cgpa == null || e.cgpa === "") && !e.githubUrl && (Array.isArray(e.projects) ? e.projects.length === 0 : true)) {
      try {
        await db.delete(studentsTable).where(eq(studentsTable.id, e.id));
        purged++;
      } catch {
        // FK constraint — skip (student has related invites/etc)
      }
    }
  }
  console.log(`✓ Purged ${purged} empty placeholder rows`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
