import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, lazy, Suspense } from "react";
import NotFound from "@/pages/not-found";
import Onboarding from "@/pages/Onboarding";
import Join from "@/pages/Join";
import { AppLayout } from "@/components/layout/AppLayout";

const Home = lazy(() => import("@/pages/Home"));
const AIChat = lazy(() => import("@/pages/AIChat"));
const Prep = lazy(() => import("@/pages/Prep"));
const Interview = lazy(() => import("@/pages/Interview"));
const InterviewHistory = lazy(() => import("@/pages/InterviewHistory"));
const Test = lazy(() => import("@/pages/Test"));
const Opportunities = lazy(() => import("@/pages/Opportunities"));
const Course = lazy(() => import("@/pages/Course"));
const Profile = lazy(() => import("@/pages/Profile"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Resume = lazy(() => import("@/pages/Resume"));
const Inbox = lazy(() => import("@/pages/Inbox"));
const DriveCheck = lazy(() => import("@/pages/DriveCheck"));
const RecruiterPortalShortcut = lazy(() => import("@/pages/RecruiterPortalShortcut"));

function PageSkeleton() {
  return (
    <div className="p-4 space-y-4" data-testid="page-loading-skeleton">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function RootRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const id = localStorage.getItem("studentId");
    if (id) setLocation("/home");
  }, [setLocation]);
  return <Onboarding />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/join/:code">{(p) => <Join code={p.code} />}</Route>
      <Route>
        <AppLayout>
          <Suspense fallback={<PageSkeleton />}>
            <Switch>
              <Route path="/home" component={Home} />
              <Route path="/dashboard" component={Home} />
              <Route path="/chat" component={AIChat} />
              <Route path="/practice" component={Prep} />
              <Route path="/practice/history" component={InterviewHistory} />
              <Route path="/practice/interview/:id" component={Interview} />
              <Route path="/practice/test/:id" component={Test} />
              <Route path="/opportunities" component={Opportunities} />
              <Route path="/opportunities/course" component={Course} />
              <Route path="/profile" component={Profile} />
              <Route path="/leaderboard" component={Leaderboard} />
              <Route path="/resume" component={Resume} />
              <Route path="/inbox" component={Inbox} />
              <Route path="/drive-check" component={DriveCheck} />
              <Route path="/recruiter" component={RecruiterPortalShortcut} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
