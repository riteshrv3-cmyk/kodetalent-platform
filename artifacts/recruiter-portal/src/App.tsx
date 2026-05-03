import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Login from "@/pages/Login";
import TalentPool from "@/pages/TalentPool";
import StudentDetail from "@/pages/StudentDetail";
import Shortlist from "@/pages/Shortlist";
import Showcase from "@/pages/Showcase";
import Dashboard from "@/pages/Dashboard";
import PostJob from "@/pages/PostJob";
import JobMatches from "@/pages/JobMatches";

const queryClient = new QueryClient();

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
