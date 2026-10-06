"""Bounty creation, validation and sponsor-side lifecycle."""

from tests.direct.helpers import (
    CRITERIA,
    DAY,
    ISSUE,
    REPO,
    REWARD,
    deploy_with_bounty,
    to_hex,
)


def test_create_bounty_escrows_reward(direct_vm, direct_deploy, direct_alice):
    contract, bounty_id = deploy_with_bounty(direct_vm, direct_deploy, direct_alice)

    assert bounty_id == 0
    b = contract.get_bounty(0)
    assert b["creator"] == to_hex(direct_alice)
    assert b["repo"] == REPO
    assert b["issue_number"] == ISSUE
    assert b["reward"] == REWARD
    assert b["status"] == "OPEN"
    assert b["deadline"] - b["created_at"] == 7 * DAY
    assert b["winner"] == ""

    stats = contract.get_stats()
    assert stats == {
        "bounties": 1,
        "open": 1,
        "claims": 0,
        "total_escrowed": REWARD,
        "total_paid": 0,
    }


def test_create_requires_value(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/proof_bounty.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Reward must be greater than zero"):
        contract.create_bounty(REPO, ISSUE, "t", CRITERIA, DAY)


def test_create_rejects_bad_inputs(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/proof_bounty.py")
    direct_vm.sender = direct_alice
    direct_vm.value = REWARD

    with direct_vm.expect_revert("Invalid repo"):
        contract.create_bounty("not-a-repo", ISSUE, "t", CRITERIA, DAY)
    with direct_vm.expect_revert("Invalid repo"):
        contract.create_bounty("acme/widget/../evil", ISSUE, "t", CRITERIA, DAY)
    with direct_vm.expect_revert("Invalid issue number"):
        contract.create_bounty(REPO, 0, "t", CRITERIA, DAY)
    with direct_vm.expect_revert("Title must be"):
        contract.create_bounty(REPO, ISSUE, "", CRITERIA, DAY)
    with direct_vm.expect_revert("Criteria must be"):
        contract.create_bounty(REPO, ISSUE, "t", "too short", DAY)
    with direct_vm.expect_revert("Duration must be"):
        contract.create_bounty(REPO, ISSUE, "t", CRITERIA, 60)
    with direct_vm.expect_revert("Duration must be"):
        contract.create_bounty(REPO, ISSUE, "t", CRITERIA, 400 * DAY)


def test_pagination(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/proof_bounty.py")
    direct_vm.sender = direct_alice
    direct_vm.value = REWARD
    for i in range(5):
        contract.create_bounty(REPO, i + 1, f"Bounty {i}", CRITERIA, DAY)

    assert contract.get_bounty_count() == 5
    page = contract.get_bounties(1, 2)
    assert [b["id"] for b in page] == [1, 2]
    assert contract.get_bounties(4, 10)[0]["issue_number"] == 5
    assert contract.get_bounties(10, 10) == []


def test_cancel_only_after_deadline_and_only_creator(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract, _ = deploy_with_bounty(direct_vm, direct_deploy, direct_alice, duration=DAY)

    with direct_vm.expect_revert("only be cancelled after its deadline"):
        contract.cancel_bounty(0)

    direct_vm.warp("2030-01-03T00:00:00Z")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the creator"):
        contract.cancel_bounty(0)

    direct_vm.sender = direct_alice
    contract.cancel_bounty(0)
    assert contract.get_bounty(0)["status"] == "CANCELLED"
    assert contract.get_stats()["total_escrowed"] == 0

    with direct_vm.expect_revert("Bounty is not open"):
        contract.cancel_bounty(0)


def test_extend_deadline(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, _ = deploy_with_bounty(direct_vm, direct_deploy, direct_alice, duration=DAY)
    before = contract.get_bounty(0)["deadline"]

    contract.extend_deadline(0, DAY)
    assert contract.get_bounty(0)["deadline"] == before + DAY

    with direct_vm.expect_revert("Extension must be positive"):
        contract.extend_deadline(0, 0)
    with direct_vm.expect_revert("cannot exceed 365 days"):
        contract.extend_deadline(0, 400 * DAY)

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the creator"):
        contract.extend_deadline(0, DAY)


def test_unknown_bounty(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/proof_bounty.py")
    with direct_vm.expect_revert("Bounty not found"):
        contract.get_bounty(3)


def test_claim_tag_view(direct_vm, direct_deploy, direct_bob):
    contract = direct_deploy("contracts/proof_bounty.py")
    tag = contract.get_claim_tag(to_hex(direct_bob))
    assert tag == "proofbounty:" + to_hex(direct_bob).lower()
