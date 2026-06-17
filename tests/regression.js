#!/usr/bin/env node
/**
 * AFA Camera Score — Regression Test Runner
 * 
 * Usage:
 *   node tests/regression.js
 *   node tests/regression.js --spec zoom-namebar   (run single spec)
 *   node tests/regression.js --url https://custom.vercel.app
 * 
 * Requires:
 *   - Test images in tests/images/<name>.jpg
 *   - Spec files in tests/specs/<name>.json
 *   - Live Vercel endpoint reachable
 * 
 * Output:
 *   - Console: pass/fail per image + criterion
 *   - HTML report: tests/reports/YYYY-MM-DD_HH-MM.html
 *   - Appends summary to tests/CALIBRATION_LOG.md
 */

const fs   = require('fs');
const path = require('path');
const http = require('https');

// ── Config ─────────────────────────────────────────────────────────────────
const BASE_URL    = process.argv.find(a => a.startsWith('--url='))?.split('=')[1]
                 ?? 'https://test.anaudiencefromanywhere.com';
const SINGLE_SPEC = process.argv.find(a => a.startsWith('--spec='))?.split('=')[1]
                 ?? process.argv[process.argv.indexOf('--spec') + 1];
const API_ENDPOINT = `${BASE_URL}/api/analyse`;

const DIRS = {
  specs:   path.join(__dirname, 'specs'),
  images:  path.join(__dirname, 'images'),
  reports: path.join(__dirname, 'reports'),
  log:     path.join(__dirname, 'CALIBRATION_LOG.md'),
};

// Colour thresholds — must match scoring in index.html / analyse.js
const SCORE_BANDS = {
  green:  [75, 100],
  yellow: [50, 74],
  red:    [0,  49],
};

// Criteria keys returned by /api/analyse
const CRITERIA = ['lighting', 'angle', 'background', 'framing', 'presence'];

