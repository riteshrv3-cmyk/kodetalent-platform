import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Roadmap from "@/pages/Roadmap";
import Prep from "@/pages/Prep";
import Interview from "@/pages/Interview";
import Test from "@/pages/Test";
import Opportunities from "@/pages/Opportunities";
import Course from "@/pages/Course";
import Profile from "@/pages/Profile";
import Leaderboard from "@/pages/Leaderboard";
import Resume from "@/pages/Resume";
import Inbox from "@/pages/Inbox";
import { AppLayout } from "@/components/layout/AppLayout";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Onboarding} />
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/roadmap" component={Roadmap} />
            <Route path="/prep" component={Prep} />
            <Route path="/prep/interview/:id" component={Interview} />
            <Route path="/prep/test/:id" component={Test} />
            <Route path="/opportunities" component={Opportunities} />
            <Route path="/opportunities/course" component={Course} />
            <Route path="/profile" component={Profile} />
            <Route path="/leaderboard" component={Leaderboard} />
            <Route path="/resume" component={Resume} />
            <Route path="/inbox" component={Inbox} />
            <Route component={NotFound} />
          </Switch>
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
