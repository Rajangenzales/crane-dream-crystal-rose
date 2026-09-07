import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  planned: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary/10 text-primary",
  ongoing: "bg-primary/10 text-primary",
  delivered: "bg-chart-2/15 text-chart-2",
  completed: "bg-chart-2/15 text-chart-2",
  not_applicable: "bg-muted text-muted-foreground",
  pending: "bg-destructive/10 text-destructive",
  received: "bg-chart-2/15 text-chart-2",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full px-2.5 font-medium font-sans tracking-normal",
        TONE[value] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {statusLabel(value)}
    </Badge>
  );
}
