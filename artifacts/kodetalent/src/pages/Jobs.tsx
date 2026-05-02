import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Briefcase, MapPin, DollarSign, ExternalLink, Lock } from "lucide-react";
import { useGetJobMatches, getGetJobMatchesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Jobs() {
  const [, setLocation] = useLocation();
  const [studentId, setStudentId] = useState<number | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) {
      setLocation("/");
    } else {
      setStudentId(parseInt(id, 10));
    }
  }, [setLocation]);

  const { data: jobMatches, isLoading } = useGetJobMatches(studentId as number, {
    query: { 
      enabled: !!studentId,
      queryKey: getGetJobMatchesQueryKey(studentId as number)
    }
  });

  if (isLoading || !jobMatches) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-40 mb-6" />
        <Skeleton className="h-12 w-full rounded-xl mb-6" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // Calculate average score for job ready meter
  const topMatches = jobMatches.filter(m => !m.isLocked);
  const avgMatchScore = topMatches.length > 0 
    ? Math.round(topMatches.reduce((acc, m) => acc + m.matchScore, 0) / topMatches.length)
    : 0;

  return (
    <div className="p-4 pb-24 max-w-md mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold flex items-center">
          <Briefcase className="mr-2" /> Job Matches
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Opportunities tailored to your verified skills.
        </p>
      </div>

      <Card className="border-secondary/50 bg-secondary/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex justify-between items-end mb-2">
            <span className="font-bold text-sm">Job Readiness Score</span>
            <span className="text-2xl font-black text-secondary">{avgMatchScore}/100</span>
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border">
            <div className="bg-secondary h-full transition-all duration-1000 ease-out" style={{ width: `${avgMatchScore}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Based on your skills, projects, and test scores.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4 relative">
        {jobMatches.map((match, index) => {
          const { job } = match;
          return (
            <motion.div 
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <Card className={`border-border/50 ${match.isLocked ? 'blur-[2px] opacity-70' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{job.role}</h3>
                      <p className="text-primary font-medium text-sm">{job.companyName}</p>
                    </div>
                    {!match.isLocked && (
                      <div className="bg-secondary/20 text-secondary border border-secondary/30 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                        {match.matchScore}% Match
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3 mt-3">
                    <div className="flex items-center text-xs text-muted-foreground bg-background px-2 py-1 rounded border border-border">
                      <MapPin className="w-3 h-3 mr-1" /> {job.remote ? "Remote" : job.location}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground bg-background px-2 py-1 rounded border border-border">
                      <DollarSign className="w-3 h-3 mr-1" /> {job.ctcMin}-{job.ctcMax} LPA
                    </div>
                  </div>

                  {!match.isLocked && (
                    <div className="bg-card/50 p-2 rounded text-xs text-muted-foreground mb-4 border border-border/50">
                      <span className="font-semibold text-foreground">Why you match:</span> {match.matchReason}
                    </div>
                  )}

                  <div className="flex gap-1.5 flex-wrap mb-4">
                    {job.requiredSkills.map(skill => (
                      <span key={skill} className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded border border-accent/20">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <Button 
                    className="w-full text-sm font-bold" 
                    variant={match.isLocked ? "outline" : "default"}
                    disabled={match.isLocked}
                  >
                    Apply Now <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {jobMatches.some(m => m.isLocked) && (
          <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-background via-background/80 to-transparent flex items-end justify-center pb-8 z-10">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-lg shadow-accent/20 px-8 py-6 rounded-full text-lg">
              <Lock className="w-5 h-5 mr-2" />
              Go Pro for ₹299/mo to unlock all
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
