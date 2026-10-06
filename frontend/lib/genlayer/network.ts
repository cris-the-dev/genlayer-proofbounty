import { localnet, studionet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";

/**
 * Selects the GenLayer chain from NEXT_PUBLIC_GENLAYER_NETWORK.
 * Supported: studionet (default), localnet, testnetAsimov, testnetBradbury.
 */
const CHAINS = { localnet, studionet, testnetAsimov, testnetBradbury } as const;

export type NetworkName = keyof typeof CHAINS;

export function getNetworkName(): NetworkName {
  const name = (process.env.NEXT_PUBLIC_GENLAYER_NETWORK || "studionet") as NetworkName;
  return name in CHAINS ? name : "studionet";
}

export function getChain(): any {
  return CHAINS[getNetworkName()];
}
