import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Build tooling only: no environment files or wallet settings are read.
const root = fileURLToPath(new URL('../', import.meta.url));
console.log(`[Beacon deployment] Workspace root: ${root}`);
const webRequire = createRequire(new URL('../apps/web/package.json', import.meta.url));
for (const dependency of ['react/jsx-runtime', 'react-dom/client', '@types/react/package.json', '@types/react-dom/package.json', 'vite/package.json']) {
  try { webRequire.resolve(dependency); }
  catch {
    console.error(`[Beacon deployment] Missing web dependency: ${dependency}. Install ALL workspaces with: corepack pnpm --recursive install --frozen-lockfile --prod=false`);
    process.exit(1);
  }
}
for (const step of ['typecheck', 'test', 'build', 'check:bundle']) {
  console.log(`\n[Beacon deployment] Starting ${step}`);
  // Explicit "run" prevents a missing script from falling through to an OS command.
  const args = ['pnpm', '--workspace-root', '--reporter=append-only', 'run', step];
  // cmd.exe is needed for Corepack's Windows shim. Every command token is fixed here.
  const result = spawnSync(process.platform === 'win32' ? 'cmd.exe' : 'corepack', process.platform === 'win32' ? ['/d', '/s', '/c', `corepack ${args.join(' ')}`] : args, {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) {
    console.error(`[Beacon deployment] ${step} failed: ${result.error?.code ?? result.signal ?? result.status}. See the output above.`);
    process.exit(result.status || 1);
  }
  console.log(`[Beacon deployment] Passed ${step}`);
}
