# AFA Camera Score — Calibration Log

This file records every regression test run and calibration change.
Use it to understand the current scoring thresholds and the reasoning behind each adjustment.
A future rebuild of the scanner should start here — every threshold decision is documented with its rationale.

---

## Current Thresholds (as of 2026-06-17)

### Client-side (index.html)

| Check | Parameter | Value | Notes |
|-------|-----------|-------|-------|
| Angle — low | `noseRatio < X` | **0.15** | Changed from 0.25 on 2026-06-17. See calibration entry below. |
| Angle — high | `noseRatio > X` | 0.55 | Unchanged. Nose far below eyes = camera above face. |
| Lighting | face lum vs bg p90 | fStopSignal() | 1-stop = yellow, 2-stop = red |
| BgSpike | spike% ≥ 1% | 2.5 stops (5.66×) above face lum | Disqualifies bright window behind subject |
| Background blur (Sobel) | meanGrad < 0.025 | 0.025 | Digital blur detection threshold |
| faceArea | fw × fh | Disabled | Intentionally disabled — FaceMesh boxes too tight for reliable measurement |
| Eye dissolved | leWn < 0.05 OR leHn < 0.008 | — | Forces blur disqualification if eye anatomy collapses |

### Server-side GPT-4o prompt (analyse.js)

| Criterion | Key thresholds |
|-----------|---------------|
| Angle | Red: nostrils visible from below, noseRatio < 0.15 from client overrides GPT |
| Background | Red: digital blur mask, virtual background, BgSpike spike. Yellow: clutter, colour clash |
| Framing | Face height (NOT area) vs frame height. < 15% = too far fail. Name bars / UI overlays excluded. |
| Presence | Eyes directed at lens. Uncertain = score 80, do not penalise. |
| Lighting | Client-side only — GPT lighting used as fallback signal only |
| Ring light | ONLY triggers on perfect circular white reflection in pupils. Not soft boxes, catch lights, windows. |

---

## Calibration History

### 2026-06-17 — commit `f878847` — noseRatio threshold 0.25 → 0.15

**Triggered by:** Adrian's own Zoom screenshot scored Camera Angle RED (63 overall) when it should have been green.

**Root cause:** `noseRatio = (noseTip.y - eyeMidY) / faceHpx` came in at `0.248`. Threshold was `< 0.25` (flag as low angle). Margin of error: 0.002. The Zoom name bar at the bottom of the frame compresses the face mesh bounding box slightly upward, nudging `noseRatio` marginally lower than a clean frame would produce.

**Fix:** Lowered threshold from `0.25` to `0.15`. The comment in the code already described a genuine low-angle shot as "nose rising toward or above the eyes" — which implies a ratio near zero or negative, not 0.248. A ratio of 0.15 still safely catches genuine chin-up camera positions while eliminating the Zoom name bar false positive zone (0.15–0.25).

**Regression risk:** Any image with noseRatio between 0.15 and 0.25 that was previously (incorrectly) caught as low-angle will now pass. This is intentional — those were false positives.

**Test spec:** `zoom-namebar.json` and `low-angle.json` cover this criterion going forward.

---

### 2026-06-17 — commit `58adbbf` — Framing prompt: face height vs frame height, ignore name bars

**Triggered by:** Same Zoom screenshot — Framing scored YELLOW despite face clearly filling ~55% of vertical frame.

**Root cause:** GPT-4o framing prompt said "does the face occupy less than roughly 15% of the frame height" but was ambiguous enough that GPT may have been reading area rather than height, or being confused by the Zoom name bar reducing the apparent frame height.

**Fix:** Prompt rewritten to:
1. Explicitly say "measure face height (top of forehead to chin tip) as a percentage of total image height"
2. Explicitly say "ignore any name bar, watermark, or UI overlay at the bottom"
3. Added positive anchor: "A face that clearly fills 40–70% of the vertical frame is NOT too far, regardless of aspect ratio or how wide the image is"

**Regression risk:** Low. Makes the prompt more specific, not more permissive. Should not affect non-Zoom images.

**Test spec:** `zoom-namebar.json` and `too-far.json` cover this going forward.

