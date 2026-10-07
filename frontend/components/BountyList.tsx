"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Bounty, BountyStatus } from "@/lib/contracts/types";
import { useBounties } from "@/lib/hooks/useProofBounty";
import { formatGen, timeLeft } from "@/lib/format";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CreateBountyModal } from "./CreateBountyModal";
import { BountyDetail } from "./BountyDetail";

const FILTERS: (BountyStatus | "ALL")[] = ["OPEN", "PENDING", "PAID", "CANCELLED", "ALL"];

export function BountyList() {
  const { data, isLoading, isError, error } = useBounties();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("OPEN");
  const [selected, setSelected] = useState<Bounty | null>(null);

  const rows = useMemo(
    () => (data ?? []).filter((b) => filter === "ALL" || b.status === filter).reverse(),
    [data, filter],
  );

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
        <div className="flex flex-wrap gap-1 -ml-2" role="tablist" aria-label="Filter bounties">
          {FILTERS.map((f) => (
            <Button key={f} size="sm" variant="ghost" role="tab" aria-selected={f === filter} className={`font-mono text-xs ${f === filter ? "text-foreground underline underline-offset-[6px]" : "text-muted-foreground"}`} onClick={() => setFilter(f)}>
              {f}
            </Button>
          ))}
        </div>
        <CreateBountyModal />
      </div>

      {isLoading && <Loader2 className="w-6 h-6 animate-spin mx-auto my-8" />}
      {isError && <p className="text-destructive text-sm">{String(error?.message ?? error)}</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-muted-foreground text-sm py-8">
          No {filter === "ALL" ? "" : filter.toLowerCase() + " "}bounties on this contract yet. Connect a wallet and post the first one.
        </p>
      )}

      <ul className="divide-y divide-border">
        {rows.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => setSelected(b)}
              className="w-full text-left py-3 grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-3 hover:bg-secondary px-2 -mx-2"
            >
              <span className="font-mono text-xs text-muted-foreground">#{b.id}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{b.title}</span>
                  <Badge variant={b.status === "OPEN" ? "default" : "secondary"}>{b.status}</Badge>
                </div>
                <p className="font-mono text-xs text-muted-foreground mt-1 truncate">
                  {b.repo}#{b.issue_number} · {b.claim_count} claim(s) · {b.funder_count} funder(s) ·{" "}
                  {b.status === "OPEN" ? timeLeft(b.deadline) : "closed"}
                </p>
              </div>
              <span className="font-mono text-sm tabular-nums whitespace-nowrap text-right">{formatGen(b.reward)} GEN</span>
            </button>
          </li>
        ))}
      </ul>

      <BountyDetail
        bounty={selected ? (data?.find((b) => b.id === selected.id) ?? selected) : null}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
