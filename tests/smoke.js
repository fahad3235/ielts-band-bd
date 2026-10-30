// IELTS Band Calculator BD \u2014 headless-Chrome smoke tests via raw CDP.
// Run: node tests/smoke.js   (spawns /opt/meta-chromium/chrome, file:// page)
'use strict';
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PORT = 9336;
const PAGE = 'file://' + path.resolve(__dirname, '..', 'index.html');

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('ok - ' + name); }
  else { failed++; console.log('FAIL - ' + name + (extra ? ' :: ' + extra : '')); }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/list');
      const list = await res.json();
      const page = list.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (e) { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('chrome debugger endpoint never came up');
}

async function main() {
  const policyPath = '/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';
  const policySha = crypto.createHash('sha256').update(fs.readFileSync(policyPath)).digest('hex');
  const chrome = spawn('/opt/meta-chromium/chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--no-first-run',
    '--user-data-dir=/tmp/ielts-band-smoke-profile',
    '--hatch-webgl-allowed-domains-file=' + policyPath,
    '--hatch-webgl-allowed-domains-sha256=' + policySha,
    PAGE
  ], { stdio: 'ignore' });
  const errors = [];
  try {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let seq = 0;
    const pending = new Map();
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && pending.has(data.id)) {
        const { resolve } = pending.get(data.id);
        pending.delete(data.id);
        resolve(data);
      }
      if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
        errors.push('console.error: ' + JSON.stringify(data.params.args));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        errors.push('exception: ' + (data.params.exceptionDetails.exception.description || 'unknown'));
      }
    };
    function send(method, params) {
      return new Promise((resolve) => {
        const id = ++seq;
        pending.set(id, { resolve });
        ws.send(JSON.stringify({ id, method, params: params || {} }));
      });
    }
    const evaluate = async (expr) => {
      const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      if (res.error) return { error: JSON.stringify(res.error) };
      const inner = res.result ? res.result.result : undefined;
      if (!inner) return { error: 'no result: ' + JSON.stringify(res).slice(0, 200) };
      if (inner.subtype === 'error') return { error: inner.description };
      return { value: inner.value };
    };
    await send('Runtime.enable');
    await send('Page.enable');
    await sleep(1200);

    let r = await evaluate("document.title");
    check('title is IELTS Band Calculator BD', r.value === 'IELTS Band Calculator BD', JSON.stringify(r));
    r = await evaluate("document.querySelectorAll('#guideBody tr').length");
    check('guide has 10 rows (9..0)', r.value === 10, JSON.stringify(r));

    // Calculator happy path: 7/7/6.5/6.5 -> avg 6.75, overall 7.0, Good user.
    await evaluate("['listening','reading','writing','speaking'].forEach(function(s,i){document.getElementById('calc-'+s).value=[7,7,6.5,6.5][i];});document.getElementById('calcBtn').click();");
    await sleep(400);
    r = await evaluate("document.getElementById('overallVal').textContent");
    check('calc overall 7.0', r.value === '7.0', JSON.stringify(r));
    r = await evaluate("document.getElementById('avgVal').textContent");
    check('calc avg 6.75', r.value === '6.75', JSON.stringify(r));
    r = await evaluate("document.getElementById('descVal').textContent");
    check('calc descriptor Good user', r.value === 'Good user', JSON.stringify(r));
    r = await evaluate("document.querySelectorAll('#historyList .hist tbody tr').length");
    check('history has 1 row after calc', r.value === 1, JSON.stringify(r));

    // Invalid input: 6.3 -> inline step error, result hidden.
    await evaluate("document.getElementById('calc-writing').value='6.3';document.getElementById('calcBtn').click();");
    await sleep(300);
    r = await evaluate("document.getElementById('err-writing').textContent");
    check('step error shown for 6.3', r.value.indexOf('0.5') !== -1, JSON.stringify(r));
    r = await evaluate("document.getElementById('calcResult').style.display");
    check('result hidden on invalid input', r.value === 'none', JSON.stringify(r));

    // Planner: target 7, known 7/7, two missing -> need 13, even 6.5.
    await evaluate("document.getElementById('calc-writing').value='6.5';document.getElementById('plan-listening').value='7';document.getElementById('plan-reading').value='7';document.getElementById('planBtn').click();");
    await sleep(300);
    r = await evaluate("document.getElementById('planResult').textContent");
    check('planner need 13 / even 6.5', r.value.indexOf('13') !== -1 && r.value.indexOf('6.5') !== -1, JSON.stringify(r));

    // Planner infeasible: target 9 with known 5 -> impossible message.
    await evaluate("document.getElementById('plan-listening').value='5';document.getElementById('plan-reading').value='';document.getElementById('plan-writing').value='';document.getElementById('plan-speaking').value='';document.getElementById('plan-target').value='9';document.getElementById('planBtn').click();");
    await sleep(300);
    r = await evaluate("document.getElementById('planResult').textContent");
    check('planner infeasible message', r.value.indexOf('Not reachable') !== -1, JSON.stringify(r));

    // Language toggle -> Bengali title + Bengali digits in history.
    await evaluate("document.getElementById('langBtn').click();");
    await sleep(300);
    r = await evaluate("document.documentElement.lang");
    check('lang attr bn after toggle', r.value === 'bn', JSON.stringify(r));
    r = await evaluate("document.querySelector('h1').textContent");
    check('title Bengali after toggle', r.value.indexOf('\u09ac\u09cd\u09af\u09be\u09a8\u09cd\u09a1') !== -1, JSON.stringify(r));
    r = await evaluate("document.querySelector('#historyList .hist tbody tr td').textContent");
    check('history persists across lang toggle', typeof r.value === 'string' && r.value.length > 0, JSON.stringify(r));

    // Reload persistence: history row survives reload (localStorage).
    await send('Page.reload', { ignoreCache: true });
    await sleep(1500);
    r = await evaluate("document.querySelectorAll('#historyList .hist tbody tr').length");
    check('history persists after reload', r.value === 1, JSON.stringify(r));

    // Clear-all gate: wrong word does not erase; DELETE does.
    await evaluate("document.getElementById('clearInput').value='nope';document.getElementById('clearBtn').click();");
    await sleep(200);
    r = await evaluate("document.querySelectorAll('#historyList .hist tbody tr').length");
    check('wrong word does not erase', r.value === 1, JSON.stringify(r));
    await evaluate("document.getElementById('clearInput').value='DELETE';document.getElementById('clearBtn').click();");
    await sleep(200);
    r = await evaluate("document.querySelectorAll('#historyList .hist tbody tr').length");
    check('DELETE erases history', r.value === 0, JSON.stringify(r));

    // Mobile viewport: no horizontal overflow at 390px.
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(500);
    r = await evaluate("document.documentElement.scrollWidth <= 390");
    check('390px no horizontal overflow', r.value === true, JSON.stringify(r));

    check('zero console/page errors', errors.length === 0, errors.join(' | ').slice(0, 400));
    ws.close();
  } finally {
    chrome.kill();
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('SMOKE HARNESS ERROR: ' + (e && e.stack || e)); process.exit(2); });
