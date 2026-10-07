"use client";

import { AccountPanel } from "./AccountPanel";

// Cross-links between the eight Builders Program submissions.
const SITES: [string, string][] = [
  ["01", "https://proofbounty.cristhedev.com"],
  ["02", "https://proofbounty-v2.cristhedev.com"],
  ["03", "https://ic-security-audit.cristhedev.com"],
  ["04", "https://oracle-kit.cristhedev.com"],
  ["05", "https://workshop.cristhedev.com"],
  ["06", "https://docs-security.cristhedev.com"],
  ["07", "https://rainfall-insurance.cristhedev.com"],
  ["08", "https://dealcourt.cristhedev.com"],
];

export function Navbar({ current }: { current: string }) {
  return (
    <header className="border-b border-border bg-background">
      <div className="max-w-5xl mx-auto px-4 h-11 flex items-center justify-between gap-4 text-sm">
        <span className="font-mono text-muted-foreground truncate hidden sm:inline">
          cristhedev <span className="text-border">/</span> genlayer builds
        </span>
        <nav className="flex min-w-0 font-mono text-xs overflow-x-auto">
          {SITES.map(([n, href]) => (
            <a
              key={n}
              href={href}
              aria-current={n === current ? "page" : undefined}
              className={`px-1.5 py-1 ${n === current ? "text-foreground underline underline-offset-4" : "text-muted-foreground hover:text-foreground"}`}
            >
              {n}
            </a>
          ))}
        </nav>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">ProofBounty{current === "02" ? " v2" : ""}</h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
            Bounties on GitHub issues, paid out when GenLayer validators agree the merged PR meets the
            criteria.
          </p>
        </div>
        <AccountPanel />
      </div>
    </header>
  );
}
