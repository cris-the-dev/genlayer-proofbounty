"""Shared helpers for ProofBounty direct-mode tests."""

import json

REPO = "acme/widget"
ISSUE = 42
CRITERIA = "Add a --json flag to the CLI that prints results as JSON, with unit tests."
DAY = 24 * 3600
REWARD = 10**18  # 1 GEN
CHALLENGE = 2 * 24 * 3600  # 48h challenge window

PR_URL_RE = r"api\.github\.com/repos/acme/widget/pulls/{n}$"
FILES_URL_RE = r"api\.github\.com/repos/acme/widget/pulls/{n}/files"


def to_hex(addr) -> str:
    if hasattr(addr, "as_hex"):
        return addr.as_hex
    from genlayer.py.types import Address

    return Address(addr).as_hex


def claim_tag(addr) -> str:
    return "proofbounty:" + to_hex(addr).lower()


def pr_payload(
    claimant,
    *,
    merged=True,
    merged_at="2030-01-02T00:00:00Z",
    base_repo=REPO,
    body=None,
    title="Add --json output flag",
    login="dev-alice",
):
    if body is None:
        body = f"Closes #{ISSUE}\n\n{claim_tag(claimant)}"
    return {
        "number": 7,
        "title": title,
        "body": body,
        "merged": merged,
        "merged_at": merged_at if merged else None,
        "user": {"login": login},
        "base": {"repo": {"full_name": base_repo}},
    }


FILES_PAYLOAD = [
    {
        "filename": "cli/main.py",
        "status": "modified",
        "additions": 12,
        "deletions": 1,
        "patch": "@@ -1,3 +1,14 @@\n+parser.add_argument('--json', action='store_true')",
    },
    {
        "filename": "tests/test_cli.py",
        "status": "added",
        "additions": 20,
        "deletions": 0,
        "patch": "+def test_json_flag(): ...",
    },
]


def mock_pr(vm, pr: dict, n: int = 7, files=None, status: int = 200):
    vm.mock_web(PR_URL_RE.format(n=n), {"status": status, "body": json.dumps(pr)})
    vm.mock_web(
        FILES_URL_RE.format(n=n),
        {"status": 200, "body": json.dumps(files if files is not None else FILES_PAYLOAD)},
    )


def mock_llm(vm, criteria_met=True, confidence=90, summary="Adds --json flag with tests."):
    vm.mock_llm(
        r"impartial code reviewer",
        json.dumps({"criteria_met": criteria_met, "confidence": confidence, "summary": summary}),
    )


def deploy_with_bounty(direct_vm, direct_deploy, creator, duration=7 * DAY):
    direct_vm.warp("2030-01-01T00:00:00Z")
    contract = direct_deploy("contracts/proof_bounty.py")
    direct_vm.sender = creator
    direct_vm.value = REWARD
    bounty_id = contract.create_bounty(REPO, ISSUE, "JSON output for CLI", CRITERIA, duration, CHALLENGE)
    direct_vm.value = 0
    return contract, bounty_id
