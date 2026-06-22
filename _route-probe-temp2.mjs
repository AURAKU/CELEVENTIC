const routes = [
  '/','/discover','/marketplace','/templates','/invitations',
  '/invitations/catalogue','/legal','/auth/login','/auth/register',
  '/auth/forgot-password','/login',
];
const patterns = ['Application error', 'Internal Server Error'];
function check500(text) {
  if (/statusCode["\s:]*500|HTTP 500|error 500|500 Internal|>500<|"500"\s*[,}]/.test(text)) return true;
  if (text.includes('Application error')) return true;
  if (text.includes('Internal Server Error')) return true;
  return false;
}
async function probe(base) {
  const out = [];
  for (const path of routes) {
    const url = base + path;
    try {
      const res = await fetch(url, { redirect: 'follow', headers: { Accept: 'text/html' } });
      const text = await res.text();
      const hits = patterns.filter(p => text.includes(p));
      const has500 = text.includes('500');
      const hasAppErr = text.includes('Application error');
      const hasInternal = text.includes('Internal Server Error');
      out.push({ path, status: res.status, Application_error: hasAppErr, Internal_Server_Error: hasInternal, contains_500: has500, likely_error_page: check500(text) });
    } catch (e) {
      out.push({ path, status: 'ERR', error: e.message });
    }
  }
  return out;
}
for (const port of [3000, 3001]) {
  const base = `http://localhost:${port}`;
  console.log('\n=== ' + base + ' ===');
  const results = await probe(base);
  console.log('path\tstatus\tAppErr\tInternal500\tcontains500\tlikely_error');
  for (const r of results) {
    if (r.error) { console.log(r.path + '\tERR\t' + r.error); continue; }
    console.log([r.path, r.status, r.Application_error, r.Internal_Server_Error, r.contains_500, r.likely_error].join('\t'));
  }
  const s404 = results.filter(r => r.status === 404);
  const s500 = results.filter(r => typeof r.status === 'number' && r.status >= 500);
  const appErr = results.filter(r => r.Application_error || r.Internal_Server_Error || (typeof r.status === 'number' && r.status >= 500));
  console.log('SUMMARY 404:', s404.map(r=>r.path).join(', ') || 'none');
  console.log('SUMMARY HTTP 500+:', s500.map(r=>r.path).join(', ') || 'none');
  console.log('SUMMARY App/Internal/HTTP500:', appErr.map(r=>`${r.path}(${r.status})`).join(', ') || 'none');
}