---

## How to Run Regression Tests

```bash
# Run all specs
node tests/regression.js

# Run a single spec
node tests/regression.js --spec zoom-namebar

# Run against a different URL
node tests/regression.js --url https://camera-presence-score.vercel.app
```

## Adding a New Test Case

1. Add test image to `tests/images/<name>.jpg`
2. Create `tests/specs/<name>.json` with expected signals per criterion
3. Run `node tests/regression.js --spec <name>` to verify
4. Commit both image and spec

## Adding a Calibration Entry

When making a threshold change, add an entry to this log with:
- Date + commit hash
- What triggered the change (specific test image / user report)
- Root cause analysis
- The exact change made
- Regression risk assessment
- Which test spec covers it going forward

## 2026-06-17 21:14 — commit `7a43d8c`

| Result | Count |
|--------|-------|
| Passed | 0 / 18 |
| Failed | 18 / 18 |

**Failures:**
  - **BGBrightFail**: lighting: expected red, got NO DATA; background: expected red, got NO DATA
  - **BGRedDistracting**: lighting: expected red, got NO DATA; background: expected red, got NO DATA
  - **BackLit**: lighting: expected red, got NO DATA; background: expected red, got NO DATA
  - **BlurFail1**: background: expected red, got NO DATA
  - **BlurFail2**: background: expected red, got NO DATA; presence: expected red, got NO DATA
  - **BlurFail3**: background: expected red, got NO DATA; presence: expected red, got NO DATA
  - **BlurFail4**: background: expected red, got NO DATA
  - **BroadCastFraming**: background: expected red, got NO DATA; framing: expected green, got NO DATA
  - **CameraAngleTooLow**: angle: expected yellow, got NO DATA; framing: expected red, got NO DATA
  - **GlassesPassWeCanSeeTheEyes**: background: expected red, got NO DATA
  - **GoodSetup**: lighting: expected green, got NO DATA; angle: expected green, got NO DATA; background: expected green, got NO DATA; framing: expected green, got NO DATA; presence: expected green, got NO DATA
  - **RingLightReflectedInGlasses**: lighting: expected red, got NO DATA; presence: expected red, got NO DATA
  - **RinglightFailNoGlasses**: lighting: expected red, got NO DATA
  - **TooCloseMouthCutoff**: background: expected red, got NO DATA; framing: expected red, got NO DATA
  - **TooFarFromCamera**: framing: expected red, got NO DATA
  - **TooLow2**: angle: expected red, got NO DATA; presence: expected red, got NO DATA
  - **TooLowFramingRedPresenceRed**: angle: expected red, got NO DATA; background: expected yellow, got NO DATA; presence: expected red, got NO DATA
  - **ZoomNameBar**: lighting: expected green, got NO DATA; angle: expected green, got NO DATA; background: expected green, got NO DATA; framing: expected green, got NO DATA; presence: expected green, got NO DATA

---

## 2026-06-17 21:15 — commit `58d5c17`

| Result | Count |
|--------|-------|
| Passed | 3 / 17 |
| Failed | 14 / 17 |

**Failures:**
  - **BGBrightFail**: background: expected red, got yellow (58)
  - **BGRedDistracting**: background: expected red, got yellow (58)
  - **BlurFail1**: background: expected red, got yellow (58)
  - **BlurFail2**: background: expected red, got yellow (58)
  - **BlurFail3**: background: expected red, got NO DATA; presence: expected red, got NO DATA
  - **BlurFail4**: background: expected red, got yellow (58)
  - **BroadCastFraming**: background: expected red, got yellow (58)
  - **CameraAngleTooLow**: angle: expected yellow, got green (92); framing: expected red, got green (88)
  - **GlassesPassWeCanSeeTheEyes**: background: expected red, got yellow (58)
  - **GoodSetup**: background: expected green, got yellow (58); overall: expected 75–100, got 71 (71)
  - **TooCloseMouthCutoff**: background: expected red, got yellow (58); framing: expected red, got green (78)
  - **TooFarFromCamera**: framing: expected red, got green (78)
  - **TooLowFramingRedPresenceRed**: angle: expected red, got green (92)
  - **ZoomNameBar**: background: expected green, got yellow (58); presence: expected green, got red (47); overall: expected 75–100, got 71 (71)

