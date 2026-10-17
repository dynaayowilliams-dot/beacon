import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Build-time only. Never reads .env, wallet files, or secret environment values.
const root = 'apps/web/dist';
const rules = [
  ['Node-only wallet key setting', /BEACON_PRIVATE_KEY/],
  ['Node-only environment loader', /loadEnvFile/],
  ['Node-only imports', /node:(?:fs|process|crypto|child_process|os|path)/],
  ['private-key account helper', /privateKeyToAccount|generatePrivateKey/],
  ['PEM private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token pattern', /(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})/],
  ['AWS access key pattern', /(?:AKIA|ASIA)[A-Z0-9]{16}/],
  ['credential literal', /(?:private[_-]?key|api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_+\/-]{24,}["']/i],
];
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}
try {
  const files = await walk(root);
  if (!files.some(file => file.endsWith('index.html'))) throw new Error('Missing production index.html.');
  let flags = 0;
  for (const file of files) {
    if (/(?:^|[/\\])(?:\.env(?:\..*)?|\.local|wallets?|secrets?)(?:[/\\]|$)|\.(?:pem|key|keystore|map)$/i.test(file)) {
      console.error(`Unexpected published file: ${file}`); flags++;
    }
    if (!/\.(?:js|css|html|json|txt)$/i.test(file)) continue;
    const source = await readFile(file, 'utf8');
    for (const [label, pattern] of rules) if (pattern.test(source)) {
      console.error(`Bundle audit flag: ${label} in ${file}. Matching values suppressed.`); flags++;
    }
  }
  if (flags) throw new Error(`Production artifact audit found ${flags} flags.`);
  console.log(`PASS: ${files.length} browser artifacts scanned; no secret patterns, key loaders, Node-only imports or sensitive files found.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Production artifact audit failed.');
  process.exitCode = 1;
}
