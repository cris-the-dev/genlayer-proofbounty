"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useCreateBounty } from "@/lib/hooks/useProofBounty";
import { useWallet } from "@/lib/genlayer/wallet";
import { parseGen } from "@/lib/format";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const REPO_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9._-]{1,100}$/;

export function CreateBountyModal() {
  const { isConnected } = useWallet();
  const create = useCreateBounty();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    repo: "",
    issue: "",
    title: "",
    criteria: "",
    days: "14",
    challengeHours: "48",
    reward: "1",
  });
  const [err, setErr] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<any>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!REPO_RE.test(form.repo.trim())) return setErr("Repository must look like owner/name");
    const issue = parseInt(form.issue, 10);
    if (!(issue > 0)) return setErr("Issue number must be positive");
    if (!form.title.trim() || form.title.length > 140) return setErr("Title must be 1–140 chars");
    if (form.criteria.trim().length < 20) return setErr("Criteria must be at least 20 chars");
    const days = parseFloat(form.days);
    if (!(days >= 1 / 24 && days <= 365)) return setErr("Duration must be 1 hour – 365 days");
    const challengeHours = parseFloat(form.challengeHours);
    if (!(challengeHours >= 1 && challengeHours <= 168))
      return setErr("Challenge window must be 1 – 168 hours");
    let reward: bigint;
    try {
      reward = parseGen(form.reward);
    } catch {
      return setErr("Invalid reward amount");
    }
    if (reward <= 0n) return setErr("Reward must be greater than zero");

    create.mutate(
      {
        repo: form.repo.trim(),
        issueNumber: issue,
        title: form.title.trim(),
        criteria: form.criteria.trim(),
        durationSeconds: Math.round(days * 86400),
        challengePeriodSeconds: Math.round(challengeHours * 3600),
        reward,
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="gradient" disabled={!isConnected}>
          <Plus className="w-4 h-4" /> Post bounty
        </Button>
      </DialogTrigger>
      <DialogContent className="brand-card border-2 sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Post a bounty</DialogTitle>
          <DialogDescription>
            The reward is escrowed in the contract. When GenLayer validators accept a merged PR,
            funders get a challenge window to appeal before the payout is released.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="repo">Repository</Label>
              <Input id="repo" placeholder="owner/name" value={form.repo} onChange={set("repo")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="issue">Issue #</Label>
              <Input id="issue" type="number" min={1} value={form.issue} onChange={set("issue")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="title">Title</Label>
            <Input id="title" maxLength={140} value={form.title} onChange={set("title")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="criteria">Acceptance criteria</Label>
            <textarea
              id="criteria"
              rows={5}
              maxLength={2000}
              value={form.criteria}
              onChange={set("criteria")}
              placeholder="Be specific and verifiable from the diff, e.g. 'Adds a --json flag to the CLI, documents it in README, includes unit tests.'"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="reward">Reward (GEN)</Label>
              <Input id="reward" value={form.reward} onChange={set("reward")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="days">Duration (days)</Label>
              <Input id="days" type="number" step="0.5" value={form.days} onChange={set("days")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="challenge">Challenge window (h)</Label>
              <Input
                id="challenge"
                type="number"
                value={form.challengeHours}
                onChange={set("challengeHours")}
              />
            </div>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button type="submit" variant="gradient" className="w-full" disabled={create.isPending}>
            {create.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Waiting for consensus…
              </>
            ) : (
              "Escrow reward & publish"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
