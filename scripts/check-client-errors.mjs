const res = await fetch("http://localhost:3000/");
const html = await res.text();

const checks = [
  ["global-error chunk", /global-error/i.test(html)],
  ["Something went wrong h1", /<h1[^>]*>Something went wrong<\/h1>/i.test(html)],
  ["client-side error paragraph", /Celeventic hit a client-side error/i.test(html)],
  ["Try again button", /Try again/i.test(html)],
  ["build:clean in rendered", /npm run build:clean<\/code>/i.test(html)],
  ["in script only", (() => {
    const body = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    return /Celeventic hit a client-side error/i.test(body);
  })()],
];

for (const [name, ok] of checks) console.log(name, ok);
