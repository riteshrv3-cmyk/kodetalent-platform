export interface SubDomain {
  id: string;
  name: string;
  skills: string[];
}

export interface Domain {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bg: string;
  subDomains: SubDomain[];
}

export const DOMAINS: Domain[] = [
  {
    id: "data",
    name: "Data & Analytics",
    emoji: "📊",
    color: "#3b82f6",
    bg: "#eff6ff",
    subDomains: [
      { id: "data-science", name: "Data Science", skills: ["Python", "SQL", "ML", "Statistics"] },
      { id: "data-engineering", name: "Data Engineering", skills: ["Spark", "Kafka", "Airflow", "SQL"] },
      { id: "bi", name: "Business Intelligence", skills: ["Tableau", "Power BI", "SQL", "Excel"] },
      { id: "analytics-eng", name: "Analytics Engineering", skills: ["dbt", "SQL", "Python", "Looker"] },
    ],
  },
  {
    id: "design",
    name: "UI/UX Design",
    emoji: "🎨",
    color: "#ec4899",
    bg: "#fdf2f8",
    subDomains: [
      { id: "product-design", name: "Product Design", skills: ["Figma", "User Research", "Prototyping"] },
      { id: "ux-research", name: "UX Research", skills: ["Usability Testing", "Surveys", "Analytics"] },
      { id: "visual-design", name: "Visual Design", skills: ["Figma", "Illustrator", "Branding"] },
      { id: "motion-design", name: "Motion Design", skills: ["After Effects", "Principle", "Lottie"] },
    ],
  },
  {
    id: "webdev",
    name: "Web Development",
    emoji: "🌐",
    color: "#7c3aed",
    bg: "#f5f3ff",
    subDomains: [
      { id: "frontend", name: "Frontend", skills: ["React", "TypeScript", "Tailwind", "Next.js"] },
      { id: "backend", name: "Backend", skills: ["Node.js", "Python", "PostgreSQL", "REST APIs"] },
      { id: "fullstack", name: "Full Stack", skills: ["React", "Node.js", "MongoDB", "AWS"] },
      { id: "cms", name: "WordPress / CMS", skills: ["WordPress", "PHP", "WooCommerce", "SEO"] },
    ],
  },
  {
    id: "mobile",
    name: "Mobile Dev",
    emoji: "📱",
    color: "#06b6d4",
    bg: "#ecfeff",
    subDomains: [
      { id: "ios", name: "iOS (Swift)", skills: ["Swift", "SwiftUI", "Xcode", "CoreData"] },
      { id: "android", name: "Android (Kotlin)", skills: ["Kotlin", "Jetpack Compose", "Android Studio"] },
      { id: "rn", name: "React Native", skills: ["React Native", "Expo", "TypeScript", "Redux"] },
      { id: "flutter", name: "Flutter", skills: ["Dart", "Flutter", "Firebase", "Provider"] },
    ],
  },
  {
    id: "aiml",
    name: "AI / ML",
    emoji: "🤖",
    color: "#10b981",
    bg: "#ecfdf5",
    subDomains: [
      { id: "ml-eng", name: "ML Engineering", skills: ["Python", "TensorFlow", "PyTorch", "MLflow"] },
      { id: "nlp", name: "NLP", skills: ["Transformers", "LangChain", "spaCy", "BERT"] },
      { id: "cv", name: "Computer Vision", skills: ["OpenCV", "YOLO", "PyTorch", "Image Processing"] },
      { id: "mlops", name: "MLOps", skills: ["Docker", "Kubernetes", "Airflow", "Kubeflow"] },
    ],
  },
  {
    id: "security",
    name: "Cybersecurity",
    emoji: "🔐",
    color: "#ef4444",
    bg: "#fef2f2",
    subDomains: [
      { id: "pentesting", name: "Penetration Testing", skills: ["Kali Linux", "Metasploit", "Burp Suite"] },
      { id: "security-analysis", name: "Security Analysis", skills: ["SIEM", "IDS/IPS", "Threat Intel"] },
      { id: "cloud-security", name: "Cloud Security", skills: ["AWS Security", "IAM", "Zero Trust"] },
      { id: "soc", name: "SOC Analyst", skills: ["Splunk", "Incident Response", "Malware Analysis"] },
    ],
  },
  {
    id: "cloud",
    name: "Cloud & DevOps",
    emoji: "☁️",
    color: "#f97316",
    bg: "#fff7ed",
    subDomains: [
      { id: "aws", name: "AWS / Azure / GCP", skills: ["AWS", "Terraform", "CloudFormation", "IAM"] },
      { id: "k8s", name: "Kubernetes & Docker", skills: ["Docker", "Kubernetes", "Helm", "Istio"] },
      { id: "cicd", name: "CI/CD Pipelines", skills: ["Jenkins", "GitHub Actions", "GitLab CI", "ArgoCD"] },
      { id: "sre", name: "Site Reliability", skills: ["Prometheus", "Grafana", "On-call", "SLA/SLO"] },
    ],
  },
  {
    id: "blockchain",
    name: "Blockchain",
    emoji: "⛓️",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    subDomains: [
      { id: "smart-contracts", name: "Smart Contracts", skills: ["Solidity", "Hardhat", "Foundry", "EVM"] },
      { id: "defi", name: "DeFi Development", skills: ["Solidity", "DeFi Protocols", "Web3.js", "Ethers.js"] },
      { id: "web3-fe", name: "Web3 Frontend", skills: ["ethers.js", "wagmi", "RainbowKit", "Next.js"] },
      { id: "blockchain-sec", name: "Blockchain Security", skills: ["Audit", "Formal Verification", "Slither"] },
    ],
  },
  {
    id: "gamedev",
    name: "Game Dev",
    emoji: "🎮",
    color: "#f59e0b",
    bg: "#fffbeb",
    subDomains: [
      { id: "unity", name: "Unity Developer", skills: ["Unity", "C#", "Physics", "Shaders"] },
      { id: "unreal", name: "Unreal Engine", skills: ["Unreal", "C++", "Blueprints", "Niagara"] },
      { id: "game-design", name: "Game Designer", skills: ["Level Design", "Balancing", "Narrative", "Figma"] },
      { id: "game-backend", name: "Game Backend", skills: ["Node.js", "Photon", "Redis", "WebSockets"] },
    ],
  },
  {
    id: "embedded",
    name: "Embedded / IoT",
    emoji: "🔧",
    color: "#64748b",
    bg: "#f8fafc",
    subDomains: [
      { id: "iot", name: "IoT Developer", skills: ["Arduino", "Raspberry Pi", "MQTT", "C/C++"] },
      { id: "firmware", name: "Firmware Engineer", skills: ["C", "RTOS", "SPI/I2C", "ARM Cortex"] },
      { id: "hardware", name: "Hardware Interface", skills: ["PCB Design", "KiCad", "FPGA", "Verilog"] },
      { id: "automotive", name: "Automotive Systems", skills: ["CAN Bus", "AUTOSAR", "ADAS", "ISO 26262"] },
    ],
  },
  {
    id: "qa",
    name: "QA & Testing",
    emoji: "🧪",
    color: "#0ea5e9",
    bg: "#f0f9ff",
    subDomains: [
      { id: "manual-qa", name: "Manual Testing", skills: ["Test Cases", "Bug Reporting", "Jira", "Agile"] },
      { id: "automation-qa", name: "Test Automation", skills: ["Selenium", "Cypress", "Playwright", "TestNG"] },
      { id: "perf-testing", name: "Performance Testing", skills: ["JMeter", "Locust", "k6", "Gatling"] },
      { id: "mobile-qa", name: "Mobile Testing", skills: ["Appium", "XCUITest", "Espresso", "BrowserStack"] },
    ],
  },
  {
    id: "product",
    name: "Product Mgmt",
    emoji: "📋",
    color: "#14b8a6",
    bg: "#f0fdfa",
    subDomains: [
      { id: "tech-pm", name: "Technical PM", skills: ["PRDs", "SQL", "APIs", "Agile"] },
      { id: "growth-pm", name: "Growth PM", skills: ["A/B Testing", "Analytics", "Funnels", "OKRs"] },
      { id: "product-analytics", name: "Product Analytics", skills: ["Mixpanel", "Amplitude", "SQL", "Python"] },
      { id: "agile", name: "Agile / Scrum", skills: ["Scrum", "Jira", "Kanban", "Retrospectives"] },
    ],
  },
];

export const ALL_SUBDOMAINS = DOMAINS.flatMap(domain =>
  domain.subDomains.map(sd => ({ ...sd, domain }))
);
