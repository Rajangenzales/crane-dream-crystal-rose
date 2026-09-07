import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVITY_STATUSES, ACTIVITY_UNITS } from "@/lib/catalog";
import type { Activity } from "@/lib/types";

export type ActivityDraft = {
  activityDate: string;
  title: string;
  description: string;
  quantity: string;
  unit: string;
  status: string;
  notes: string;
};

const emptyDraft = (): ActivityDraft => ({
  activityDate: new Date().toISOString().slice(0, 10),
  title: "",
  description: "",
  quantity: "",
  unit: "",
  status: "planned",
  notes: "",
});

export function activityToDraft(activity: Activity): ActivityDraft {
  return {
    activityDate: activity.activityDate ?? "",
    title: activity.title,
    description: activity.description,
    quantity: activity.quantity == null ? "" : String(activity.quantity),
    unit: activity.unit,
    status: activity.status,
    notes: activity.notes,
  };
}

export function ActivityDialog({
  open,
  onOpenChange,
  title,
  initial,
  onSubmit,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial?: ActivityDraft | null;
  onSubmit: (draft: ActivityDraft) => Promise<void>;
  busy?: boolean;
}) {
  const [draft, setDraft] = useState<ActivityDraft>(emptyDraft());

  useEffect(() => {
    if (open) setDraft(initial ?? emptyDraft());
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit(draft);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="act-title">Title</Label>
            <Input
              id="act-title"
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="On-page optimisation"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="act-date">Date</Label>
              <Input
                id="act-date"
                type="date"
                value={draft.activityDate}
                onChange={(e) => setDraft({ ...draft, activityDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(status) => setDraft({ ...draft, status })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="act-qty">Quantity</Label>
              <Input
                id="act-qty"
                inputMode="decimal"
                value={draft.quantity}
                onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-2">
              <Label>Unit</Label>
              <Select value={draft.unit || "__none"} onValueChange={(unit) => setDraft({ ...draft, unit: unit === "__none" ? "" : unit })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {ACTIVITY_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="act-desc">Description</Label>
            <Textarea
              id="act-desc"
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="What was done"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="act-notes">Notes</Label>
            <Textarea
              id="act-notes"
              rows={2}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
