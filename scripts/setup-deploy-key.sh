#!/usr/bin/env bash
# Helper script to configure SSH deploy key or Personal Access Token (PAT) authentication for CI workflows
# to allow bypassing the 'require pull request' rule for automated chore commits.

set -e

echo "=== ClawDock CI Deployment Key / PAT Setup Helper ==="
echo "To bypass the GitHub repository branch protection rule ('require a pull request before merging') for automated version bumps:"
echo "1. Generate a Personal Access Token (PAT) or SSH Deploy Key with repo write permissions."
echo "2. Add the secret to your GitHub repository secrets as 'GH_PAT' or 'DEPLOYMENT_KEY'."
echo "3. Update your workflow to use the token for git operations."

if [ -n "$1" ]; then
  TOKEN="$1"
  echo "Configuring git remote URL with provided token..."
  git remote set-url origin https://x-access-token:${TOKEN}@github.com/${GITHUB_REPOSITORY:-silverraindog/ClawDock-Agent-Orchestrator}.git
  echo "Git remote configured successfully with token authentication."
else
  echo "No token provided as argument. Usage: ./scripts/setup-deploy-key.sh YOUR_GITHUB_PAT"
fi
