# AFA Camera Score — Known Gaps

Last updated: 2026-06-17
Regression run: commit `efe92c6` — 3/10 passing, 7 remaining failures

These are known scorer limitations, not regressions. Each entry documents what the scorer
currently does vs what it should do, and a priority for future prompt or logic work.

---

## 1. BroadCastFraming — background false yellow

**Image:** `BroadCastFraming-11.jpg`
**Expected:** background red
**Actual:** background yellow (55)
**Root cause:** World map + aviation posters on the wall not registering as visually competing
with the subject. GPT scores the background as "cluttered but not distracting" instead of red.
**Fix direction:** Add explicit language to the background prompt about busy illustrative
content (maps, posters, infographics) behind the subject being an automatic red regardless
of colour.
**Priority:** High

---

## 2. GlassesPassWeCanSeeTheEyes — background false yellow

**Image:** `GlassesPassWeCanSeeTheEyes-9.jpg`
**Expected:** background red
**Actual:** background yellow (58)
**Root cause:** Large, colourful bookshelf behind subject is not being caught as red. GPT
treats it as clutter (yellow) rather than a visually dominant competing element (red).
**Fix direction:** Prompt language around colourful bookshelves and multi-colour object
collections behind the subject should be explicit red triggers.
**Priority:** High

---

## 3. TooCloseMouthCutoff — background false yellow + framing false green

**Image:** `TooClose_MouthCutoff-6.jpg`
**Expected:** background red, framing red
**Actual:** background yellow (58), framing green (78)
**Root cause:** Extreme close-up (mouth cut off at bottom of frame) is not being caught by
the framing criterion. Background at extreme close range is also miscategorised.
**Fix direction:** Add framing rule — if chin/jaw is cut off by the frame edge, it must be
red regardless of face height percentage. Background at extreme close-up may need a
separate anchor.
**Priority:** High

---

## 4. TooFarFromCamera — framing false yellow

**Image:** `TooFarFromCamera-4.jpg`
**Expected:** framing red
**Actual:** framing yellow (68)
**Root cause:** Subject (Brittany) is tiny in the frame — Zoom UI chrome may be confusing
GPT's face height calculation. GPT stops at yellow instead of reaching red.
**Fix direction:** Strengthen the framing prompt: if the face height is below 15% of total
frame height (excluding UI), it must be red. Add an explicit example of a "too far" anchor.
**Priority:** Medium

---

## 5. RingLightReflectedInGlasses — presence false yellow

**Image:** `RingLightReflectedInGlasses-5.jpg`
**Expected:** presence red
**Actual:** presence yellow (50)
**Root cause:** Eyes are fully obscured by the ring light reflection in the lenses. GPT is
scoring 50 (yellow) instead of red. The presence floor (78) does not apply here because
eyes are not visible — but GPT is not reaching red.
**Fix direction:** Add explicit presence rule: if eyes are completely obscured by lens
reflections, glare, or opaque elements, score must be red (< 50), not yellow.
**Priority:** Medium

---

## 6. TooLow2 — presence false yellow

**Image:** `TooLow2-2.jpg`
**Expected:** presence red
**Actual:** presence yellow (55)
**Root cause:** GPT variance. Subject (Kate) is looking at the ceiling / extreme upward gaze.
GPT scores 55 (yellow) instead of red. Off-axis gaze is being treated as uncertain rather
than clearly away from lens.
**Fix direction:** Add explicit presence rule: gaze directed more than ~30° off-axis from
the lens (e.g. looking at ceiling, extreme side gaze) must be red.
**Priority:** Medium

---

## 7. TooLowFramingRedPresenceRed — multiple false signals

**Image:** `TooLowFramingRedPresenceRed-3.jpg`
**Expected:** angle red, background yellow, presence red
**Actual:** angle green (92), background green (77), presence yellow (62)

Sub-issues:
- **Angle false green:** Colin is looking clearly downward (camera below chin level). GPT
  scores 92 green. Client-side noseRatio should catch this but may not be extreme enough.
- **Background false green:** Background should be yellow (cluttered) but scored 77 green.
- **Presence false yellow:** Colin is looking away — presence should be red, not yellow (62).

**Fix direction:** Angle — reinforce downward-angle detection in the GPT prompt, not just
client-side. Presence — see gap #6 above. Background — see gap #1 above.
**Priority:** Low (complex multi-criterion failure; address component by component)

---

## Notes for Future Calibration Sessions

- All 7 gaps above are GPT prompt issues, not client-side logic issues.
- The presence floor (78) is working correctly and should not be adjusted further.
- Background scoring is the weakest criterion — gaps #1, #2, #3, #7 all involve background.
- A single "background red anchors" prompt rewrite session could close 3–4 gaps at once.
- Client-side blur detection is working correctly — all blur images disqualify as expected.
- Do not re-run regression against blur images (client-only) — they will always show as
  skipped, which is correct behaviour.
