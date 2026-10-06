# ProofBounty frontend

Next.js 16 + React 19 + TanStack Query + genlayer-js. Adapted from the
[GenLayer project boilerplate](https://github.com/genlayerlabs/genlayer-project-boilerplate).

```bash
cp .env.example .env      # set NEXT_PUBLIC_CONTRACT_ADDRESS
npm install
npm run dev               # http://localhost:3000
```

| Path | Purpose |
|------|---------|
| `lib/contracts/ProofBounty.ts` | Typed wrapper: views, writes, fee estimation, Map → object decoding |
| `lib/hooks/useProofBounty.ts` | React Query hooks (bounties, claims, stats, leaderboard, mutations) |
| `lib/genlayer/network.ts` | Chain selection via `NEXT_PUBLIC_GENLAYER_NETWORK` |
| `components/BountyList.tsx` | Filterable bounty feed |
| `components/BountyDetail.tsx` | Criteria, claim instructions + ownership tag, validator verdict history |
| `components/CreateBountyModal.tsx` | Escrow a reward against a GitHub issue |
| `components/Leaderboard.tsx` | Protocol stats + top contributors |
