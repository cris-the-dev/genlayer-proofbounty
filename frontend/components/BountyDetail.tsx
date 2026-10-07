"use client";

import { useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Gavel, Loader2, XCircle } from "lucide-react";
import type { Bounty } from "@/lib/contracts/types";
import { REASON_LABELS } from "@/lib/contracts/types";
import {
  useCancelBounty,
  useChallenge,
  useChallengeClaim,
  useClaimRefund,
  useClaimTag,
  useClaims,
  useContribution,
  useFinalizePayout,
  useFundBounty,
  useSubmitClaim,
} from "@/lib/hooks/useProofBounty";
import { useWallet } from "@/lib/genlayer/wallet";
import { formatGen, parseGen, shortAddr, timeLeft } from "@/lib/format";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function BountyDetail({
  bounty,
  onClose,
}: {
  bounty: Bounty | null;
  onClose: () => void;
}) {
  const { address } = useWallet();
  const claims = useClaims(bounty?.id ?? null);
  const tag = useClaimTag(address);
  const submit = useSubmitClaim();
  const cancel = useCancelBounty();
  const fund = useFundBounty();
  const challenge = useChallengeClaim();
  const finalize = useFinalizePayout();
  const refund = useClaimRefund();
  const challengeInfo = useChallenge(bounty?.id ?? null);
  const contribution = useContribution(bounty?.id ?? null, address);
  const [pr, setPr] = useState("");
  const [fundAmount, setFundAmount] = useState("0.5");
  const [reason, setReason] = useState("");

  if (!bounty) return null;

  const myContribution = contribution.data ?? 0n;
  const isFunder = myContribution > 0n;
  const minBond = bounty.reward / 10n > 0n ? bounty.reward / 10n : 1n;
  const pending = bounty.status === "PENDING";
  const windowOpen = pending && Date.now() / 1000 <= bounty.payout_at;

  const now = Date.now() / 1000;
  const isCreator = address?.toLowerCase() === bounty.creator.toLowerCase();
  const open = bounty.status === "OPEN";
  const expired = now > bounty.deadline;
  const issueUrl = `https://github.com/${bounty.repo}/issues/${bounty.issue_number}`;

  return (
    <Dialog open={!!bounty} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="brand-card border-2 sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {bounty.title}
            <Badge variant={open ? "default" : "secondary"}>{bounty.status}</Badge>
          </DialogTitle>
          <DialogDescription>
            <a href={issueUrl} target="_blank" rel="noreferrer" className="hover:underline">
              {bounty.repo}#{bounty.issue_number} <ExternalLink className="inline w-3 h-3" />
            </a>{" "}
            · {formatGen(bounty.reward)} GEN · {timeLeft(bounty.deadline)}
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="font-semibold text-sm">Acceptance criteria</h3>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{bounty.criteria}</p>
        </section>

        {open && !expired && (
          <form
            className="flex items-end gap-2 border-t pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const amount = parseGen(fundAmount);
                if (amount > 0n) fund.mutate({ bountyId: bounty.id, amount });
              } catch {}
            }}
          >
            <div className="flex-1 space-y-1">
              <Label htmlFor="fund">
                Add to the reward (GEN) · {bounty.funder_count} funder(s)
                {isFunder ? ` · you: ${formatGen(myContribution)} GEN` : ""}
              </Label>
              <Input id="fund" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} />
            </div>
            <Button type="submit" variant="outline" disabled={!address || fund.isPending}>
              {fund.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Fund
            </Button>
          </form>
        )}

        {pending && (
          <section className="space-y-3 border-t pt-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Gavel className="w-4 h-4" /> Payout pending
            </h3>
            <p className="text-sm text-muted-foreground">
              Validators accepted{" "}
              <a
                className="underline"
                target="_blank"
                rel="noreferrer"
                href={`https://github.com/${bounty.repo}/pull/${bounty.pending_pr}`}
              >
                PR #{bounty.pending_pr}
              </a>{" "}
              by <span className="font-mono">{shortAddr(bounty.pending_claimant)}</span>.{" "}
              {windowOpen
                ? `Funders can challenge for ${timeLeft(bounty.payout_at)}.`
                : "The challenge window is closed — anyone can release the payout."}
            </p>
            {!windowOpen && (
              <Button variant="gradient" disabled={finalize.isPending} onClick={() => finalize.mutate(bounty.id)}>
                {finalize.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Release payout
              </Button>
            )}
            {windowOpen && isFunder && !bounty.challenged && (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (reason.trim().length >= 10)
                    challenge.mutate({ bountyId: bounty.id, reason: reason.trim(), bond: minBond });
                }}
              >
                <Label htmlFor="reason">
                  Challenge (bond {formatGen(minBond)} GEN — lost to the contributor if the appeal
                  panel upholds the payout)
                </Label>
                <textarea
                  id="reason"
                  rows={3}
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain which acceptance criterion the diff fails to meet."
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
                <Button type="submit" variant="destructive" disabled={challenge.isPending}>
                  {challenge.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Appeal panel deliberating…
                    </>
                  ) : (
                    "Challenge payout"
                  )}
                </Button>
              </form>
            )}
          </section>
        )}

        {challengeInfo.data && (
          <section className="rounded-md border p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <Gavel className="w-4 h-4" /> Appeal on PR #{challengeInfo.data.pr_number}
              <Badge variant={challengeInfo.data.outcome === "UPHELD" ? "default" : "destructive"}>
                {challengeInfo.data.outcome}
              </Badge>
            </div>
            <p className="text-muted-foreground">“{challengeInfo.data.reason}”</p>
            <p>{challengeInfo.data.summary}</p>
          </section>
        )}

        {bounty.status === "CANCELLED" && isFunder && (
          <Button variant="outline" disabled={refund.isPending} onClick={() => refund.mutate(bounty.id)}>
            {refund.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Withdraw my {formatGen(myContribution)} GEN
          </Button>
        )}

        {open && !expired && !isCreator && !isFunder && (
          <section className="space-y-3 border-t pt-4">
            <h3 className="font-semibold text-sm">Claim this bounty</h3>
            <ol className="text-sm text-muted-foreground list-decimal ml-5 space-y-1">
              <li>
                Open a PR on <b>{bounty.repo}</b> that contains <code>Closes #{bounty.issue_number}</code>.
              </li>
              <li>
                Add your ownership tag to the PR description:
                {tag.data ? (
                  <button
                    type="button"
                    className="ml-2 inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-xs"
                    onClick={() => navigator.clipboard.writeText(tag.data!)}
                  >
                    {tag.data} <Copy className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="ml-2 italic">connect wallet to see it</span>
                )}
              </li>
              <li>Once the PR is merged, submit its number below.</li>
            </ol>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const n = parseInt(pr, 10);
                if (n > 0) submit.mutate({ bountyId: bounty.id, prNumber: n });
              }}
            >
              <div className="flex-1 space-y-1">
                <Label htmlFor="pr">Merged PR number</Label>
                <Input id="pr" type="number" min={1} value={pr} onChange={(e) => setPr(e.target.value)} />
              </div>
              <Button type="submit" variant="gradient" disabled={!address || submit.isPending}>
                {submit.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Validators judging…
                  </>
                ) : (
                  "Submit claim"
                )}
              </Button>
            </form>
          </section>
        )}

        {open && isCreator && expired && (
          <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate(bounty.id)}>
            {cancel.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Deadline passed — close bounty (funders then withdraw)
          </Button>
        )}

        {bounty.status === "PAID" && (
          <p className="text-sm">
            Paid to <span className="font-mono">{shortAddr(bounty.winner)}</span> for{" "}
            <a
              className="underline"
              target="_blank"
              rel="noreferrer"
              href={`https://github.com/${bounty.repo}/pull/${bounty.winning_pr}`}
            >
              PR #{bounty.winning_pr}
            </a>
          </p>
        )}

        <section className="space-y-2 border-t pt-4">
          <h3 className="font-semibold text-sm">Validator verdicts ({claims.data?.length ?? 0})</h3>
          {claims.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {claims.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No claims yet.</p>
          )}
          <ul className="space-y-2">
            {claims.data?.map((c) => (
              <li key={`${c.pr_number}-${c.evaluated_at}`} className="rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2">
                  {c.verdict === "ACCEPTED" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span className="font-medium">PR #{c.pr_number}</span>
                  <span className="font-mono text-xs text-muted-foreground">{shortAddr(c.claimant)}</span>
                  <Badge variant="outline">{c.reason_code}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {c.summary || REASON_LABELS[c.reason_code] || c.reason_code}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </DialogContent>
    </Dialog>
  );
}
