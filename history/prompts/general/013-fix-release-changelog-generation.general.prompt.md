---
id: 13
title: "Fix Release Changelog Generation Issue"
stage: general
date: 2026-03-25
surface: agent
model: gemini-3.1-pro
feature: none
branch: chore/fix-changelog
user: devv-shayan
command: none
labels: ["github-actions", "release", "bugfix"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files_modified:
  - .github/workflows/release.yml
tests_run:
  - gh release view --json tagName --jq .tagName
---

## Prompt
User noticed that `v0.3.1` release generated a massive changelog containing almost every commit in the history. "it merged but in release why it add all these commmits or this is normal?"

## Rationale
Investigating the `release.yml` file showed the previous tag was being fetched with `git describe --tags --abbrev=0`. 
When running tests, `git merge-base --is-ancestor v0.3.0 HEAD` returned false, meaning the `v0.3.0` tag was not in the direct commit ancestry of the current `main` branch (likely due to a squash, revert, or release branching strategy). 
Because `v0.3.0` wasn't visible in the ancestry, `git describe` kept walking backward until it found `v0.2.0`, resulting in a massive diff range: `v0.2.0..HEAD`.

## Action
Updated the `release.yml` changelog generator to use the GitHub CLI (`gh release view --json tagName --jq .tagName`) instead of local git history parsing. This guarantees it will fetch the absolute latest published release on the UI, circumventing Git tree reachability issues going forward.
