"use client";

import { Navbar } from "@/components/Navbar";
import { BountyList } from "@/components/BountyList";
import { Leaderboard } from "@/components/Leaderboard";
import { shortAddr } from "@/lib/format";
import { getNetworkName } from "@/lib/genlayer/network";

const SITE = "02";
const REPO = "https://github.com/cris-the-dev/genlayer-proofbounty/tree/v2.0.0";
const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const EXPLORER = "https://explorer-bradbury.genlayer.com/address/";
const NETWORK_LABEL: Record<string, string> = { testnetBradbury: "testnet bradbury", testnetAsimov: "testnet asimov", studionet: "studionet", localnet: "localnet" };

const STEPS = [
  ["Escrow", "Pick a GitHub issue, write acceptance criteria a reviewer could check, and lock GEN. It goes to a valid claimant, or back to you after the deadline."],
  ["Merge", "The contributor's PR closes the issue and includes their wallet tag (proofbounty:0x…) so the payout address is tied to the work."],
  ["Judge", "Validators fetch the PR, check the facts (merged, linked, in the window), then each asks its own LLM whether the diff meets the criteria. An accepted claim waits out a challenge window; a funder can post a bond to have it re-judged."],
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar current={SITE} />

      <div className="border-b border-border">
        <dl className="max-w-5xl mx-auto px-4 py-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
          <div>
            <dt className="inline">contract </dt>
            <dd className="inline">
              {CONTRACT ? (
                <a className="text-accent hover:underline" href={EXPLORER + CONTRACT}>{shortAddr(CONTRACT)} ↗</a>
              ) : "not set"}
            </dd>
          </div>
          <div><dt className="inline">network </dt><dd className="inline text-foreground">{NETWORK_LABEL[getNetworkName()] ?? getNetworkName()}</dd></div>
          <div><a className="text-accent hover:underline" href={REPO}>source ↗</a></div>
        </dl>
      </div>

      <main className="flex-grow max-w-5xl w-full mx-auto px-4 py-6 grid gap-8 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_260px]">
        <BountyList />
        <Leaderboard />
      </main>

      <section className="border-t border-border">
        <ol className="max-w-5xl mx-auto px-4 py-6 grid gap-6 md:grid-cols-3 text-sm">
          {STEPS.map(([title, body], i) => (
            <li key={title}>
              <div className="font-mono text-xs text-muted-foreground">0{i + 1}</div>
              <div className="font-semibold mt-1">{title}</div>
              <p className="text-muted-foreground mt-1">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-4 text-xs text-muted-foreground">
          <span>Built on <a className="hover:text-foreground underline" href="https://genlayer.com">GenLayer</a></span>
          <a className="hover:text-foreground underline" href="https://docs.genlayer.com">Docs</a>
        </div>
      </footer>
    </div>
  );
}
