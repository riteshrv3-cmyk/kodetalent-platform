import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import Overview from "@/pages/Overview";
import Students from "@/pages/Students";
import Recruiters from "@/pages/Recruiters";
import Jobs from "@/pages/Jobs";
import Colleges from "@/pages/Colleges";
import Invites from "@/pages/Invites";
import DriveChecks from "@/pages/DriveChecks";
import ActivityFeed from "@/pages/ActivityFeed";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
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
