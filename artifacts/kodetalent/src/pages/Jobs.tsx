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
      <div className="p-4 space-y-4 bg-[#f5f3ff] min-h-screen">
        <Skeleton className="h-8 w-40 mb-6" />
        <Skeleton className="h-32 w-full rounded-2xl mb-6" />
        {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
      </div>
    );
  }

  const topMatches = jobMatches.filter(m => !m.isLocked);
  const avgMatchScore = topMatches.length > 0 
    ? Math.round(topMatches.reduce((acc, m) => acc + m.matchScore, 0) / topMatches.length)
    : 0;

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-6 min-h-screen bg-[#f5f3ff]">
      <div className="mb-2">
        <h1 className="text-2xl font-bold flex items-center text-[#1e1b4b]">
          <Briefcase className="mr-2 text-primary" /> Job Matches
        </h1>
        <p className="text-[#6b7280] font-medium text-sm mt-1">
          Opportunities tailored to your verified skills.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}>
        <Card className="border-0 shadow-[0_4px_24px_rgba(124,58,237,0.10)] rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
          <CardContent className="p-5 text-white">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm">Job Readiness Score</span>
              <span className="text-3xl font-black">{avgMatchScore}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
              <motion.div 
                className="bg-white h-full" 
                initial={{ width: 0 }} 
                animate={{ width: `${avgMatchScore}%` }} 
                transition={{ duration: 1, ease: "easeOut" }} 
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
              <Card className={`border-0 shadow-[0_4px_24px_rgba(124,58,237,0.06)] rounded-2xl bg-white ${match.isLocked ? 'blur-[3px] opacity-60' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-extrabold text-[18px] text-[#1e1b4b] leading-tight mb-1">{job.companyName}</h3>
                      <p className="text-[#6b7280] font-bold text-sm">{job.role}</p>
                    </div>
                    {!match.isLocked && (
                      <div className="bg-[#10b981]/10 text-[#10b981] px-3 py-1 rounded-full text-xs font-extrabold whitespace-nowrap">
                        {match.matchScore}% Match
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="flex items-center text-xs font-bold text-primary bg-primary/5 px-2 py-1.5 rounded-md">
                      <DollarSign className="w-3.5 h-3.5 mr-1" /> {job.ctcMin}-{job.ctcMax} LPA
                    </div>
                    <div className="flex items-center text-xs font-bold text-[#6b7280] bg-[#f5f3ff] px-2 py-1.5 rounded-md">
                      <MapPin className="w-3.5 h-3.5 mr-1" /> {job.remote ? "Remote" : job.location}
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap mb-5">
                    {job.requiredSkills.map(skill => (
                      <span key={skill} className="text-[10px] bg-[#06b6d4]/10 text-[#06b6d4] font-extrabold px-2 py-1 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <motion.div whileTap={{ scale: match.isLocked ? 1 : 0.97 }}>
                    <Button 
                      className={`w-full font-bold h-12 rounded-full text-[15px] ${!match.isLocked ? 'bg-white text-primary border-2 border-primary hover:bg-primary hover:text-white' : 'bg-[#ede9fe] text-[#6b7280] border-0'}`}
                      variant="outline"
                      disabled={match.isLocked}
                    >
                      Apply Now <ExternalLink className="w-4 h-4 ml-1.5" />
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {jobMatches.some(m => m.isLocked) && (
          <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-[#f5f3ff] via-[#f5f3ff]/90 to-transparent flex items-end justify-center pb-6 z-10">
            <motion.div whileTap={{ scale: 0.97 }} className="w-full px-4">
              <Button className="w-full text-white font-bold h-14 rounded-full text-[16px] shadow-[0_8px_16px_rgba(124,58,237,0.25)] border-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
                <Lock className="w-5 h-5 mr-2" />
                Go Pro to Unlock All
              </Button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
