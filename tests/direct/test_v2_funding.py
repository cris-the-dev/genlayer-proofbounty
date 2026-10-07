"""v2: crowdfunding and pull-based refunds."""

from tests.direct.helpers import (
    DAY,
    REWARD,
    deploy_with_bounty,
    mock_llm,
    mock_pr,
    pr_payload,
    to_hex,
)


def test_anyone_can_fund_open_bounty(direct_vm, direct_deploy, direct_alice, direct_charlie):
    contract, _ = deploy_with_bounty(direct_vm, direct_deploy, direct_alice)

    direct_vm.sender = direct_charlie
    direct_vm.value = 3 * REWARD
    contract.fund_bounty(0)
    direct_vm.value = REWARD
    contract.fund_bounty(0)  # second top-up by same funder
    direct_vm.value = 0

    b = contract.get_bounty(0)
    assert b["reward"] == 5 * REWARD
    assert b["funder_count"] == 2
    assert contract.get_contribution(0, to_hex(direct_charlie)) == 4 * REWARD
    assert contract.get_stats()["total_escrowed"] == 5 * REWARD


def test_fund_requires_value_and_open_bounty(direct_vm, direct_deploy, direct_alice, direct_charlie):
    contract, _ = deploy_with_bounty(direct_vm, direct_deploy, direct_alice, duration=DAY)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Funding must be greater than zero"):
        contract.fund_bounty(0)

    direct_vm.warp("2030-01-03T00:00:00Z")
    direct_vm.value = REWARD
    with direct_vm.expect_revert("deadline has passed"):
        contract.fund_bounty(0)


def test_funder_cannot_claim(direct_vm, direct_deploy, direct_alice, direct_charlie):
    """Prevents a funder from self-dealing their own (and others') money."""
    contract, _ = deploy_with_bounty(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_charlie
    direct_vm.value = REWARD
    contract.fund_bounty(0)
    direct_vm.value = 0
    with direct_vm.expect_revert("Funders cannot claim"):
        contract.submit_claim(0, 7)


def test_pull_refunds_after_cancel(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract, _ = deploy_with_bounty(direct_vm, direct_deploy, direct_alice, duration=DAY)
    direct_vm.sender = direct_charlie
    direct_vm.value = 2 * REWARD
    contract.fund_bounty(0)
    direct_vm.value = 0

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Bounty is not cancelled"):
        contract.claim_refund(0)

    direct_vm.warp("2030-01-03T00:00:00Z")
    contract.cancel_bounty(0)

    assert contract.claim_refund(0) == REWARD
    with direct_vm.expect_revert("Nothing to refund"):
        contract.claim_refund(0)  # no double refund

    direct_vm.sender = direct_charlie
    assert contract.claim_refund(0) == 2 * REWARD

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Nothing to refund"):
        contract.claim_refund(0)

    stats = contract.get_stats()
    assert stats["total_escrowed"] == 0
    assert stats["total_refunded"] == 3 * REWARD


def test_cannot_cancel_pending_bounty(direct_vm, direct_deploy, direct_alice, direct_bob):
    """A sponsor cannot cancel to dodge a payout that is in its challenge window."""
    contract, _ = deploy_with_bounty(direct_vm, direct_deploy, direct_alice, duration=DAY)
    direct_vm.sender = direct_bob
    mock_pr(direct_vm, pr_payload(direct_bob, merged_at="2030-01-01T12:00:00Z"))
    mock_llm(direct_vm)
    contract.submit_claim(0, 7)

    direct_vm.warp("2030-01-03T00:00:00Z")  # past the bounty deadline
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Bounty is not open"):
        contract.cancel_bounty(0)
