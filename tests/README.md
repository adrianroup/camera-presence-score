# Camera Score — Regression Tests

## Structure

```
tests/
├── regression.js        # Test runner
├── CALIBRATION_LOG.md   # Full history of threshold changes + test runs
├── README.md            # This file
├── images/              # Test images (one per spec) — add yours here
├── specs/               # JSON spec files defining expected results
└── reports/             # Auto-generated HTML reports from each run
```

## Quick Start

```bash
# Add your test images to tests/images/
# Then run:
node tests/regression.js
```

## Spec Format

```json
{
  "id": "my-test",
  "description": "What this image tests",
  "image": "my-test.jpg",
  "expected": {
    "lighting":    "green",
    "angle":       "green",
    "background":  "green",
    "framing":     "green",
    "presence":    "green",
    "overall_min": 75,
    "overall_max": 100
  },
  "notes": "Why this test exists and what it guards against."
}
```

Colour values: `"green"` | `"yellow"` | `"red"`

## Test Cases

| Spec | Image needed | Tests for |
|------|-------------|-----------|
| good-setup | good-setup.jpg | Baseline all-green pass |
| zoom-namebar | zoom-namebar.jpg | Zoom name bar false positives (angle + framing) |
| ring-light | ring-light.jpg | Ring light detection (circular pupil reflection) |
| digital-blur | digital-blur.jpg | Digital/virtual background blur detection |
| bright-background | bright-background.jpg | BgSpike / backlit disqualification |
| low-angle | low-angle.jpg | Genuine low angle (nostrils visible) |
| too-far | too-far.jpg | Face too small in frame |
| face-cut-off | face-cut-off.jpg | Face clipped by frame edge |

## Output

Each run produces:
- Console pass/fail per image and criterion
- HTML report in `tests/reports/YYYY-MM-DD_HH-MM.html`
- Entry appended to `CALIBRATION_LOG.md`
