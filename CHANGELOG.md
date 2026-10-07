# Changelog

## v2.0.0

### Added
- `fund_bounty(bounty_id)` (payable): crowdfund open bounties; per-funder contributions and `funder_count`.
- Optimistic settlement: accepted claims move to `PENDING` with `payout_at = now + challenge_period`.
- `challenge_claim(bounty_id, reason)` (payable): bonded appeal re-judged by validators; outcomes `UPHELD` / `OVERTURNED`.
- `finalize_payout(bounty_id)`: permissionless release after the challenge window.
- `claim_refund(bounty_id)`: pull-based refunds after cancellation.
- Views: `get_challenge`, `get_contribution`; `get_contributor` now returns `rejections` and `overturned`; `get_stats` returns `pending`, `challenges`, `total_refunded`.
- Events: `BountyCreated`, `BountyFunded`, `ClaimEvaluated`, `ClaimChallenged`, `BountyPaid`, `BountyCancelled`.
- Frontend: funding form, challenge window countdown, challenge form, appeal card, release payout and withdraw buttons, new stats.
- 16 new direct tests and an integration test for crowdfunding.

### Changed
- `create_bounty` takes a sixth argument `challenge_period_seconds` (1 hour – 7 days).
- `cancel_bounty` no longer transfers funds; funders withdraw with `claim_refund`.
- Funders (not only the creator) are barred from claiming.
- Claim listing uses a per-bounty index instead of scanning all claims.
- Leader/validator logic extracted into `_evaluate` / `_validate` and shared by first-instance and appeal judgments.
- All user errors carry a classification prefix.

## v1.0.0
- Initial release: escrowed GitHub bounties judged by deterministic GitHub gates + LLM consensus.
