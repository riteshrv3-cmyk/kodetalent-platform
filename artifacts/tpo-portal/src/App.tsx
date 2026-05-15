import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, lazy, Suspense } from "react";
import Login from "@/pages/Login";
import { Layout } from "@/components/Layout";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Students = lazy(() => import("@/pages/Students"));
const StudentProfile = lazy(() => import("@/pages/StudentProfile"));
const ActivityFeed = lazy(() => import("@/pages/ActivityFeed"));
const MentorHub = lazy(() => import("@/pages/MentorHub"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Insights = lazy(() => import("@/pages/Insights"));
const DriveFeed = lazy(() => import("@/pages/DriveFeed"));
const AnnounceDrives = lazy(() => import("@/pages/AnnounceDrives"));
const Invite = lazy(() => import("@/pages/Invite"));

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
  return !!localStorage.getItem("tpo");
}

function Guard({ children }: { children: React.ReactNode }) {
  const [, nav] = useLocation();
  useEffect(() => { if (!isLoggedIn()) nav("/login"); }, [nav]);
  if (!isLoggedIn()) return null;
  return <Layout>{children}</Layout>;
}

function StudentProfileRoute({ params }: { params: { id: string } }) {
  return <Guard><StudentProfile id={Number(params.id ?? "0")} /></Guard>;
}

function CatchAll() {
  const [, nav] = useLocation();
  useEffect(() => { nav(isLoggedIn() ? "/dashboard" : "/login"); }, [nav]);
  return null;
}

function Router() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/dashboard"><Guard><Dashboard /></Guard></Route>
        <Route path="/invite"><Guard><Invite /></Guard></Route>
        <Route path="/leaderboard"><Guard><Leaderboard /></Guard></Route>
        <Route path="/insights"><Guard><Insights /></Guard></Route>
        <Route path="/drives"><Guard><DriveFeed /></Guard></Route>
        <Route path="/announce"><Guard><AnnounceDrives /></Guard></Route>
        <Route path="/students"><Guard><Students /></Guard></Route>
        <Route path="/students/:id" component={StudentProfileRoute} />
        <Route path="/activity"><Guard><ActivityFeed /></Guard></Route>
        <Route path="/mentors"><Guard><MentorHub /></Guard></Route>
        <Route component={CatchAll} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
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
