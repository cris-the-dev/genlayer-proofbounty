"use client";

import { useMemo, useState } from "react";
import { GitPullRequest, Loader2 } from "lucide-react";
import type { Bounty, BountyStatus } from "@/lib/contracts/types";
import { useBounties } from "@/lib/hooks/useProofBounty";
import { formatGen, timeLeft } from "@/lib/format";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { BountyDetail } from "./BountyDetail";

const FILTERS: (BountyStatus | "ALL")[] = ["OPEN", "PAID", "CANCELLED", "ALL"];

export function BountyList() {
  const { data, isLoading, isError, error } = useBounties();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("OPEN");
  const [selected, setSelected] = useState<Bounty | null>(null);

  const rows = useMemo(
    () => (data ?? []).filter((b) => filter === "ALL" || b.status === filter).reverse(),
    [data, filter],
  );

  return (
    <div className="brand-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Bounties</h2>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <Button key={f} size="sm" variant={f === filter ? "secondary" : "ghost"} onClick={() => setFilter(f)}>
              {f}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <Loader2 className="w-6 h-6 animate-spin mx-auto my-8" />}
      {isError && <p className="text-destructive text-sm">{String(error?.message ?? error)}</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-muted-foreground text-sm py-8 text-center">Nothing here yet.</p>
      )}

      <ul className="divide-y divide-white/10">
        {rows.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => setSelected(b)}
              className="w-full text-left py-4 flex items-start gap-4 hover:bg-white/5 rounded-md px-2"
            >
              <GitPullRequest className="w-5 h-5 mt-1 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{b.title}</span>
                  <Badge variant={b.status === "OPEN" ? "default" : "secondary"}>{b.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {b.repo}#{b.issue_number} · {b.claim_count} claim(s) ·{" "}
                  {b.status === "OPEN" ? timeLeft(b.deadline) : "closed"}
                </p>
              </div>
              <span className="font-bold text-accent whitespace-nowrap">{formatGen(b.reward)} GEN</span>
            </button>
          </li>
        ))}
      </ul>

      <BountyDetail
        bounty={selected ? (data?.find((b) => b.id === selected.id) ?? selected) : null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
