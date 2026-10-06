"use client";

import { Navbar } from "@/components/Navbar";
import { BountyList } from "@/components/BountyList";
import { Leaderboard } from "@/components/Leaderboard";

const STEPS = [
  {
    title: "1. Escrow a bounty",
    body: "Pick a GitHub issue, write verifiable acceptance criteria and lock GEN in the contract. Funds can only go to a valid claimant, or back to you after the deadline.",
  },
  {
    title: "2. Merge a PR",
    body: "Contributors open a PR that closes the issue and carries their wallet tag (proofbounty:0x…), proving which address owns the work.",
  },
  {
    title: "3. Validators judge",
    body: "GenLayer validators fetch the PR from GitHub, check objective facts, then independently ask their own LLMs whether the diff meets the criteria. Consensus releases the reward.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-20 pb-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">ProofBounty</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Open-source bounties paid by consensus, not by trust.
              <br />
              Merged code in, GEN out — judged by GenLayer Intelligent Contracts.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-8 animate-slide-up">
              <BountyList />
            </div>
            <div className="lg:col-span-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
              <Leaderboard />
            </div>
          </div>

          <div className="mt-8 brand-card p-6 md:p-8 animate-fade-in">
            <h2 className="text-2xl font-bold mb-4">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STEPS.map((s) => (
                <div key={s.title} className="space-y-2">
                  <div className="text-accent font-bold text-lg">{s.title}</div>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t border-white/10 py-2">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent">
            Powered by GenLayer
          </a>
          <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent">
            Docs
          </a>
        </div>
      </footer>
    </div>
  );
}