// ── Helpers ────────────────────────────────────────────────────────────────
function colourFromScore(score) {
  if (score === null || score === undefined) return null;
  if (score >= 75) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

function pad(str, len) {
  return String(str).padEnd(len);
}

function timestamp() {
  const d = new Date();
  return d.toISOString().replace('T', ' ').slice(0, 16);
}

function reportFilename() {
  return new Date().toISOString().replace('T', '_').slice(0, 16).replace(':', '-') + '.html';
}

function gitCommit() {
  try {
    return require('child_process').execSync('git rev-parse --short HEAD', { cwd: path.join(__dirname, '..') }).toString().trim();
  } catch { return 'unknown'; }
}

// ── API call ───────────────────────────────────────────────────────────────
function analyseImage(imagePath) {
  return new Promise((resolve, reject) => {
    const imageData = fs.readFileSync(imagePath);
    const base64    = imageData.toString('base64');
    const ext       = path.extname(imagePath).toLowerCase().replace('.', '');
    const mimeType  = ext === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl   = `data:${mimeType};base64,${base64}`;

    const body = JSON.stringify({ image: dataUrl });
    const url  = new URL(API_ENDPOINT);

    const options = {
      hostname: url.hostname,
      path:     url.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = (url.protocol === 'https:' ? require('https') : require('http')).request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse failed: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timed out')); });
    req.write(body);
    req.end();
  });
}

// ── Result comparison ──────────────────────────────────────────────────────
function compareResults(spec, apiResult) {
  const failures = [];
  const passes   = [];

  // Map API response keys to spec keys
  // API returns: lightingScore, angleScore, backgroundScore, framingScore, presenceScore, overallScore
  const scoreMap = {
    lighting:   apiResult.lightingScore   ?? apiResult.lighting_score   ?? null,
    angle:      apiResult.angleScore      ?? apiResult.angle_score      ?? null,
    background: apiResult.backgroundScore ?? apiResult.background_score ?? null,
    framing:    apiResult.framingScore    ?? apiResult.framing_score    ?? null,
    presence:   apiResult.presenceScore   ?? apiResult.presence_score   ?? null,
    overall:    apiResult.overallScore    ?? apiResult.overall_score    ?? apiResult.score ?? null,
  };

  for (const criterion of CRITERIA) {
    const expectedColour = spec.expected[criterion];
    if (!expectedColour) continue;

    const actualScore  = scoreMap[criterion];
    const actualColour = colourFromScore(actualScore);

    if (actualColour === null) {
      failures.push({ criterion, expected: expectedColour, actual: 'NO DATA', score: null });
    } else if (actualColour !== expectedColour) {
      failures.push({ criterion, expected: expectedColour, actual: actualColour, score: actualScore });
    } else {
      passes.push({ criterion, expected: expectedColour, actual: actualColour, score: actualScore });
    }
  }

  // Overall range check
  const overallScore = scoreMap.overall;
  if (overallScore !== null && spec.expected.overall_min !== undefined) {
    const inRange = overallScore >= spec.expected.overall_min && overallScore <= spec.expected.overall_max;
    if (!inRange) {
      failures.push({
        criterion: 'overall',
        expected: `${spec.expected.overall_min}–${spec.expected.overall_max}`,
        actual: overallScore,
        score: overallScore,
      });
    } else {
      passes.push({ criterion: 'overall', expected: `${spec.expected.overall_min}–${spec.expected.overall_max}`, actual: overallScore, score: overallScore });
    }
  }

  return { passes, failures, scoreMap };
}

// ── Console output ─────────────────────────────────────────────────────────
const ANSI = {
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  bold:   '\x1b[1m',
  reset:  '\x1b[0m',
  grey:   '\x1b[90m',
};

function colourAnsi(colour) {
  return ANSI[colour] || ANSI.grey;
}

function printResult(spec, result) {
  const { passes, failures, scoreMap } = result;
  const passed = failures.length === 0;
  const icon   = passed ? '✓' : '✗';
  const colour = passed ? ANSI.green : ANSI.red;

  console.log(`\n${colour}${ANSI.bold}${icon} ${spec.id}${ANSI.reset}  ${ANSI.grey}${spec.description}${ANSI.reset}`);

  for (const p of passes) {
    const scoreStr = p.score !== null ? ` (${p.score})` : '';
    console.log(`  ${ANSI.green}✓${ANSI.reset} ${pad(p.criterion, 12)} ${colourAnsi(p.actual)}${p.actual}${ANSI.reset}${scoreStr}`);
  }

  for (const f of failures) {
    const scoreStr = f.score !== null ? ` (${f.score})` : '';
    console.log(`  ${ANSI.red}✗${ANSI.reset} ${pad(f.criterion, 12)} expected ${ANSI.green}${f.expected}${ANSI.reset} got ${ANSI.red}${f.actual}${ANSI.reset}${scoreStr}`);
  }
}

// ── HTML report ────────────────────────────────────────────────────────────
function generateHTML(allResults, commit, runTime) {
  const totalSpecs   = allResults.length;
  const totalPassed  = allResults.filter(r => r.passed).length;
  const totalFailed  = totalSpecs - totalPassed;

  const rows = allResults.map(r => {
    const { spec, result, error } = r;
    const statusClass = r.passed ? 'pass' : 'fail';
    const statusText  = r.passed ? 'PASS' : (error ? 'ERROR' : 'FAIL');

    const criteriaHTML = CRITERIA.concat(['overall']).map(c => {
      const pass = result?.passes?.find(p => p.criterion === c);
      const fail = result?.failures?.find(f => f.criterion === c);
      if (!pass && !fail) return `<td class="na">—</td>`;
      if (pass) {
        const score = pass.score !== null ? pass.score : '';
        return `<td class="green">${pass.actual}${score !== '' ? ` (${score})` : ''}</td>`;
      }
      return `<td class="red">${fail.actual}${fail.score !== null ? ` (${fail.score})` : ''}<br><small>exp: ${fail.expected}</small></td>`;
    }).join('');

    return `
      <tr class="${statusClass}">
        <td class="status ${statusClass}">${statusText}</td>
        <td class="spec-id">${spec.id}</td>
        <td class="desc">${spec.description}</td>
        ${criteriaHTML}
        <td class="notes">${error ? `<span class="error">${error}</span>` : (spec.notes || '')}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AFA Camera Score — Regression Report ${runTime}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0d0c0b; color: #edebe6; padding: 32px; font-size: 14px; }
  h1 { font-size: 22px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 6px; color: #edebe6; }
  .meta { color: #888; font-size: 13px; margin-bottom: 28px; }
  .meta span { color: #bbb; }
  .summary { display: flex; gap: 24px; margin-bottom: 28px; }
  .summary-box { padding: 14px 22px; border-radius: 6px; border: 1px solid #333; }
  .summary-box.total  { border-color: #444; }
  .summary-box.passed { border-color: #2d6a2d; background: rgba(45,106,45,0.1); }
  .summary-box.failed { border-color: #8b2020; background: rgba(139,32,32,0.1); }
  .summary-box .num { font-size: 28px; font-weight: 900; line-height: 1; }
  .summary-box .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-top: 2px; }
  .summary-box.passed .num { color: #5cb85c; }
  .summary-box.failed .num { color: #c0392b; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #1a1917; color: #888; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; padding: 10px 12px; text-align: left; border-bottom: 1px solid #333; }
  td { padding: 10px 12px; border-bottom: 1px solid #1e1d1c; vertical-align: top; }
  tr.pass td { background: #0f130f; }
  tr.fail td { background: #130f0f; }
  tr:hover td { filter: brightness(1.1); }
  td.status { font-weight: 700; font-size: 11px; letter-spacing: 0.1em; white-space: nowrap; }
  td.status.pass { color: #5cb85c; }
  td.status.fail { color: #c0392b; }
  td.green { color: #5cb85c; }
  td.red   { color: #c0392b; }
  td.na    { color: #444; }
  td.spec-id { font-weight: 600; white-space: nowrap; color: #ccc; }
  td.desc  { color: #999; max-width: 220px; }
  td.notes { color: #666; font-style: italic; font-size: 12px; max-width: 200px; }
  .error   { color: #e74c3c; font-style: normal; }
  small    { font-size: 11px; color: #c0392b; }
  .commit  { font-family: monospace; color: #c0392b; }
</style>
</head>
<body>
<h1>AFA Camera Score — Regression Report</h1>
<div class="meta">
  Run: <span>${runTime}</span> &nbsp;·&nbsp;
  Commit: <span class="commit">${commit}</span> &nbsp;·&nbsp;
  Endpoint: <span>${BASE_URL}</span>
</div>
<div class="summary">
  <div class="summary-box total"><div class="num">${totalSpecs}</div><div class="lbl">Total</div></div>
  <div class="summary-box passed"><div class="num">${totalPassed}</div><div class="lbl">Passed</div></div>
  <div class="summary-box failed"><div class="num">${totalFailed}</div><div class="lbl">Failed</div></div>
</div>
<table>
  <thead>
    <tr>
      <th>Status</th>
      <th>ID</th>
      <th>Description</th>
      <th>Lighting</th>
      <th>Angle</th>
      <th>Background</th>
      <th>Framing</th>
      <th>Presence</th>
      <th>Overall</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
</body>
</html>`;
}

// ── Calibration log entry ──────────────────────────────────────────────────
function appendCalibrationLog(allResults, commit, runTime) {
  const totalPassed = allResults.filter(r => r.passed).length;
  const totalFailed = allResults.length - totalPassed;
  const failList    = allResults.filter(r => !r.passed).map(r => {
    const failDetails = r.result?.failures?.map(f =>
      `${f.criterion}: expected ${f.expected}, got ${f.actual}${f.score !== null ? ` (${f.score})` : ''}`
    ).join('; ') || r.error || 'unknown error';
    return `  - **${r.spec.id}**: ${failDetails}`;
  }).join('\n') || '  - none';

  const entry = `
## ${runTime} — commit \`${commit}\`

| Result | Count |
|--------|-------|
| Passed | ${totalPassed} / ${allResults.length} |
| Failed | ${totalFailed} / ${allResults.length} |

**Failures:**
${failList}

---
`;

  if (!fs.existsSync(DIRS.log)) {
    fs.writeFileSync(DIRS.log, `# AFA Camera Score — Calibration Log\n\nThis file records every regression test run and calibration change.\nUse it to understand the current scoring thresholds and the reasoning behind each adjustment.\n\n---\n`);
  }
  fs.appendFileSync(DIRS.log, entry);
  console.log(`\n${ANSI.grey}Calibration log updated: tests/CALIBRATION_LOG.md${ANSI.reset}`);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const commit  = gitCommit();
  const runTime = timestamp();

  console.log(`\n${ANSI.bold}AFA Camera Score — Regression Test${ANSI.reset}`);
  console.log(`${ANSI.grey}Endpoint: ${BASE_URL}${ANSI.reset}`);
  console.log(`${ANSI.grey}Commit:   ${commit}${ANSI.reset}`);
  console.log(`${ANSI.grey}Time:     ${runTime}${ANSI.reset}`);

  // Load specs
  const specFiles = fs.readdirSync(DIRS.specs).filter(f => f.endsWith('.json'));
  const specs     = specFiles
    .map(f => JSON.parse(fs.readFileSync(path.join(DIRS.specs, f), 'utf8')))
    .filter(s => !SINGLE_SPEC || s.id === SINGLE_SPEC);

  if (specs.length === 0) {
    console.error(`\nNo specs found${SINGLE_SPEC ? ` matching "${SINGLE_SPEC}"` : ''}.`);
    process.exit(1);
  }

  // Ensure required directories exist
  if (!fs.existsSync(DIRS.images))  fs.mkdirSync(DIRS.images,  { recursive: true });
  if (!fs.existsSync(DIRS.reports)) fs.mkdirSync(DIRS.reports, { recursive: true });

  console.log(`\nRunning ${specs.length} spec(s)...\n${'─'.repeat(50)}`);

  const allResults = [];

  for (const spec of specs) {
    const imagePath = path.join(DIRS.images, spec.image);

    if (!fs.existsSync(imagePath)) {
      console.log(`\n${ANSI.yellow}⚠ SKIP${ANSI.reset} ${spec.id} — image not found: ${spec.image}`);
      allResults.push({ spec, result: null, passed: false, error: `Image not found: ${spec.image}` });
      continue;
    }

    process.stdout.write(`  Scanning ${spec.id}...`);
    try {
      const apiResult = await analyseImage(imagePath);
      const result    = compareResults(spec, apiResult);
      const passed    = result.failures.length === 0;
      allResults.push({ spec, result, passed, error: null });
      process.stdout.write(passed ? ` ${ANSI.green}PASS${ANSI.reset}\n` : ` ${ANSI.red}FAIL${ANSI.reset}\n`);
      printResult(spec, result);
    } catch (err) {
      process.stdout.write(` ${ANSI.red}ERROR${ANSI.reset}\n`);
      console.log(`  ${ANSI.red}${err.message}${ANSI.reset}`);
      allResults.push({ spec, result: null, passed: false, error: err.message });
    }
  }

  // Summary
  const totalPassed = allResults.filter(r => r.passed).length;
  const totalFailed = allResults.length - totalPassed;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`${ANSI.bold}Results: ${ANSI.green}${totalPassed} passed${ANSI.reset}  ${totalFailed > 0 ? ANSI.red : ANSI.grey}${totalFailed} failed${ANSI.reset}  of ${allResults.length} total`);

  // HTML report
  const reportPath = path.join(DIRS.reports, reportFilename());
  fs.writeFileSync(reportPath, generateHTML(allResults, commit, runTime));
  console.log(`\n${ANSI.grey}HTML report: ${reportPath}${ANSI.reset}`);

  // Calibration log
  appendCalibrationLog(allResults, commit, runTime);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
