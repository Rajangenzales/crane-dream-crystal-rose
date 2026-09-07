import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { createService, getSessionWorkspace, listServices, updateService } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/services")({ component: ServicesPage });

function ServicesPage() {
  const session = useAsync(() => getSessionWorkspace(), []);
  const { data, loading, error, reload } = useAsync(() => listServices({ data: { includeInactive: true } }), []);
  const isAdmin = session.data?.profile.role === "admin";
  const [name, setName] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Catalogue</p>
        <h1 className="mt-1 font-display text-4xl">Service library</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Global services offered by the studio. Deactivating a service keeps historical monthly sections intact.
        </p>
      </div>
      {isAdmin ? (
        <form
          className="flex max-w-lg gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await createService({ data: { name, isGlobal: true } });
              setName("");
              toast.success("Service added");
              reload();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not add");
            }
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New service name" />
          <Button type="submit">Add</Button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading || !data ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {data.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.isGlobal ? "Library" : "Custom"}</p>
              </div>
              {isAdmin ? (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  Active
                  <Switch
                    checked={s.isActive}
                    onCheckedChange={async (isActive) => {
                      await updateService({ data: { id: s.id, name: s.name, isActive } });
                      reload();
                    }}
                  />
                </label>
              ) : (
                <span className="text-sm text-muted-foreground">{s.isActive ? "Active" : "Inactive"}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
