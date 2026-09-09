import { Outlet, createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getSessionWorkspace } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { AppShell } from "@/components/app-shell";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, isPending } = useCurrentUserState();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), 12_000);
    return () => window.clearTimeout(timer);
  }, [isPending]);

  if (isPending && timedOut) {
    return (
      <div className="grid min-h-svh place-items-center bg-background px-6">
        <div className="max-w-md text-center">
          <p className="font-display text-3xl">Monthly</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign-in is taking too long. Refresh the page or try again.
          </p>
          <button
            type="button"
            className="mt-5 min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (isPending) return <BootSkeleton />;
  if (!user) return <RedirectToSignIn />;
  return <AuthedLayout />;
}

function AuthedLayout() {
  const { data, error, loading, reload } = useAsync(() => getSessionWorkspace(), []);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), 12_000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  if (loading && timedOut) {
    return (
      <div className="grid min-h-svh place-items-center bg-background px-6">
        <div className="max-w-md text-center">
          <p className="font-display text-3xl">Monthly</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Workspace is taking too long to load. Check your connection and try again.
          </p>
          <button
            type="button"
            className="mt-5 min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            onClick={() => {
              setTimedOut(false);
              reload();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (loading) return <BootSkeleton />;
  if (error === "Unauthorized") return <RedirectToSignIn />;
  if (error || !data) {
    return (
      <div className="grid min-h-svh place-items-center bg-background px-6">
        <div className="max-w-sm text-center">
          <p className="text-sm text-muted-foreground">{error ?? "Could not load the workspace."}</p>
          <button
            type="button"
            className="mt-5 min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            onClick={() => reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (!data.profile.isActive) {
    return (
      <div className="grid min-h-svh place-items-center bg-background px-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Access pending</p>
          <h1 className="mt-2 font-display text-3xl">Waiting for activation</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            An administrator needs to activate {data.profile.email ?? "this account"} before you can view client work.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppShell profile={data.profile} settings={data.settings}>
      <Outlet />
    </AppShell>
  );
}

function BootSkeleton() {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-6">
      <div className="text-center">
        <p className="font-display text-3xl">Monthly</p>
        <p className="mt-2 text-sm text-muted-foreground">Loading workspace…</p>
      </div>
    </div>
  );
}