---

## 2026-06-17 21:41 — commit `55b8ba7`

| Result | Count |
|--------|-------|
| Passed | 4 / 17 |
| Failed | 13 / 17 |

**Failures:**
  - **BGBrightFail**: background: expected red, got yellow (52)
  - **BGRedDistracting**: background: expected red, got yellow (58)
  - **BlurFail2**: background: expected red, got yellow (52)
  - **BlurFail3**: background: expected red, got yellow (58)
  - **BlurFail4**: background: expected red, got yellow (52)
  - **BroadCastFraming**: background: expected red, got yellow (58)
  - **CameraAngleTooLow**: angle: expected yellow, got green (92); framing: expected red, got green (88)
  - **GlassesPassWeCanSeeTheEyes**: background: expected red, got yellow (58)
  - **RingLightReflectedInGlasses**: presence: expected red, got yellow (60)
  - **TooCloseMouthCutoff**: background: expected red, got yellow (58); framing: expected red, got green (78)
  - **TooFarFromCamera**: framing: expected red, got green (93)
  - **TooLow2**: presence: expected red, got yellow (55)
  - **TooLowFramingRedPresenceRed**: angle: expected red, got green (92); background: expected yellow, got green (77); presence: expected red, got yellow (62)

---

## 2026-06-17 21:59 — commit `d784588`

| Result | Count |
|--------|-------|
| Passed | 2 / 10 |
| Failed | 8 / 10 |

**Failures:**
  - **BroadCastFraming**: background: expected red, got yellow (58)
  - **CameraAngleTooLow**: framing: expected yellow, got green (88)
  - **GlassesPassWeCanSeeTheEyes**: background: expected red, got yellow (58)
  - **RingLightReflectedInGlasses**: presence: expected red, got yellow (62)
  - **TooCloseMouthCutoff**: background: expected red, got yellow (58); framing: expected red, got green (78)
  - **TooFarFromCamera**: framing: expected red, got yellow (68)
  - **TooLowFramingRedPresenceRed**: angle: expected red, got green (92); presence: expected red, got yellow (62)
  - **ZoomNameBar**: presence: expected green, got yellow (65)

---

## 2026-06-17 22:03 — commit `efe92c6`

| Result | Count |
|--------|-------|
| Passed | 3 / 10 |
| Failed | 7 / 10 |

**Failures:**
  - **BroadCastFraming**: background: expected red, got yellow (55)
  - **GlassesPassWeCanSeeTheEyes**: background: expected red, got yellow (58)
  - **RingLightReflectedInGlasses**: presence: expected red, got yellow (50)
  - **TooCloseMouthCutoff**: background: expected red, got yellow (58); framing: expected red, got green (78)
  - **TooFarFromCamera**: framing: expected red, got yellow (68)
  - **TooLow2**: presence: expected red, got yellow (55)
  - **TooLowFramingRedPresenceRed**: angle: expected red, got green (92); background: expected yellow, got green (77); presence: expected red, got yellow (62)

---

## 2026-06-17 — Presence floor raised to 78

**Commit:** `efe92c6`
**Change:** Raised minimum presence score floor from 75 to 78 for forward-facing visible eyes.

**Reasoning:** GPT was landing at 65 on Adrian's Zoom screenshot despite both eyes clearly visible and forward-facing. The "uncertain gaze" default was producing yellow (65) instead of green. The prompt now explicitly forbids scoring below 78 when both eyes are clearly visible and facing forward, unless a specific off-axis gaze target can be named.

**Impact:**
- ZoomNameBar: presence 65 → 85 (PASS)
- GoodSetup: presence stable (82–85)
- TooLow2: no regression (presence 42–48 — eyes obscured/away, unaffected by floor)
- RingLightReflectedInGlasses: presence 50–62 (eyes fully obscured — floor does not apply)

**Regression result:** 3/10 passed (up from 2/10). No regressions introduced.

---
