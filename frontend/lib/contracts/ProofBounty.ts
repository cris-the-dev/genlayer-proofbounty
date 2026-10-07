import { createClient } from "genlayer-js";
import { getChain } from "../genlayer/network";
import {
  estimateWriteFeePreset,
  feePresetToTransactionFees,
  type FeePresetLevel,
} from "../genlayer/fees";
import type {
  Bounty,
  Challenge,
  Claim,
  LeaderboardEntry,
  Stats,
  TransactionReceipt,
} from "./types";

/** genlayer-js decodes contract dicts as Map; convert recursively to plain objects. */
export function toPlain(value: any): any {
  if (value instanceof Map) {
    const obj: Record<string, any> = {};
    for (const [k, v] of value.entries()) obj[String(k)] = toPlain(v);
    return obj;
  }
  if (Array.isArray(value)) return value.map(toPlain);
  return value;
}

const num = (v: any) => Number(v ?? 0);
const big = (v: any) => BigInt(v ?? 0);

function toBounty(raw: any): Bounty {
  const b = toPlain(raw);
  return {
    ...b,
    id: num(b.id),
    issue_number: num(b.issue_number),
    reward: big(b.reward),
    created_at: num(b.created_at),
    deadline: num(b.deadline),
    winning_pr: num(b.winning_pr),
    claim_count: num(b.claim_count),
    challenge_period: num(b.challenge_period),
    funder_count: num(b.funder_count),
    pending_pr: num(b.pending_pr),
    payout_at: num(b.payout_at),
    challenged: Boolean(b.challenged),
  };
}

function toClaim(raw: any): Claim {
  const c = toPlain(raw);
  return {
    ...c,
    bounty_id: num(c.bounty_id),
    pr_number: num(c.pr_number),
    evaluated_at: num(c.evaluated_at),
  };
}

/**
 * Typed wrapper around the ProofBounty intelligent contract.
 */
export default class ProofBounty {
  private address: `0x${string}`;
  private client: any;

  constructor(contractAddress: string, account?: string | null, endpoint?: string) {
    this.address = contractAddress as `0x${string}`;
    const config: any = { chain: getChain() };
    if (account) config.account = account as `0x${string}`;
    if (endpoint) config.endpoint = endpoint;
    this.client = createClient(config);
  }

  private read(functionName: string, args: unknown[] = []) {
    return this.client.readContract({ address: this.address, functionName, args });
  }

  private async write(
    functionName: string,
    args: unknown[],
    value: bigint = 0n,
    level: FeePresetLevel = "standard",
  ): Promise<TransactionReceipt> {
    const preset = await estimateWriteFeePreset(
      this.client,
      { address: this.address, functionName, args, value },
      level,
    );
    const fees = feePresetToTransactionFees(preset);
    const hash = await this.client.writeContract({
      address: this.address,
      functionName,
      args,
      value,
      ...(fees ? { fees } : {}),
    });
    const receipt = await this.client.waitForTransactionReceipt({
      hash,
      status: "ACCEPTED" as any,
      retries: 60,
      interval: 5000,
    });
    if (receipt?.txExecutionResultName === "FINISHED_WITH_ERROR") {
      throw new Error("Transaction reverted by the contract");
    }
    return receipt as TransactionReceipt;
  }

  // ── Views ────────────────────────────────────────────────────────────────

  async getBounties(offset = 0, limit = 50): Promise<Bounty[]> {
    const raw = await this.read("get_bounties", [offset, limit]);
    return (toPlain(raw) as any[]).map(toBounty);
  }

  async getBounty(id: number): Promise<Bounty> {
    return toBounty(await this.read("get_bounty", [id]));
  }

  async getClaims(bountyId: number): Promise<Claim[]> {
    const raw = await this.read("get_claims", [bountyId]);
    return (toPlain(raw) as any[]).map(toClaim);
  }

  async getClaimTag(address: string): Promise<string> {
    return String(await this.read("get_claim_tag", [address]));
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const raw = toPlain(await this.read("get_leaderboard")) as any[];
    return raw.map((r) => ({ address: r.address, earned: big(r.earned), wins: num(r.wins) }));
  }

  async getStats(): Promise<Stats> {
    const s = toPlain(await this.read("get_stats"));
    return {
      bounties: num(s.bounties),
      open: num(s.open),
      pending: num(s.pending),
      claims: num(s.claims),
      challenges: num(s.challenges),
      total_escrowed: big(s.total_escrowed),
      total_paid: big(s.total_paid),
      total_refunded: big(s.total_refunded),
    };
  }

  async getContributor(
    address: string,
  ): Promise<{ earned: bigint; wins: number; rejections: number; overturned: number }> {
    const c = toPlain(await this.read("get_contributor", [address]));
    return {
      earned: big(c.earned),
      wins: num(c.wins),
      rejections: num(c.rejections),
      overturned: num(c.overturned),
    };
  }

  async getChallenge(bountyId: number): Promise<Challenge | null> {
    const c = toPlain(await this.read("get_challenge", [bountyId]));
    if (!c || Object.keys(c).length === 0) return null;
    return {
      ...c,
      bounty_id: num(c.bounty_id),
      pr_number: num(c.pr_number),
      bond: big(c.bond),
      resolved_at: num(c.resolved_at),
    };
  }

  async getContribution(bountyId: number, address: string): Promise<bigint> {
    return big(await this.read("get_contribution", [bountyId, address]));
  }

  // ── Writes ───────────────────────────────────────────────────────────────

  createBounty(p: {
    repo: string;
    issueNumber: number;
    title: string;
    criteria: string;
    durationSeconds: number;
    challengePeriodSeconds: number;
    reward: bigint;
  }) {
    return this.write(
      "create_bounty",
      [p.repo, p.issueNumber, p.title, p.criteria, p.durationSeconds, p.challengePeriodSeconds],
      p.reward,
    );
  }

  fundBounty(bountyId: number, amount: bigint) {
    return this.write("fund_bounty", [bountyId], amount);
  }

  challengeClaim(bountyId: number, reason: string, bond: bigint) {
    // Appeal re-runs the full web + LLM judgment.
    return this.write("challenge_claim", [bountyId, reason], bond, "high");
  }

  finalizePayout(bountyId: number) {
    return this.write("finalize_payout", [bountyId]);
  }

  claimRefund(bountyId: number) {
    return this.write("claim_refund", [bountyId]);
  }

  submitClaim(bountyId: number, prNumber: number) {
    // Claims trigger web fetches + LLM consensus: use the higher fee preset
    // so the transaction can survive an appeal round.
    return this.write("submit_claim", [bountyId, prNumber], 0n, "high");
  }

  cancelBounty(bountyId: number) {
    return this.write("cancel_bounty", [bountyId]);
  }

  extendDeadline(bountyId: number, extraSeconds: number) {
    return this.write("extend_deadline", [bountyId, extraSeconds]);
  }
}
