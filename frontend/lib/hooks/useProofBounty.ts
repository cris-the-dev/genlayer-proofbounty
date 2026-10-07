"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ProofBounty from "../contracts/ProofBounty";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { error, success } from "../utils/toast";

export function useProofBountyContract(): ProofBounty | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const endpoint = getStudioUrl();
  return useMemo(() => {
    if (!contractAddress) return null;
    return new ProofBounty(contractAddress, address, endpoint);
  }, [contractAddress, address, endpoint]);
}

export function useBounties() {
  const contract = useProofBountyContract();
  return useQuery({
    queryKey: ["bounties"],
    queryFn: () => contract!.getBounties(0, 50),
    enabled: !!contract,
    refetchInterval: 15_000,
  });
}

export function useClaims(bountyId: number | null) {
  const contract = useProofBountyContract();
  return useQuery({
    queryKey: ["claims", bountyId],
    queryFn: () => contract!.getClaims(bountyId!),
    enabled: !!contract && bountyId !== null,
  });
}

export function useStats() {
  const contract = useProofBountyContract();
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => contract!.getStats(),
    enabled: !!contract,
    refetchInterval: 15_000,
  });
}

export function useLeaderboard() {
  const contract = useProofBountyContract();
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => contract!.getLeaderboard(),
    enabled: !!contract,
  });
}

export function useContributor(address: string | null) {
  const contract = useProofBountyContract();
  return useQuery({
    queryKey: ["contributor", address],
    queryFn: () => contract!.getContributor(address!),
    enabled: !!contract && !!address,
  });
}

export function useClaimTag(address: string | null) {
  const contract = useProofBountyContract();
  return useQuery({
    queryKey: ["claimTag", address],
    queryFn: () => contract!.getClaimTag(address!),
    enabled: !!contract && !!address,
    staleTime: Infinity,
  });
}

function useContractMutation<TArgs>(
  run: (contract: ProofBounty, args: TArgs) => Promise<unknown>,
  messages: { ok: string; fail: string },
) {
  const contract = useProofBountyContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: TArgs) => {
      if (!contract) throw new Error("Set NEXT_PUBLIC_CONTRACT_ADDRESS in frontend/.env");
      if (!address) throw new Error("Connect your wallet first");
      return run(contract, args);
    },
    onSuccess: () => {
      for (const key of [
        "bounties",
        "claims",
        "stats",
        "leaderboard",
        "contributor",
        "challenge",
        "contribution",
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      success(messages.ok);
    },
    onError: (err: any) => error(messages.fail, { description: err?.message }),
  });
}

export function useCreateBounty() {
  return useContractMutation(
    (c, p: Parameters<ProofBounty["createBounty"]>[0]) => c.createBounty(p),
    { ok: "Bounty created and funds escrowed", fail: "Failed to create bounty" },
  );
}

export function useSubmitClaim() {
  return useContractMutation(
    (c, p: { bountyId: number; prNumber: number }) => c.submitClaim(p.bountyId, p.prNumber),
    { ok: "Claim evaluated by GenLayer validators", fail: "Claim transaction failed" },
  );
}

export function useCancelBounty() {
  return useContractMutation((c, id: number) => c.cancelBounty(id), {
    ok: "Bounty cancelled and refunded",
    fail: "Failed to cancel bounty",
  });
}

export function useChallenge(bountyId: number | null) {
  const contract = useProofBountyContract();
  return useQuery({
    queryKey: ["challenge", bountyId],
    queryFn: () => contract!.getChallenge(bountyId!),
    enabled: !!contract && bountyId !== null,
  });
}

export function useContribution(bountyId: number | null, address: string | null) {
  const contract = useProofBountyContract();
  return useQuery({
    queryKey: ["contribution", bountyId, address],
    queryFn: () => contract!.getContribution(bountyId!, address!),
    enabled: !!contract && bountyId !== null && !!address,
  });
}

export function useFundBounty() {
  return useContractMutation(
    (c, p: { bountyId: number; amount: bigint }) => c.fundBounty(p.bountyId, p.amount),
    { ok: "Bounty funded", fail: "Funding failed" },
  );
}

export function useChallengeClaim() {
  return useContractMutation(
    (c, p: { bountyId: number; reason: string; bond: bigint }) =>
      c.challengeClaim(p.bountyId, p.reason, p.bond),
    { ok: "Appeal panel has ruled", fail: "Challenge failed" },
  );
}

export function useFinalizePayout() {
  return useContractMutation((c, id: number) => c.finalizePayout(id), {
    ok: "Payout released",
    fail: "Finalize failed",
  });
}

export function useClaimRefund() {
  return useContractMutation((c, id: number) => c.claimRefund(id), {
    ok: "Refund sent",
    fail: "Refund failed",
  });
}
