import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { lazy, Suspense } from "react";
import { queryClient } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";

const Overview = lazy(() => import("@/pages/Overview"));
const Students = lazy(() => import("@/pages/Students"));
const Recruiters = lazy(() => import("@/pages/Recruiters"));
const Jobs = lazy(() => import("@/pages/Jobs"));
const Colleges = lazy(() => import("@/pages/Colleges"));
const Invites = lazy(() => import("@/pages/Invites"));
const DriveChecks = lazy(() => import("@/pages/DriveChecks"));
const ActivityFeed = lazy(() => import("@/pages/ActivityFeed"));

function PageSkeleton() {
  return (
    <div className="p-6 space-y-4" data-testid="page-loading-skeleton">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Suspense fallback={<PageSkeleton />}>
        <Switch>
          <Route path="/" component={Overview} />
          <Route path="/students" component={Students} />
          <Route path="/recruiters" component={Recruiters} />
          <Route path="/jobs" component={Jobs} />
          <Route path="/colleges" component={Colleges} />
          <Route path="/invites" component={Invites} />
          <Route path="/drive-checks" component={DriveChecks} />
          <Route path="/activity" component={ActivityFeed} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
