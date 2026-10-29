# Verified event deployment

The project-only receiver and three repository secrets are installed. On 2026-10-30, the reviewed initial baseline `2ee75a874c3fdf995f7bf8ae37391a630b34b0af` from successful CI `40822754743` was promoted to immutable image `sha256:8cd6103be8f81ed5509a9a9acebca854efbfe88795d197d30b7d50b799f72bf9`. Independent health, source, environment, mounts, other containers and tunnel preservation checks passed 22/22. No database initialization or migration was performed.

Exact-run GitHub recovery `40906074123` succeeded, then the deployment timer was disabled and confirmed inactive. The next commit's CI → workflow_run → actual new running SHA is the remaining automatic-path verification; a successful CI alone does not prove deployment. The original protected-baseline rejection remains recorded as a failure rather than being hidden or bypassed.

The receiver fetches the canonical successful push run from .github/workflows/ci.yml, validates repository and release branch, and invokes only event-deploy-devcredit <SHA40> <run_id> with dedicated DEVCREDIT_DEPLOY_{SSH_KEY,KNOWN_HOSTS,TARGET} secrets. The job has no checkout and verifies the returned receipt. Only exit 75 with exact lock-timeout stderr retries, bounded to 20 minutes; job timeout is 40 minutes.

Manual recovery runs from refs/heads/main with the exact release branch run ID and SHA.
