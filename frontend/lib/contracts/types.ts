/**
 * TypeScript mirrors of the ProofBounty contract view outputs.
 */

export type BountyStatus = "OPEN" | "PAID" | "CANCELLED";
export type Verdict = "ACCEPTED" | "REJECTED";

export interface Bounty {
  id: number;
  creator: string;
  repo: string;
  issue_number: number;
  title: string;
  criteria: string;
  reward: bigint;
  created_at: number;
  deadline: number;
  status: BountyStatus;
  winner: string;
  winning_pr: number;
  claim_count: number;
}

export interface Claim {
  bounty_id: number;
  claimant: string;
  pr_number: number;
  verdict: Verdict;
  reason_code: string;
  summary: string;
  evaluated_at: number;
}

export interface LeaderboardEntry {
  address: string;
  earned: bigint;
  wins: number;
}

export interface Stats {
  bounties: number;
  open: number;
  claims: number;
  total_escrowed: bigint;
  total_paid: bigint;
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  [key: string]: any;
}

/** Human-readable explanations for every reason code the contract emits. */
export const REASON_LABELS: Record<string, string> = {
  CRITERIA_MET: "AI validators agreed the PR satisfies the criteria",
  CRITERIA_NOT_MET: "AI validators agreed the PR does not satisfy the criteria",
  WRONG_REPO: "PR targets a different repository",
  NOT_MERGED: "PR is not merged",
  MERGED_OUTSIDE_WINDOW: "PR was merged before the bounty opened or after it closed",
  ISSUE_NOT_LINKED: "PR does not close/fix/resolve the bounty issue",
  MISSING_CLAIM_TAG: "PR description lacks the claimant's proofbounty tag",
};
