import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user } = useCurrentUserState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" />;

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await authClient.signIn.email({ email, password, callbackURL: "/" });
    if (result.error) setError(result.error.message ?? "Could not sign in.");
    setBusy(false);
  }

  return (
    <main className="grid min-h-svh bg-background md:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden flex-col justify-between border-r border-border bg-card px-12 py-12 md:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-xl">
            M
          </span>
          <span className="font-display text-2xl">Monthly</span>
        </div>
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Work first</p>
          <h1 className="mt-3 max-w-md font-display text-5xl leading-[1.05] text-foreground">
            What happened for this client this month?
          </h1>
          <p className="mt-4 max-w-sm text-muted-foreground">
            Enter work once in the client workspace. Reports, summaries, and payments come from that record.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">A client work operating system.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="font-display text-3xl md:hidden">Monthly</p>
          <h2 className="mt-2 font-display text-3xl">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Studio members only.</p>
          {authEnabled ? (
            <div className="mt-8 space-y-3">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                >
                  Continue with {p.label}
                </Button>
              ))}
              <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or email
                <span className="h-px flex-1 bg-border" />
              </div>
              <form className="space-y-3" onSubmit={onEmail}>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" className="h-11 w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Continue with email"}
                </Button>
              </form>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">Sign-in is disabled.</p>
          )}
        </div>
      </section>
    </main>
  );
}
