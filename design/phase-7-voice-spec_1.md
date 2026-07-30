# Phase 7 — Voice playback (append to the Claude Code prompt)

## What I do by hand before this phase starts

I generate the audio myself on the ElevenLabs website and place the files in the repo. You are not calling the ElevenLabs API, and there is no API key in this project.

My steps, for your context:

1. Pick one voice from the ElevenLabs library and use it for every file, so the app sounds like one narrator.
2. For each of the eleven roadmap steps, paste the plain-language step text, generate, download the MP3.
3. Save each file to `assets/audio/steps/` named by step ID: `step-01.mp3` through `step-11.mp3`.
4. Tell you when the files are in place and give you the exact step-ID-to-filename mapping.

Do not begin implementation until the files exist. Do not generate placeholder or silent audio to work around missing files — if a file is absent, the control should render in its unavailable state.

## What you build

### 1. An audio manifest

Create a single source of truth mapping step IDs to audio assets, alongside the existing roadmap step content. Include duration in seconds and the language code. Structure it so a second language can be added later without changing the playback code.

Do not scatter file paths through components.

### 2. One shared playback component

Build a single `StepAudioPlayer` component and use it everywhere. Do not create per-screen variants.

Requirements:

- **Same position on every screen.** Directly beneath the step title on the Path screen, and in the equivalent slot on Home. A user who cannot read reliably learns "the control in that spot talks to me" — that consistency is the entire onboarding for this feature.
- **Play, pause, and a 15-second rewind.** No scrubber. No speed control inside the component — speed comes from the existing setting.
- **Icon plus text label**, per our accessibility rule. The label reads "Listen to this step", not just a speaker glyph.
- **Visible progress**, either elapsed time or a simple bar.
- **Unavailable state**: if no audio file exists for the current step or language, the control renders disabled with a plain explanation, not an error.

### 3. Playback behaviour — non-negotiable

- **Never auto-play.** Playback only ever starts from a user tap. A phone that begins speaking about immigration status in a public place can put someone in a genuinely unsafe position.
- **Written text stays visible while audio plays.** Voice is an additional path to the information, never the only one. Do not hide, collapse, or replace the step text during playback.
- **Audio stops on navigation away** from the screen that started it. No background playback, no audio continuing under a different screen.
- **Respect the device silent switch** and existing audio session behaviour. Do not force playback through the silent switch.
- **Pause on interruption** (incoming call, another app taking audio focus) and do not auto-resume.
- **One player at a time.** Starting playback anywhere stops any other playback.

### 4. Offline

Files ship bundled in `assets/`, so this should work offline by default. Confirm that is true in your implementation and tell me if any part of the path requires a network call.

### 5. Settings integration

- The existing "Read steps aloud" toggle controls whether the control appears at all.
- The existing speed setting (Slow / Normal / Fast) applies to playback rate. Map these to concrete rates and tell me what you chose.
- Do not add new settings rows for this feature.

### 6. Language

English only in this phase.

Do not add Haitian Creole or Spanish audio, and do not add language options to the voice control, even disabled ones. The manifest should accommodate them structurally, but nothing Creole or Spanish ships until I have had native speakers review generated samples.

## Explicitly out of scope

Do not build any of the following in this phase, and do not add dependencies for them:

- Calling the ElevenLabs API from the app or from an Edge Function
- Any generation script
- Reading interface chrome, button labels, or navigation aloud
- Reading quiz questions aloud (separate phase)
- Voice input, speech-to-text, or the assistant
- Background or lock-screen audio controls
- Downloading audio at runtime

## Before you write code

Tell me:

1. Which audio library our Expo SDK version expects. `expo-av` has been superseded by `expo-audio` in recent SDKs — confirm which applies to us rather than assuming, and flag if this means adding a dependency.
2. Where you propose putting the manifest and the component, given our existing structure.
3. Any existing audio or sound handling already in the codebase that this should reuse rather than duplicate.

Then wait for my go-ahead.

## Acceptance criteria

- Tapping the control on the Path screen plays the correct step's audio on a physical device.
- The control appears in the same position on Home and Path.
- Navigating away stops playback.
- Turning off "Read steps aloud" removes the control everywhere.
- Airplane mode does not break playback.
- A step with no audio file shows the disabled state, not a crash or an error toast.
- No new user-facing strings are hard-coded; all go through localization.

## Report when done

Files changed, component reused or created, dependency added and why, build result, manual test steps I should run on my device, and rollback instructions.
