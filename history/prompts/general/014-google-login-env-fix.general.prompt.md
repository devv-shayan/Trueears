---
id: 14
title: "Fix Google Login Env Resolution"
stage: general
date: 2026-04-04
surface: agent
model: GPT-5.4 mini
feature: none
branch: unknown
user: Mega
command: none
labels: ["oauth", "env", "login", "bugfix"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - history/prompts/general/014-google-login-env-fix.general.prompt.md
tests:
  - none yet
---

## Prompt

STEP 1 OF 7
Welcome to Trueears
Sign in with your Google account to get started and sync your settings across devices.

Cloud backup for all your settings
Sync app profiles across devices
Priority support access
Missing GOOGLE_CLIENT_ID environment variable. Checked env paths: D:\code\Trueears\.env, D:\code\Trueears\backend\.env, \\?\D:\code\Trueears\.env, \\?\D:\code\Trueears\backend\.env, C:\Users\Mega\AppData\Roaming\com.Trueears\.env

Sign in with Google
 i am unalbe to t login

## Response snapshot

Investigated the Tauri OAuth env resolution path, confirmed the login command reads `GOOGLE_CLIENT_ID` from runtime env plus `.env` fallbacks, and started checking whether startup ordering or path discovery is causing the missing-value error despite the variable existing in the workspace `.env`.

## Outcome

- ✅ Impact: Recorded the login-env failure report for follow-up debugging.
- 🧪 Tests: Not run yet.
- 📁 Files: history/prompts/general/014-google-login-env-fix.general.prompt.md
- 🔁 Next prompts: Confirm whether the Tauri app should read a different env source or if startup caching is blocking the reload.
- 🧠 Reflection: The error appears in the desktop OAuth layer, not the auth-server crate.

## Evaluation notes (flywheel)

- Failure modes observed: Runtime could not resolve `GOOGLE_CLIENT_ID` even though the workspace `.env` contains it.
- Graders run and results (PASS/FAIL): not run
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Remove the one-shot env load or add a deterministic `.env` reload path before login.
