import { useEffect } from "react";
import { useLocation } from "wouter";

export default function RecruiterPortalShortcut() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const recruiter = localStorage.getItem("recruiter");
    if (recruiter) {
      setLocation("/recruiter-portal/dashboard");
      return;
    }
    setLocation("/recruiter-portal/welcome");
  }, [setLocation]);

  return null;
}