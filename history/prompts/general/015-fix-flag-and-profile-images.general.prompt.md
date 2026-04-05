---
id: 015
title: Fix flag and profile images
stage: general
date: 2026-04-04
surface: agent
model: GPT-5.3-Codex
feature: none
branch: fixes
user: Mega
command: user-request
labels: ["bugfix","frontend","flags","profile-image"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - frontend/src/components/common/FlagIcon.tsx
 - frontend/src/components/onboarding/StepLanguage.tsx
 - frontend/src/components/settings/TranscriptionSettings.tsx
 - frontend/src/components/settings/AppProfilesSettings.tsx
 - frontend/src/components/auth/AccountSection.tsx
 - frontend/src/components/onboarding/StepSignIn.tsx
tests:
 - npm run vite:build (pass)
---

## Prompt

the langauges flags are not being shown and image of profile is also not bweing shown

## Response snapshot

Implemented a shared FlagIcon component for robust country flag rendering, replaced emoji-only flag usage in onboarding/settings/profile language selectors, added image-error fallback behavior for account/onboarding profile pictures, normalized app icon source handling for both raw base64 and prebuilt data URIs, and verified with a successful production build.

## Outcome

- ✅ Impact: Language flags now render via image-based icons with fallback, profile avatars gracefully fall back on load errors, and app profile icons render reliably across stored formats.
- 🧪 Tests: Frontend production build passes.
- 📁 Files: 6 frontend files updated including one new shared component.
- 🔁 Next prompts: Validate runtime behavior in Windows settings/onboarding UI and check signed-in account card image fallback visually.
- 🧠 Reflection: Shared UI helpers and explicit image-fallback handlers reduce repeated rendering bugs on platform-specific clients.

## Evaluation notes (flywheel)

- Failure modes observed: Emoji country flags can fail on Windows; image sources can fail when payload format varies or remote URLs are unavailable.
- Graders run and results (PASS/FAIL): npm run vite:build PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Add lightweight telemetry/logging for avatar and icon image onError rates to detect real-world source failures.
