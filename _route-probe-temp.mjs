const routes = [
  '/',
  '/discover',
  '/marketplace',
  '/templates',
  '/invitations',
  '/invitations/catalogue',
  '/legal',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/login',
];

const errorPatterns = [
  'Application error',
  '500',
  'Internal Server Error',
];

function bodyHasError(text) {
  return errorPatterns.filter((p) => text.includes(p));
}

async function probePort(port) {
  const results = [];
  for (const path of routes) {
    const url = `http://localhost:${port}${path}`;
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { Accept: 'text/html' },
      });
      const text = await res.text();
      const hits = bodyHasError(text);
      results.push({
        path,
        status: res.status,
        errorInBody: hits.length ? hits : null,
      });
    } catch (e) {
      results.push({ path, status: 'ERR', error: String(e.message) });
    }
  }
  return results;
}

function printResults(label, results) {
  console.log(`\n=== ${label} ===\n`);
  for (const r of results) {
    const err =
      r.errorInBody?.length
        ? ` | body hints: ${r.errorInBody.join(', ')}`
        : r.error
          ? ` | ${r.error}`
          : '';
    console.log(`${r.path.padEnd(28)} ${String(r.status).padStart(3)}${err}`);
  }
  const f404 = results.filter((r) => r.status === 404);
  const f500 = results.filter((r) => r.status >= 500);
  const body500 = results.filter((r) => r.errorInBody?.length);
  console.log('\n--- Summary ---');
  console.log('404:', f404.map((r) => r.path).join(', ') || '(none)');
  console.log('500+:', f500.map((r) => r.path).join(', ') || '(none)');
  console.log('Error text in body:', body500.map((r) => r.path).join(', ') || '(none)');
  const login = results.find((r) => r.path === '/login');
  if (login?.status === 404) {
    console.log('/login 404: known gap (confirmed)');
  }
  return { f404, f500, body500, results };
}

const port3000 = await probePort(3000);
printResults('Port 3000', port3000);
const port3001 = await probePort(3001);
printResults('Port 3001', port3001);
