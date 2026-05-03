import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Login from "@/pages/Login";
import TalentPool from "@/pages/TalentPool";
import StudentDetail from "@/pages/StudentDetail";
import Shortlist from "@/pages/Shortlist";

const queryClient = new QueryClient();

function isLoggedIn() {
  return !!localStorage.getItem("recruiter");
}

function Guard({ children }: { children: React.ReactNode }) {
  const [, nav] = useLocation();
  useEffect(() => {
    if (!isLoggedIn()) nav("/login");
  }, [nav]);
  if (!isLoggedIn()) return null;
  return <>{children}</>;
}

function StudentDetailRoute({ id }: { id: string }) {
  return (
    <Guard>
      <StudentDetail id={Number(id)} />
    </Guard>
  );
}

function CatchAll() {
  const [, nav] = useLocation();
  useEffect(() => {
    nav(isLoggedIn() ? "/talent" : "/login");
  }, [nav]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/talent">
        <Guard><TalentPool /></Guard>
      </Route>
      <Route path="/student/:id" component={StudentDetailRoute} />
      <Route path="/shortlist">
        <Guard><Shortlist /></Guard>
      </Route>
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
