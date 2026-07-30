// A curated dictionary of resume-relevant technical terms, used as a fallback
// keyword source when stage 1's LLM extraction misses something, and as the
// deterministic path when there is no JD text at all (tags/role-title only).
// Not exhaustive by design — it exists to catch common terms a JD mentions in
// passing, not to replace stage 1's contextual grading.

const LANGUAGES = [
  "javascript", "typescript", "python", "java", "c++", "c#", "c", "go", "golang",
  "rust", "kotlin", "swift", "ruby", "php", "scala", "r", "matlab", "dart",
  "objective-c", "perl", "haskell", "elixir", "clojure", "lua", "julia", "sql",
];

const FRONTEND = [
  "react", "vue", "angular", "svelte", "next.js", "nuxt", "remix", "redux",
  "zustand", "mobx", "tailwindcss", "tailwind", "sass", "less", "webpack",
  "vite", "html", "css", "jquery", "graphql", "apollo", "storybook",
];

const BACKEND = [
  "node.js", "express", "nestjs", "django", "flask", "fastapi", "spring",
  "spring boot", "rails", "laravel", "asp.net", ".net", "gin", "fiber",
  "rest apis", "grpc", "graphql", "websockets", "microservices", "api gateway",
];

const DATABASES = [
  "postgresql", "mysql", "mongodb", "redis", "sqlite", "cassandra",
  "dynamodb", "elasticsearch", "neo4j", "firebase", "firestore", "supabase",
  "snowflake", "bigquery", "clickhouse", "influxdb",
];

const CLOUD_DEVOPS = [
  "aws", "amazon web services", "gcp", "google cloud platform", "azure",
  "docker", "kubernetes", "terraform", "ansible", "jenkins", "github actions",
  "gitlab ci", "ci/cd", "nginx", "linux", "bash", "cloudformation",
  "prometheus", "grafana", "datadog", "kafka", "rabbitmq", "sqs", "lambda",
  "ec2", "s3", "cloudfront", "vercel", "netlify", "render", "heroku",
];

const DATA_ML = [
  "machine learning", "deep learning", "tensorflow", "pytorch", "keras",
  "scikit-learn", "pandas", "numpy", "nlp", "computer vision", "opencv",
  "data analytics", "data science", "spark", "hadoop", "airflow", "dbt",
  "tableau", "power bi", "matplotlib", "seaborn", "llm", "artificial intelligence",
  "generative ai", "prompt engineering", "rag", "vector databases", "langchain",
];

const MOBILE = [
  "android", "ios", "react native", "flutter", "swiftui", "jetpack compose",
  "xcode", "android studio", "core data", "realm",
];

const TESTING_QA = [
  "jest", "mocha", "chai", "cypress", "selenium", "playwright", "junit",
  "pytest", "unit testing", "integration testing", "test automation", "tdd",
  "bdd", "postman", "load testing",
];

const TOOLS_PRACTICES = [
  "git", "github", "gitlab", "bitbucket", "jira", "confluence", "agile",
  "scrum", "kanban", "figma", "system design", "dsa",
  "data structures", "algorithms", "oop", "design patterns", "clean code",
  "sql optimization", "distributed systems", "load balancing", "caching",
  "security", "oauth", "jwt", "authentication", "authorization",
];

const SECURITY = [
  "cybersecurity", "penetration testing", "owasp", "vulnerability assessment",
  "network security", "cryptography", "siem", "burp suite", "nmap", "wireshark",
];

export const TECH_LEXICON: ReadonlySet<string> = new Set(
  [
    ...LANGUAGES,
    ...FRONTEND,
    ...BACKEND,
    ...DATABASES,
    ...CLOUD_DEVOPS,
    ...DATA_ML,
    ...MOBILE,
    ...TESTING_QA,
    ...TOOLS_PRACTICES,
    ...SECURITY,
  ].map((t) => t.toLowerCase()),
);

export function isTechTerm(term: string): boolean {
  return TECH_LEXICON.has(term.toLowerCase().trim());
}

/**
 * Scan raw text for lexicon terms that appear, longest-match-first so
 * "machine learning" is caught before "learning" would be (which isn't in
 * the lexicon anyway, but the ordering matters for future additions).
 */
export function scanLexicon(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  const sorted = [...TECH_LEXICON].sort((a, b) => b.length - a.length);
  for (const term of sorted) {
    // Word-boundary check so "go" doesn't match inside "google" or "algorithm".
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i");
    if (pattern.test(lower)) found.push(term);
  }
  return found;
}
