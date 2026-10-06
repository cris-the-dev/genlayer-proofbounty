import { formatUnits, parseUnits } from "viem";

export const formatGen = (wei: bigint, digits = 4) => {
  const s = formatUnits(wei, 18);
  const [i, d = ""] = s.split(".");
  const trimmed = d.slice(0, digits).replace(/0+$/, "");
  return trimmed ? `${i}.${trimmed}` : i;
};

export const parseGen = (gen: string) => parseUnits(gen.trim() || "0", 18);

export function timeLeft(deadline: number, now = Date.now() / 1000): string {
  const s = Math.floor(deadline - now);
  if (s <= 0) return "expired";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h left`;
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m left`;
}

export const shortAddr = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
