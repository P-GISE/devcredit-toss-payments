# Verified event deployment preparation

Local preparation only. Keys/secrets, server receiver installation, live event deployment and timer disablement remain incomplete. Keep the existing timer enabled until exact SHA/run/image/health and failure/recovery evidence is reviewed. No database initialization or migration is part of this workflow.

The receiver fetches the canonical successful push run from .github/workflows/ci.yml, validates repository and release branch, and invokes only event-deploy-devcredit <SHA40> <run_id> with dedicated DEVCREDIT_DEPLOY_{SSH_KEY,KNOWN_HOSTS,TARGET} secrets. The job has no checkout and verifies the returned receipt. Only exit 75 with exact lock-timeout stderr retries, bounded to 20 minutes; job timeout is 40 minutes.

Manual recovery runs from refs/heads/main with the exact release branch run ID and SHA.