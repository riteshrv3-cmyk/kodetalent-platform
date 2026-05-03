import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, lazy, Suspense } from "react";
import Login from "@/pages/Login";

const TalentPool = lazy(() => import("@/pages/TalentPool"));
const StudentDetail = lazy(() => import("@/pages/StudentDetail"));
const Shortlist = lazy(() => import("@/pages/Shortlist"));
const Showcase = lazy(() => import("@/pages/Showcase"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const PostJob = lazy(() => import("@/pages/PostJob"));
const JobMatches = lazy(() => import("@/pages/JobMatches"));

function PageSkeleton() {
  return (
    <div className="p-6 space-y-4" data-testid="page-loading-skeleton">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function isLoggedIn() {
  try {
    const raw = localStorage.getItem("recruiter");
    if (!raw) return false;
    const r = JSON.parse(raw);
    return !!r?.id;
  } catch { return false; }
}

function Guard({ children }: { children: React.ReactNode }) {
  const [, nav] = useLocation();
  useEffect(() => {
    if (!isLoggedIn()) nav("/login");
  }, [nav]);
  if (!isLoggedIn()) return null;
  return <>{children}</>;
}


function CatchAll() {
  const [, nav] = useLocation();
  useEffect(() => {
    nav(isLoggedIn() ? "/dashboard" : "/welcome");
  }, [nav]);
  return null;
}

function Router() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Switch>
        <Route path="/welcome" component={Showcase} />
        <Route path="/login" component={Login} />
        <Route path="/dashboard"><Guard><Dashboard /></Guard></Route>
        <Route path="/post-job"><Guard><PostJob /></Guard></Route>
        <Route path="/job/:id">{(params) => <Guard><JobMatches id={params.id} /></Guard>}</Route>
        <Route path="/talent"><Guard><TalentPool /></Guard></Route>
        <Route path="/student/:id">{(params) => <Guard><StudentDetail id={Number(params.id)} /></Guard>}</Route>
        <Route path="/shortlist"><Guard><Shortlist /></Guard></Route>
        <Route component={CatchAll} />
      </Switch>
    </Suspense>
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
