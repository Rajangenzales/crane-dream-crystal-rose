import { Outlet, createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getSessionWorkspace } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <BootSkeleton />;
  if (!user) return <RedirectToSignIn />;
  return <AuthedLayout />;
}

function AuthedLayout() {
  const { data, error, loading } = useAsync(() => getSessionWorkspace(), []);

  if (loading) return <BootSkeleton />;
  if (error === "Unauthorized") return <RedirectToSignIn />;
  if (error || !data) {
    return (
      <div className="grid min-h-svh place-items-center bg-background px-6">
        <p className="max-w-sm text-center text-sm text-muted-foreground">{error ?? "Could not load the workspace."}</p>
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
