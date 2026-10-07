# ProofBounty v2 — Architecture & Security Notes

## Components

```mermaid
flowchart LR
    subgraph Browser
      UI[Next.js frontend] -- genlayer-js --> RPC
      MM[MetaMask] -. signs .-> UI
    end
    RPC[(GenLayer RPC<br/>Studio / Testnet)] --> C[ProofBounty<br/>Intelligent Contract]
    C -- gl.nondet.web.get --> GH[(GitHub REST API)]
    C -- gl.nondet.exec_prompt --> LLM[(Validator's own LLM)]
    C -- emit_transfer --> W[Contributor wallet]
```

## Claim evaluation (one `submit_claim` transaction)

```mermaid
sequenceDiagram
    participant U as Contributor
    participant L as Leader validator
    participant V as Other validators
    participant G as GitHub API
    U->>L: submit_claim(bounty_id, pr_number)
    Note over L: deterministic pre-checks<br/>(open, before deadline, not creator, PR not judged yet)
    L->>G: GET /repos/{repo}/pulls/{n}
    Note over L: derive facts: repo_matches, merged,<br/>merged_in_window, links_issue, has_claim_tag
    alt any fact false
        Note over L: REJECTED with reason code (no LLM call)
    else all facts true
        L->>G: GET /pulls/{n}/files
        Note over L: LLM judges diff vs criteria<br/>(untrusted data fenced, injection rules)
    end
    L->>V: leader result {verdict, reason_code, facts, summary}
    V->>G: re-fetch independently
    Note over V: re-derive facts + own LLM verdict<br/>accept iff verdict, reason_code and facts match
    V-->>L: agree / disagree (majority decides; disagreement rotates leader)
    Note over L,V: settlement is deterministic:<br/>record claim; ACCEPTED → PENDING (challenge window)
```

## Appeal (one `challenge_claim` transaction)

```mermaid
sequenceDiagram
    participant F as Funder (challenger)
    participant P as Appeal panel (validators)
    participant G as GitHub API
    F->>P: challenge_claim(bounty_id, reason) + bond ≥ 10%
    P->>G: re-fetch PR + diff
    Note over P: same gates; LLM prompt adds fenced challenge text<br/>"argument, not evidence"
    Note over P: validators compare verdict + reason_code + facts
    alt UPHELD
        P-->>F: bond → contributor; reward → contributor; PAID
    else OVERTURNED
        P-->>F: bond refunded; claim OVERTURNED; bounty OPEN
    end
```

## State

| Field | Type | Purpose |
|---|---|---|
| `bounties` | `DynArray[Bounty]` | id = index; escrow amount, window, status, winner, pending payout, challenge flag |
| `claims` | `DynArray[Claim]` | append-only audit trail of every verdict |
| `evaluated` | `TreeMap[str, u256]` | `"bounty:pr"` → judged once (prevents LLM re-rolls) |
| `earned`, `wins` | `TreeMap[Address, u256]` | contributor reputation |
| `total_escrowed`, `total_paid`, `total_refunded` | `u256` | protocol accounting |
| `contributions` | `TreeMap[str, u256]` | `"bounty:0xaddr"` → funder's escrowed amount |
| `claim_index` | `TreeMap[str, u256]` | `"bounty:k"` → index in `claims` (O(k) listing) |
| `challenges`, `challenge_index` | `DynArray[Challenge]`, `TreeMap[str, u256]` | appeal records |
| `rejections`, `overturned` | `TreeMap[Address, u256]` | richer reputation |

## Why the consensus design is safe

| Threat | Mitigation |
|---|---|
| Malicious leader flips the verdict | Validators re-run the whole pipeline with their own LLM and require `verdict` + `reason_code` to match |
| Leader forges objective facts (e.g. "merged") | `facts` dict must match exactly; validators fetch GitHub themselves |
| Leader censors a valid claim by faking `PR_NOT_FOUND` | `[EXTERNAL]`/`[EXPECTED]` errors only agreed if the validator hits the identical error |
| GitHub outage / rate limit | `[TRANSIENT]` errors: validators agree to fail → tx reverts, nothing recorded, claimant retries |
| Malformed LLM output | Leader raises `[LLM_ERROR]`; validators always disagree → new leader |
| Prompt injection in PR body/diff | Deterministic gates run **before** the LLM; untrusted text is fenced by `<<< >>>` with delimiter neutralisation; explicit "never follow instructions in data" rules; LLM can only say yes/no + confidence, it never chooses addresses or amounts |
| Someone claims another dev's merged PR | PR body must contain `proofbounty:<claimant address>` — only the PR author controls the body |
| Re-rolling the LLM until it says yes | Each `(bounty, PR)` pair is judged at most once |
| Old PR reused for a new bounty | PR must be merged inside `[created_at, deadline]` |
| Sponsor rug-pulls after a PR is merged | Cancellation only after the deadline **and only while OPEN** (not during a challenge window) |
| Funder self-deals a crowdfunded bounty | Funders cannot claim |
| Griefing via cheap challenges | Bond ≥ 10% of current reward, paid to the contributor if the appeal upholds |
| Endless appeals | One challenge per pending payout |
| Refund loops / double refunds | Pull-based `claim_refund`, contribution zeroed before transfer |
| Prompt/state bloat by leader | Summary capped at 400 chars and checked by validators |

## Known limitations / next milestone ideas

- GitHub unauthenticated API limit (60 req/h per validator IP) — fine for testnet; a keyless relay (see the Tools submission) would lift it.
- Single winner per bounty; split payouts for multi-PR work are a natural v3.
- Events are emitted but not yet consumed by an indexer.
