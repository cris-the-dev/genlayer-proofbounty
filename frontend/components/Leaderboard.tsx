"use client";

import { Trophy } from "lucide-react";
import { useLeaderboard, useStats } from "@/lib/hooks/useProofBounty";
import { formatGen, shortAddr } from "@/lib/format";

export function Leaderboard() {
  const { data: rows } = useLeaderboard();
  const { data: stats } = useStats();

  return (
    <div className="space-y-6">
      <div className="brand-card p-6 grid grid-cols-2 gap-4 text-center">
        <Stat label="Open bounties" value={stats ? String(stats.open) : "–"} />
        <Stat label="In challenge window" value={stats ? String(stats.pending) : "–"} />
        <Stat label="Claims judged" value={stats ? String(stats.claims) : "–"} />
        <Stat label="Appeals" value={stats ? String(stats.challenges) : "–"} />
        <Stat label="In escrow" value={stats ? `${formatGen(stats.total_escrowed, 2)} GEN` : "–"} />
        <Stat label="Paid out" value={stats ? `${formatGen(stats.total_paid, 2)} GEN` : "–"} />
      </div>

      <div className="brand-card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" /> Top contributors
        </h2>
        {!rows?.length && <p className="text-sm text-muted-foreground">No payouts yet.</p>}
        <ol className="space-y-2">
          {rows?.slice(0, 10).map((r, i) => (
            <li key={r.address} className="flex items-center justify-between text-sm">
              <span>
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                <span className="font-mono">{shortAddr(r.address)}</span>
              </span>
              <span className="font-semibold text-accent">
                {formatGen(r.earned, 2)} GEN · {r.wins} win{r.wins === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-accent">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
