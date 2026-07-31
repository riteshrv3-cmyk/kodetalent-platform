import { useEffect, useRef, lazy, Suspense } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useClerk,
  useUser,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  Switch,
  Route,
  Router as WouterRouter,
  useLocation,
} from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import Join from "@/pages/Join";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthBridge } from "@/components/AuthBridge";
import { apiFetch, setGuestToken } from "@/lib/api/authFetch";
import RoleSelect from "@/pages/RoleSelect";

const Home = lazy(() => import("@/pages/Home"));
const AIChat = lazy(() => import("@/pages/AIChat"));
const Prep = lazy(() => import("@/pages/Prep"));
const Interview = lazy(() => import("@/pages/Interview"));
const InterviewHistory = lazy(() => import("@/pages/InterviewHistory"));
const Notebook = lazy(() => import("@/pages/Notebook"));
const Test = lazy(() => import("@/pages/Test"));
const Opportunities = lazy(() => import("@/pages/Opportunities"));
const Course = lazy(() => import("@/pages/Course"));
const Profile = lazy(() => import("@/pages/Profile"));
const Resume = lazy(() => import("@/pages/Resume"));
const Inbox = lazy(() => import("@/pages/Inbox"));
const DriveCheck = lazy(() => import("@/pages/DriveCheck"));
const Pipeline = lazy(() => import("@/pages/Pipeline"));
const RecruiterPortalShortcut = lazy(
  () => import("@/pages/RecruiterPortalShortcut"),
);
const Onboarding = lazy(() => import("@/pages/Onboarding"));

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
setBaseUrl(basePath);

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/favicon.png`,
    socialButtonsPlacement: "bottom" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  // Canopy tokens, not a parallel slate/indigo-600 palette. These were
  // Tailwind defaults (#4f46e5 indigo-600, #0f172a slate-900, #64748b
  // slate-500, #e2e8f0 slate-200, #f8fafc slate-50), so sign-in and sign-up
  // rendered in a colder, bluer palette than every other screen. Values below
  // mirror index.css: brand #4a55c7, ink #1a1d2e, ink-muted #9aa0ae,
  // line #ecedf3, canvas #f4f5f7, danger #dc2626.
  variables: {
    colorPrimary: "#4a55c7",
    colorForeground: "#1a1d2e",
    colorMutedForeground: "#9aa0ae",
    colorDanger: "#dc2626",
    colorBackground: "#ffffff",
    colorInput: "#f4f5f7",
    colorInputForeground: "#1a1d2e",
    colorNeutral: "#ecedf3",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-ink font-bold text-xl",
    headerSubtitle: "text-ink-muted text-sm",
    socialButtonsBlockButtonText: "text-ink font-semibold",
    formFieldLabel: "text-ink font-semibold text-sm",
    footerActionLink: "text-brand font-semibold",
    footerActionText: "text-ink-muted text-sm",
    dividerText: "text-ink-muted text-xs font-medium",
    logoBox: "mb-4",
    logoImage: "w-10 h-10",
    socialButtonsBlockButton:
      "h-11 rounded-xl border border-line hover:bg-canvas",
    // Solid brand, not a gradient. The blue-to-violet gradient CTA was the
    // loudest element on the first screen a new user sees, and the design
    // system rules out gradients on buttons outright.
    formButtonPrimary:
      "h-11 rounded-xl bg-brand font-bold hover:opacity-90",
    formFieldInput:
      "h-11 rounded-xl bg-canvas border-line text-ink",
    footerAction: "mt-4",
    dividerLine: "bg-line",
    alert: "rounded-xl",
    otpCodeFieldInput: "h-11 rounded-xl",
    formFieldRow: "gap-3",
    main: "gap-4",
  },
};

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

function RoleSelectRedirect() {
  const [, setLocation] = useLocation();
  const { isSignedIn, user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    let alive = true;

    const studentId = localStorage.getItem("studentId");
    const guestToken = localStorage.getItem("guestToken");

    apiFetch("/api/auth/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: studentId ? Number(studentId) : undefined,
        guestToken: guestToken ?? undefined,
      }),
    })
      .then((r) => r.json())
      .then((data: { student: { id: number }; claimed: boolean; created: boolean }) => {
        if (!alive) return;
        localStorage.setItem("studentId", String(data.student.id));
        localStorage.setItem("clerkUserId", user.id);
        if (user.primaryEmailAddress?.emailAddress) {
          localStorage.setItem("clerkEmail", user.primaryEmailAddress.emailAddress);
        }
        setGuestToken(null); // claimed rows never carry a guest token again
        setLocation(data.created ? "/onboarding" : "/home");
      })
      .catch(() => {
        if (alive) setLocation("/onboarding");
      });

    return () => {
      alive = false;
    };
  }, [isLoaded, isSignedIn, user, setLocation]);

  if (!isLoaded) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-canvas">
        <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isSignedIn) return null;
  return <RoleSelect />;
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/`}
      />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RoleSelectRedirect} />
      <Route path="/join/:code">{(p) => <Join code={p.code} />}</Route>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route>
        <AppLayout>
          <Suspense fallback={<PageSkeleton />}>
            <Switch>
              <Route path="/home" component={Home} />
              <Route path="/notebook" component={Notebook} />
              <Route path="/chat" component={AIChat} />
              <Route path="/practice" component={Prep} />
              <Route path="/practice/history" component={InterviewHistory} />
              <Route path="/practice/interview/:id" component={Interview} />
              <Route path="/practice/test/:id" component={Test} />
              <Route path="/opportunities" component={Opportunities} />
              <Route path="/opportunities/course" component={Course} />
              <Route path="/profile" component={Profile} />
              <Route path="/resume" component={Resume} />
              <Route path="/inbox" component={Inbox} />
              <Route path="/onboarding" component={Onboarding} />
              <Route path="/drive-check" component={DriveCheck} />
              <Route path="/pipeline" component={Pipeline} />
              <Route path="/recruiter" component={RecruiterPortalShortcut} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to KodeTalent",
          },
        },
        signUp: {
          start: {
            title: "Join KodeTalent",
            subtitle: "Start your AI career journey",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthBridge />
          <ClerkQueryClientCacheInvalidator />
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
