function normalizeCollegeTokens(college: string): string[] {
  return college
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 4 && !["college", "institute", "university", "school", "engineering", "technology", "science", "and", "the", "for"].includes(t));
}

export function emailDomainMatchesCollege(email: string, college: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain || !college) return false;
  const tokens = normalizeCollegeTokens(college);
  if (tokens.length === 0) return false;
  return tokens.some(t => domain.includes(t));
}
