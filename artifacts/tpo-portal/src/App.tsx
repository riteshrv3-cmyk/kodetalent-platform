import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Students from "@/pages/Students";
import StudentProfile from "@/pages/StudentProfile";
import ActivityFeed from "@/pages/ActivityFeed";
import MentorHub from "@/pages/MentorHub";
import { Layout } from "@/components/Layout";

const queryClient = new QueryClient();

function isLoggedIn() {
  return !!localStorage.getItem("tpo");
}

function Guard({ children }: { children: React.ReactNode }) {
  const [, nav] = useLocation();
  useEffect(() => { if (!isLoggedIn()) nav("/login"); }, [nav]);
  if (!isLoggedIn()) return null;
  return <Layout>{children}</Layout>;
}

function StudentProfileRoute({ id }: { id: string }) {
  return <Guard><StudentProfile id={Number(id)} /></Guard>;
}

function CatchAll() {
  const [, nav] = useLocation();
  useEffect(() => { nav(isLoggedIn() ? "/dashboard" : "/login"); }, [nav]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/dashboard"><Guard><Dashboard /></Guard></Route>
      <Route path="/students"><Guard><Students /></Guard></Route>
      <Route path="/students/:id" component={StudentProfileRoute} />
      <Route path="/activity"><Guard><ActivityFeed /></Guard></Route>
      <Route path="/mentors"><Guard><MentorHub /></Guard></Route>
      <Route component={CatchAll} />
    </Switch>
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
