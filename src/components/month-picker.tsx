import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthTitle } from "@/lib/catalog";

export function MonthPicker({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  function shift(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    onChange(date.getFullYear(), date.getMonth() + 1);
  }
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
      <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" onClick={() => shift(-1)} aria-label="Previous month">
        <ChevronLeft />
      </Button>
      <div className="min-w-36 px-2 text-center text-sm font-medium tabular-nums">{monthTitle(year, month)}</div>
      <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" onClick={() => shift(1)} aria-label="Next month">
        <ChevronRight />
      </Button>
    </div>
  );
}
