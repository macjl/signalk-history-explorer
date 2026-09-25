const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('plugin starts by default when it has no saved enable/disable setting', () => {
  const metadata = require('../package.json');
  assert.equal(metadata['signalk-plugin-enabled-by-default'], true);
});

function createApp(fetch) {
  const fields = {
    '#from-date': { value: '2026-09-20T00:00' },
    '#to-date': { value: '2026-09-20T01:00' },
    '#provider-id': { textContent: '' },
    '#context-select': { replaceChildren() {} },
    '#path-filter': { value: '' },
    '#api-state': {},
    '#notice': {},
    '#paths-count': {},
    '#path-groups': {},
    '#range-caption': {}
  };
  const sandbox = {
    navigator: { language: 'en' },
    location: { origin: 'http://localhost:3000', hostname: 'localhost' },
    document: { addEventListener() {}, querySelector: selector => fields[selector], querySelectorAll: () => [], createElement: () => ({}) },
    fetch,
    URLSearchParams,
    Intl,
    Date
  };
  vm.createContext(sandbox);
  const source = fs.readFileSync('public/app.js', 'utf8');
  vm.runInContext(source + '\nthis.app = { state, loadPaths, loadValues, tableRows, historyRows, sparkline };', sandbox);
  return { ...sandbox.app, fields };
}

test('shows the effective provider and sends all History queries to it', async () => {
  const requests = [];
  let currentProvider = 'history-a';
  const app = createApp(async url => {
    const parsed = new URL(url);
    requests.push(parsed);
    if (parsed.pathname.endsWith('/_providers/_default')) return { ok: true, json: async () => ({ id: currentProvider }) };
    if (parsed.pathname.endsWith('/contexts')) return { ok: true, json: async () => ['vessels.self'] };
    if (parsed.pathname.endsWith('/paths')) return { ok: true, json: async () => ['navigation.speedOverGround'] };
    if (parsed.pathname.endsWith('/values')) return { ok: true, json: async () => ({ values: [{}], data: [['2026-09-20T00:20:00Z', 5]] }) };
    if (parsed.pathname.endsWith('/meta')) return { ok: false };
    throw new Error(`Unexpected request: ${url}`);
  });

  await app.loadPaths();
  assert.equal(app.fields['#provider-id'].textContent, 'history-a');
  await app.loadValues('navigation.speedOverGround');
  assert.deepEqual(requests.filter(request => /\/(contexts|paths|values)$/.test(request.pathname)).map(request => request.searchParams.get('provider')), ['history-a', 'history-a', 'history-a']);

  currentProvider = 'history-b';
  app.state.sourcePolicySupported = false;
  await app.loadPaths({ refreshContexts: false });
  assert.equal(app.fields['#provider-id'].textContent, 'history-b');
  assert.equal(app.state.sourcePolicySupported, true);
  assert.deepEqual(requests.filter(request => /\/(contexts|paths)$/.test(request.pathname)).slice(-2).map(request => request.searchParams.get('provider')), ['history-b', 'history-b']);
});

test('ALL reads each context, retains separate sources, and sorts merged values', async () => {
  const requests = [];
  const app = createApp(async url => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/meta')) return { ok: false };
    const context = parsed.searchParams.get('context');
    requests.push({ context, sourcePolicy: parsed.searchParams.get('sourcePolicy') });
    const data = context === 'vessels.self'
      ? [['2026-09-20T00:20:00Z', 2, 3], ['2026-09-20T00:40:00Z', null, 4]]
      : [['2026-09-20T00:10:00Z', 1]];
    return { ok: true, json: async () => ({ values: context === 'vessels.self' ? [{ $source: 'gps' }, { $source: 'sim' }] : [{}], data }) };
  });
  app.state.context = '__all__';
  app.state.contexts = ['vessels.self', 'vessels.other'];
  const result = await app.loadValues('navigation.speedOverGround');
  assert.deepEqual(requests.map(request => request.context).sort(), ['vessels.other', 'vessels.self']);
  assert.ok(requests.every(request => request.sourcePolicy === 'all'));
  assert.deepEqual(Array.from(result.rows, row => [row.time, row.value, row.context, row.source]), [
    ['2026-09-20T00:10:00Z', 1, 'vessels.other', ''],
    ['2026-09-20T00:20:00Z', 2, 'vessels.self', 'gps'],
    ['2026-09-20T00:20:00Z', 3, 'vessels.self', 'sim'],
    ['2026-09-20T00:40:00Z', 4, 'vessels.self', 'sim']
  ]);
  const table = app.tableRows('navigation.speedOverGround', result.rows, '');
  assert.match(table, /vessels\.other/);
  assert.match(table, /vessels\.self/);
  assert.match(table, /gps/);
  assert.match(table, /sim/);
  assert.match(table, /—/);
  assert.equal((app.sparkline(result.rows).match(/<polyline/g) || []).length, 3);
});

test('one selected context does not query the others', async () => {
  const contexts = [];
  const app = createApp(async url => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/meta')) return { ok: false };
    contexts.push(parsed.searchParams.get('context'));
    return { ok: true, json: async () => ({ values: [{}], data: [['2026-09-20T00:20:00Z', 5]] }) };
  });
  app.state.contexts = ['vessels.self', 'vessels.other'];
  app.state.context = 'vessels.other';
  const result = await app.loadValues('navigation.speedOverGround');
  assert.deepEqual(contexts, ['vessels.other']);
  assert.equal(result.rows[0].context, 'vessels.other');
});

test('a provider that rejects sourcePolicy=all is queried again without it', async () => {
  const policies = [];
  const app = createApp(async url => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/meta')) return { ok: false };
    const policy = parsed.searchParams.get('sourcePolicy');
    policies.push(policy);
    if (policy) return { ok: false, status: 400, text: async () => '{"message":"sourcePolicy=all is unavailable"}' };
    return { ok: true, json: async () => ({ values: [{}], data: [['2026-09-20T00:20:00Z', 5]] }) };
  });
  const result = await app.loadValues('navigation.speedOverGround');
  assert.deepEqual(policies, ['all', null]);
  assert.equal(result.rows[0].source, '');
  await app.loadValues('navigation.speedOverGround');
  assert.deepEqual(policies, ['all', null, null]);
});
