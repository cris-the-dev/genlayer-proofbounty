"""Integration tests — run against GenLayer Studio / localnet with real consensus.

    gltest tests/integration/ -v -s

These exercise the full path (real GitHub API fetch + validator consensus).
The claim test targets a PR that was merged long before the bounty was
created, so the outcome is decided by the deterministic gates and is stable
across runs: no LLM randomness, no need to own a GitHub PR.
"""

import pytest
from gltest import get_contract_factory, get_default_account
from gltest.assertions import tx_execution_succeeded, tx_execution_failed

REWARD = 10**15
DAY = 24 * 3600
CRITERIA = "Add a --json flag to the CLI that prints results as JSON, with unit tests."

# A long-merged PR on a public repo (merged before any bounty created today).
REAL_REPO = "genlayerlabs/genlayer-project-boilerplate"
REAL_PR = 1


def _deploy():
    factory = get_contract_factory("ProofBounty")
    return factory.deploy(args=[])


@pytest.mark.integration
def test_bounty_lifecycle_and_real_claim():
    contract = _deploy()
    owner = get_default_account()

    assert contract.get_stats(args=[]).call()["bounties"] == 0

    receipt = contract.create_bounty(
        args=[REAL_REPO, 1, "Integration bounty", CRITERIA, 7 * DAY, DAY]
    ).transact(value=REWARD)
    assert tx_execution_succeeded(receipt)

    bounty = contract.get_bounty(args=[0]).call()
    assert bounty["status"] == "OPEN"
    assert bounty["reward"] == REWARD
    assert bounty["creator"].lower() == owner.address.lower()

    # The creator cannot claim; use a second account.
    from gltest import get_accounts

    claimant = get_accounts()[1]
    as_claimant = contract.connect(claimant)
    receipt = as_claimant.submit_claim(args=[0, REAL_PR]).transact(
        wait_interval=10_000, wait_retries=30
    )
    assert tx_execution_succeeded(receipt)

    claims = contract.get_claims(args=[0]).call()
    assert len(claims) == 1
    assert claims[0]["verdict"] == "REJECTED"
    # Merged long ago (or never merged): rejected by a deterministic gate.
    assert claims[0]["reason_code"] in {"MERGED_OUTSIDE_WINDOW", "NOT_MERGED"}
    assert contract.get_bounty(args=[0]).call()["status"] == "OPEN"


@pytest.mark.integration
def test_invalid_inputs_fail():
    contract = _deploy()
    receipt = contract.create_bounty(
        args=["not a repo", 1, "x", CRITERIA, DAY, DAY]
    ).transact(value=REWARD)
    assert tx_execution_failed(receipt)

    receipt = contract.create_bounty(args=[REAL_REPO, 1, "x", CRITERIA, DAY, DAY]).transact()
    assert tx_execution_failed(receipt)


@pytest.mark.integration
def test_crowdfunding_and_refund_paths():
    contract = _deploy()
    from gltest import get_accounts

    funder = get_accounts()[2]
    assert tx_execution_succeeded(
        contract.create_bounty(args=[REAL_REPO, 2, "Crowdfunded", CRITERIA, 7 * DAY, DAY]).transact(
            value=REWARD
        )
    )
    as_funder = contract.connect(funder)
    assert tx_execution_succeeded(as_funder.fund_bounty(args=[0]).transact(value=2 * REWARD))

    bounty = contract.get_bounty(args=[0]).call()
    assert bounty["reward"] == 3 * REWARD
    assert bounty["funder_count"] == 2
    assert contract.get_contribution(args=[0, funder.address]).call() == 2 * REWARD

    # Refund only after cancellation (which requires the deadline to pass).
    assert tx_execution_failed(as_funder.claim_refund(args=[0]).transact())
