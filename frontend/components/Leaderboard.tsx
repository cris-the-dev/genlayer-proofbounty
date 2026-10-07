"use client";

import { useLeaderboard, useStats } from "@/lib/hooks/useProofBounty";
import { formatGen, shortAddr } from "@/lib/format";

export function Leaderboard() {
  const { data: rows } = useLeaderboard();
  const { data: stats } = useStats();

  return (
    <aside className="space-y-8 text-sm">
      <dl className="border-t border-border">
        <Stat label="Open bounties" value={stats ? String(stats.open) : "–"} />
        <Stat label="In challenge window" value={stats ? String(stats.pending) : "–"} />
        <Stat label="Claims judged" value={stats ? String(stats.claims) : "–"} />
        <Stat label="Appeals" value={stats ? String(stats.challenges) : "–"} />
        <Stat label="In escrow" value={stats ? `${formatGen(stats.total_escrowed, 2)} GEN` : "–"} />
        <Stat label="Paid out" value={stats ? `${formatGen(stats.total_paid, 2)} GEN` : "–"} />
      </dl>

      <div>
        <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground border-b border-border pb-2 mb-2">Top contributors</h2>
        {!rows?.length && <p className="text-sm text-muted-foreground">No payouts yet.</p>}
        <ol className="space-y-2">
          {rows?.slice(0, 10).map((r, i) => (
            <li key={r.address} className="flex items-baseline justify-between gap-2">
              <span>
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                <span className="font-mono">{shortAddr(r.address)}</span>
              </span>
              <span className="font-mono text-xs tabular-nums">
                {formatGen(r.earned, 2)} GEN · {r.wins} win{r.wins === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}
