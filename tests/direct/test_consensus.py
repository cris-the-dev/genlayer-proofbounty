"""Validator behaviour: what a validator accepts or rejects from the leader.

`direct_vm.run_validator()` replays the captured validator function of the
last `run_nondet_unsafe` call. Swapping mocks between the contract call and
the replay simulates a validator that observes different external data.
"""

from tests.direct.helpers import deploy_with_bounty, mock_llm, mock_pr, pr_payload


def _accepted_run(direct_vm, direct_deploy, alice, bob):
    contract, _ = deploy_with_bounty(direct_vm, direct_deploy, alice)
    direct_vm.sender = bob
    mock_pr(direct_vm, pr_payload(bob))
    mock_llm(direct_vm, criteria_met=True, confidence=90, summary="Leader wording")
    contract.submit_claim(0, 7)
    return contract


def test_validator_agrees_with_honest_leader(direct_vm, direct_deploy, direct_alice, direct_bob):
    _accepted_run(direct_vm, direct_deploy, direct_alice, direct_bob)
    assert direct_vm.run_validator() is True


def test_validator_tolerates_different_summary(direct_vm, direct_deploy, direct_alice, direct_bob):
    _accepted_run(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.clear_mocks()
    mock_pr(direct_vm, pr_payload(direct_bob))
    mock_llm(direct_vm, criteria_met=True, confidence=75, summary="Totally different words")
    assert direct_vm.run_validator() is True


def test_validator_rejects_flipped_verdict(direct_vm, direct_deploy, direct_alice, direct_bob):
    """A malicious leader claiming ACCEPTED when the validator's LLM says no."""
    _accepted_run(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.clear_mocks()
    mock_pr(direct_vm, pr_payload(direct_bob))
    mock_llm(direct_vm, criteria_met=False, confidence=90)
    assert direct_vm.run_validator() is False


def test_validator_rejects_forged_facts(direct_vm, direct_deploy, direct_alice, direct_bob):
    _accepted_run(direct_vm, direct_deploy, direct_alice, direct_bob)
    forged = {
        "verdict": "ACCEPTED",
        "reason_code": "CRITERIA_MET",
        "summary": "ok",
        "facts": {
            "repo_matches": True,
            "merged": True,
            "merged_in_window": True,
            "links_issue": True,
            "has_claim_tag": True,
            "author": "someone-else",
        },
    }
    assert direct_vm.run_validator(leader_result=forged) is False


def test_validator_rejects_gate_bypass(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Leader says ACCEPTED but the PR is actually unmerged."""
    _accepted_run(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.clear_mocks()
    mock_pr(direct_vm, pr_payload(direct_bob, merged=False))
    assert direct_vm.run_validator() is False


def test_validator_rejects_oversized_summary(direct_vm, direct_deploy, direct_alice, direct_bob):
    _accepted_run(direct_vm, direct_deploy, direct_alice, direct_bob)
    from genlayer.gl.vm import Return  # noqa: F401  (ensures SDK is loaded)

    stored = direct_vm._captured_validators[-1][0]
    bloated = {**stored, "summary": "x" * 5000}
    assert direct_vm.run_validator(leader_result=bloated) is False


def test_validator_agrees_on_identical_expected_error(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    _accepted_run(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.clear_mocks()
    mock_pr(direct_vm, {"message": "Not Found"}, status=404)
    assert direct_vm.run_validator(leader_error=Exception("[EXPECTED] PR_NOT_FOUND")) is True


def test_validator_disagrees_when_leader_lies_about_error(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Leader claims the PR does not exist to censor a valid claim."""
    _accepted_run(direct_vm, direct_deploy, direct_alice, direct_bob)
    assert direct_vm.run_validator(leader_error=Exception("[EXPECTED] PR_NOT_FOUND")) is False


def test_validator_agrees_on_transient_errors(direct_vm, direct_deploy, direct_alice, direct_bob):
    _accepted_run(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.clear_mocks()
    mock_pr(direct_vm, {"message": "boom"}, status=503)
    assert direct_vm.run_validator(leader_error=Exception("[TRANSIENT] GITHUB_UNAVAILABLE_502")) is True


def test_validator_disagrees_on_llm_errors(direct_vm, direct_deploy, direct_alice, direct_bob):
    _accepted_run(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.clear_mocks()
    mock_pr(direct_vm, pr_payload(direct_bob))
    direct_vm.mock_llm(r"impartial code reviewer", "not json")
    assert direct_vm.run_validator(leader_error=Exception("[LLM_ERROR] no JSON object")) is False
