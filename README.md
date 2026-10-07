# ProofBounty v2 — crowdfunded, AI-verified open-source bounties on GenLayer

> **Milestone submission.** See [MILESTONE.md](MILESTONE.md) for exactly what changed since v1 and [CHANGELOG.md](CHANGELOG.md).

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**ProofBounty** lets anyone escrow GEN against a GitHub issue with plain-language
acceptance criteria. When a contributor's pull request is merged, they submit
the PR number and **GenLayer validators decide — by consensus — whether the
merged code satisfies the criteria**. If they accept, the payout enters a short
challenge window during which any funder can post a bond and trigger a
GenLayer appeal panel. No maintainer sign-off, no centralized judge, no oracle
committee.

> Why GenLayer? The core question — *"does this diff do what the bounty asked?"* —
> is subjective and lives on the open web. A normal smart contract cannot read
> GitHub or reason about code. A GenLayer Intelligent Contract can do both, and
> the Equivalence Principle lets multiple independent validators (each with its
> own LLM) agree on the answer.

## Features

- **Escrowed, crowdfundable rewards** (`@gl.public.write.payable`) with deadline, extension and pull-based refunds.
- **Optimistic settlement + bonded appeals**: accepted claims wait in a challenge window; funders can challenge with a bond, validators re-judge as an appeal panel.
- **Events** for indexers and frontends.
- **Two-stage verification**
  1. *Deterministic gates* from the GitHub API: correct repo, merged, merged inside the bounty window, closes the issue, carries the claimant's ownership tag.
  2. *LLM judgment* of the diff vs. the acceptance criteria — only reached if every gate passes.
- **Custom validator** (`gl.vm.run_nondet_unsafe`): verdict, reason code and all facts must match; the free-text summary may differ.
- **Error classification** (`[EXPECTED]`, `[EXTERNAL]`, `[TRANSIENT]`, `[LLM_ERROR]`, as in the official GenLayer write-contract skill) so outages revert cleanly and bad LLM output forces a new leader.
- **Prompt-injection hardening**: fenced untrusted data, delimiter neutralisation, LLM never controls money flow.
- **Ownership proof**: `proofbounty:<your address>` in the PR body binds the PR to a wallet.
- **Reputation**: earned GEN + wins per contributor, leaderboard, protocol stats.
- **Frontend**: Next.js 16 app to post bounties, read criteria, copy your claim tag, submit claims and read every validator verdict.

## Repository layout

```
contracts/proof_bounty.py        Intelligent Contract
tests/direct/                    59 fast tests (mocks for GitHub + LLM, validator replay)
tests/integration/               Studio/testnet tests with real GitHub + consensus
deploy/deployScript.ts           `genlayer deploy` script
frontend/                        Next.js app (genlayer-js, MetaMask)
docs/ARCHITECTURE.md             Diagrams, state model, threat model
```

## Quick start

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

genvm-lint check contracts/proof_bounty.py   # static checks
pytest tests/direct/ -v                      # 59 tests, ~3s
```

### Deploy

```bash
npm install -g genlayer
genlayer network          # choose studionet or testnet-bradbury
genlayer deploy           # runs deploy/deployScript.ts
```

### Integration tests (real consensus)

```bash
gltest tests/integration/ -v -s --network studionet
```

### Frontend

```bash
cd frontend
cp .env.example .env      # paste NEXT_PUBLIC_CONTRACT_ADDRESS
npm install && npm run dev
```

## Live deployment

Testnet Bradbury (chainId 4221): [`0x25a3606d4FeBc53a3B85325b121A0F7B8cFB07ba`](https://explorer-bradbury.genlayer.com/address/0x25a3606d4FeBc53a3B85325b121A0F7B8cFB07ba)  
Live app: https://proofbounty-v2.cristhedev.com

Bradbury rejects deploy transactions with more than ~20 KB of code (`gas limit too high`).
The deployed code was produced from `contracts/` with [`deploy/shrink.py`](deploy/shrink.py), which
removes docstrings and comments and wraps the result in a zlib self-extracting stub. It asserts the result has the same AST as the source,
and the full direct suite passes against it. To reproduce it byte-for-byte:

```bash
python deploy/shrink.py contracts/proof_bounty.py build/proof_bounty.py --pack
```

## Contract API

| Method | Kind | Description |
|---|---|---|
| `create_bounty(repo, issue_number, title, criteria, duration_seconds, challenge_period_seconds)` | write, payable | Escrow `msg.value` against `repo#issue` |
| `fund_bounty(bounty_id)` | write, payable | Add to an open bounty's reward |
| `submit_claim(bounty_id, pr_number)` | write | Validators evaluate the PR; ACCEPTED → `PENDING` |
| `challenge_claim(bounty_id, reason)` | write, payable | Funder posts bond (≥10%); appeal panel re-judges |
| `finalize_payout(bounty_id)` | write | Anyone, after the challenge window |
| `cancel_bounty(bounty_id)` | write | Creator, only after the deadline and while OPEN |
| `claim_refund(bounty_id)` | write | Each funder withdraws their contribution after cancel |
| `extend_deadline(bounty_id, extra_seconds)` | write | Creator extends (max 365 days total) |
| `get_bounty` / `get_bounties` / `get_bounty_count` | view | Bounty data incl. pending payout info |
| `get_claims(bounty_id)` / `get_challenge(bounty_id)` | view | Verdict + appeal history |
| `get_contribution(bounty_id, address)` | view | A funder's escrowed amount |
| `get_claim_tag(address)` | view | String to paste in the PR description |
| `get_contributor` / `get_leaderboard` / `get_stats` | view | Reputation + protocol stats |

### Reason codes

| Code | Decided by |
|---|---|
| `WRONG_REPO`, `NOT_MERGED`, `MERGED_OUTSIDE_WINDOW`, `ISSUE_NOT_LINKED`, `MISSING_CLAIM_TAG` | GitHub API facts (no LLM) |
| `CRITERIA_MET`, `CRITERIA_NOT_MET` | LLM consensus (confidence ≥ 60 required to accept) |

## How a contributor claims

1. Open a PR on the bounty's repo containing `Closes #<issue>`.
2. Add `proofbounty:0xYOUR_ADDRESS` (shown in the UI) to the PR description.
3. Get it merged, then click **Submit claim** with the PR number.
4. If accepted, wait for the challenge window (or an appeal) — then anyone can release the payout.

## Testing strategy

| Suite | What it proves |
|---|---|
| `test_create_bounty.py` | Input validation, escrow accounting, pagination, cancel/extend permissions |
| `test_claims.py` | Every deterministic gate, issue-link formats, PR theft prevention, one-shot evaluation, error paths, prompt fencing, diff truncation |
| `test_consensus.py` | Validator replay: accepts honest leader & different wording; rejects flipped verdicts, forged facts, gate bypass, oversized output, fake "not found" censorship; error-agreement policy |
| `test_v2_funding.py` | Crowdfunding, funder self-dealing block, pull refunds, no cancel during challenge window |
| `test_v2_challenge.py` | Finalize timing, upheld/overturned economics, bond scaling, single challenge, appeal prompt fencing, appeal validator replay |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full threat model.

## License

MIT
