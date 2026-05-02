import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Target, Users, Lock, ChevronRight, MessageSquare, Briefcase } from "lucide-react";
import { useCreateInterviewSession, useCreateTestSession } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Prep() {
  const [, setLocation] = useLocation();
  const [studentId, setStudentId] = useState<number | null>(null);
  
  const [interviewDrawerOpen, setInterviewDrawerOpen] = useState(false);
  const [interviewCompany, setInterviewCompany] = useState("Any");
  const [interviewRound, setInterviewRound] = useState("Technical");
  
  const [testDrawerOpen, setTestDrawerOpen] = useState(false);
  const [testType, setTestType] = useState("Aptitude");
  const [testDifficulty, setTestDifficulty] = useState("Medium");

  const createInterview = useCreateInterviewSession();
  const createTest = useCreateTestSession();

  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (!id) {
      setLocation("/");
    } else {
      setStudentId(parseInt(id, 10));
    }
  }, [setLocation]);

  const handleStartInterview = async () => {
    if (!studentId) return;
    try {
      const session = await createInterview.mutateAsync({
        data: {
          studentId,
          company: interviewCompany,
          round: interviewRound
        }
      });
      setLocation(`/prep/interview/${session.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartTest = async () => {
    if (!studentId) return;
    try {
      const session = await createTest.mutateAsync({
        data: {
          studentId,
          testType,
          difficulty: testDifficulty
        }
      });
      setLocation(`/prep/test/${session.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 pb-24 max-w-md mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold flex items-center">
          <Target className="mr-2" /> Prep Hub
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Practice with AI and get ready for the real thing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-primary/50 bg-gradient-to-br from-card to-primary/10 overflow-hidden cursor-pointer group" onClick={() => setInterviewDrawerOpen(true)}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-2">
                    FREE: 1/month
                  </div>
                  <h3 className="text-xl font-bold flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-primary" />
                    AI Mock Interview
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Real-time voice/text chat with AI recruiter</p>
                </div>
                <div className="bg-background rounded-full p-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-secondary/50 bg-gradient-to-br from-card to-secondary/10 overflow-hidden cursor-pointer group" onClick={() => setTestDrawerOpen(true)}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="bg-secondary text-secondary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-2">
                    FREE: 2/month
                  </div>
                  <h3 className="text-xl font-bold flex items-center">
                    <Briefcase className="w-5 h-5 mr-2 text-secondary" />
                    AI Mock Test
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Timed MCQ tests modeled after TCS NQT, AMCAT</p>
                </div>
                <div className="bg-background rounded-full p-2 group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/50 bg-card/50 relative overflow-hidden h-32">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <Lock className="w-6 h-6 text-muted-foreground mb-2" />
              <div className="bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full">
                PRO ₹299/mo
              </div>
            </div>
            <CardContent className="p-5 opacity-50">
              <h3 className="text-lg font-bold flex items-center">
                <Users className="w-5 h-5 mr-2 text-muted-foreground" />
                Mentor Chat
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Chat directly with seniors at product companies</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-border/50 bg-card/50 relative overflow-hidden h-32">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <Lock className="w-6 h-6 text-muted-foreground mb-2" />
              <div className="bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full">
                PRO ₹299/mo
              </div>
            </div>
            <CardContent className="p-5 opacity-50">
              <h3 className="text-lg font-bold flex items-center">
                <Users className="w-5 h-5 mr-2 text-muted-foreground" />
                1:1 Mentor Meeting
              </h3>
              <p className="text-sm text-muted-foreground mt-1">45-min video call for resume review & mock interview</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Drawer open={interviewDrawerOpen} onOpenChange={setInterviewDrawerOpen}>
        <DrawerContent className="bg-card border-border">
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle>Setup Mock Interview</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Target Company</Label>
                <Select value={interviewCompany} onValueChange={setInterviewCompany}>
                  <SelectTrigger id="company" className="w-full bg-background">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground z-50">
                    <SelectItem value="TCS">TCS</SelectItem>
                    <SelectItem value="Zerodha">Zerodha</SelectItem>
                    <SelectItem value="Razorpay">Razorpay</SelectItem>
                    <SelectItem value="Startup">Early Stage Startup</SelectItem>
                    <SelectItem value="Any">Any Tech Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="round">Interview Round</Label>
                <Select value={interviewRound} onValueChange={setInterviewRound}>
                  <SelectTrigger id="round" className="w-full bg-background">
                    <SelectValue placeholder="Select round" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground z-50">
                    <SelectItem value="HR">HR / Behavioral</SelectItem>
                    <SelectItem value="Technical">Technical Fundamentals</SelectItem>
                    <SelectItem value="DSA">Data Structures & Algo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={handleStartInterview} disabled={createInterview.isPending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                {createInterview.isPending ? "Setting up..." : "Start Interview"}
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={testDrawerOpen} onOpenChange={setTestDrawerOpen}>
        <DrawerContent className="bg-card border-border">
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle>Setup Mock Test</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testType">Test Type</Label>
                <Select value={testType} onValueChange={setTestType}>
                  <SelectTrigger id="testType" className="w-full bg-background">
                    <SelectValue placeholder="Select test type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground z-50">
                    <SelectItem value="TCS NQT">TCS NQT Pattern</SelectItem>
                    <SelectItem value="AMCAT">AMCAT Pattern</SelectItem>
                    <SelectItem value="Python">Python Fundamentals</SelectItem>
                    <SelectItem value="DSA">Data Structures</SelectItem>
                    <SelectItem value="Aptitude">Quantitative Aptitude</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={testDifficulty} onValueChange={setTestDifficulty}>
                  <SelectTrigger id="difficulty" className="w-full bg-background">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground z-50">
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={handleStartTest} disabled={createTest.isPending} className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold">
                {createTest.isPending ? "Generating..." : "Start Test (20 mins)"}
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
