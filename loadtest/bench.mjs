// Q12/Q13: Node version of run.sh (no oha needed). Writes the same CSV columns,
// so plot.py works on its output.
//
// Usage:
//   node loadtest/bench.mjs <base_url> <short_code> <out.csv> [levels]
//   node loadtest/bench.mjs https://my-app.vercel.app abc123 loadtest/results-vercel.csv "10 50 100 200"
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const [base, code, out, levelsArg = '10 50 100 200 500'] = process.argv.slice(2);
if (!base || !code || !out) {
  console.error('usage: node loadtest/bench.mjs <base_url> <short_code> <out.csv> [levels]');
  process.exit(1);
}

const levels = levelsArg.split(/\s+/).map(Number);
const body = readFileSync('body.json', 'utf8');
const TIMEOUT_MS = 5000; // same as oha -t 5s

const requests = {
  '/shorten': () =>
    fetch(`${base}/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  '/redirect': () =>
    fetch(`${base}/redirect?code=${encodeURIComponent(code)}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
};

function percentile(sorted, p) {
  if (sorted.length === 0) return '';
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[i] * 100) / 100;
}

// c workers share a queue of n requests, like oha -n n -c c.
async function run(send, n, c) {
  const latencies = [];
  let errors = 0;
  let remaining = n;

  async function worker() {
    while (remaining-- > 0) {
      const start = performance.now();
      try {
        const res = await send();
        await res.arrayBuffer();
        if (res.status >= 500) errors++;
        else latencies.push(performance.now() - start);
      } catch {
        errors++; // timeout or connection error
      }
    }
  }

  const start = performance.now();
  await Promise.all(Array.from({ length: c }, worker));
  const seconds = (performance.now() - start) / 1000;

  latencies.sort((a, b) => a - b);
  return { latencies, errors, seconds };
}

writeFileSync(out, 'endpoint,concurrency,requests,success_rate,p50_ms,p90_ms,p95_ms,p99_ms,req_per_sec,errors\n');

for (const [endpoint, send] of Object.entries(requests)) {
  // One warm-up request so a cold start isn't counted in the first level.
  await send().then((r) => r.arrayBuffer()).catch(() => {});

  for (const c of levels) {
    const n = c * 10;
    console.log(`→ ${endpoint}  concurrency=${c}  requests=${n}`);
    const { latencies, errors, seconds } = await run(send, n, c);
    const row = [
      `"${endpoint}"`, c, n,
      Math.round((latencies.length / n) * 100),
      percentile(latencies, 50), percentile(latencies, 90),
      percentile(latencies, 95), percentile(latencies, 99),
      Math.round(n / seconds), errors,
    ].join(',');
    appendFileSync(out, row + '\n');
    console.log(row);
    await new Promise((r) => setTimeout(r, 3000)); // let the server settle
  }
}

console.log(`Done → ${out}`);
