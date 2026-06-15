const fs = require('fs');
const path = require('path');

const root = __dirname;

const moves = [
  // FIORA VOICE
  { src: 'services/agent-voice', dest: 'fiora-voice/services/agent-voice' },
  { src: 'services/outbound-engine', dest: 'fiora-voice/services/outbound-engine' },
  { src: 'services/voice-runtime', dest: 'fiora-voice/services/voice-runtime' },
  { src: 'apps/gateway', dest: 'fiora-voice/apps/gateway' },
  { src: 'packages/voice-latency-governance', dest: 'fiora-voice/packages/voice-latency-governance' },
  { src: 'packages/barge-in-control', dest: 'fiora-voice/packages/barge-in-control' },
  { src: 'packages/human-handoff', dest: 'fiora-voice/packages/human-handoff' },

  // FIORA FINANCE
  { src: 'services/agent-finance', dest: 'fiora-finance/services/agent-finance' },
  { src: 'packages/finance-agent', dest: 'fiora-finance/packages/finance-agent' },

  // FIORA MARKETING
  { src: 'services/agent-marketing', dest: 'fiora-marketing/services/agent-marketing' },

  // FIORA SALES
  { src: 'services/agent-sales', dest: 'fiora-sales/services/agent-sales' },
  { src: 'packages/crm-intelligence', dest: 'fiora-sales/packages/crm-intelligence' },

  // FIORA SUPPORT
  { src: 'services/agent-support', dest: 'fiora-support/services/agent-support' },
];

function moveDirectories() {
  const allApps = fs.existsSync(path.join(root, 'apps')) ? fs.readdirSync(path.join(root, 'apps')) : [];
  const allPkgs = fs.existsSync(path.join(root, 'packages')) ? fs.readdirSync(path.join(root, 'packages')) : [];
  const allSvcs = fs.existsSync(path.join(root, 'services')) ? fs.readdirSync(path.join(root, 'services')) : [];

  const explicitSrcs = new Set(moves.map(m => m.src.replace(/\\/g, '/')));

  allApps.forEach(dir => {
    if (dir === 'node_modules') return;
    const src = `apps/${dir}`;
    if (!explicitSrcs.has(src)) moves.push({ src, dest: `core/${src}` });
  });

  allPkgs.forEach(dir => {
    if (dir === 'node_modules') return;
    const src = `packages/${dir}`;
    if (!explicitSrcs.has(src)) moves.push({ src, dest: `core/${src}` });
  });

  allSvcs.forEach(dir => {
    if (dir === 'node_modules') return;
    const src = `services/${dir}`;
    if (!explicitSrcs.has(src)) moves.push({ src, dest: `core/${src}` });
  });

  for (const m of moves) {
    const srcPath = path.join(root, m.src);
    const destPath = path.join(root, m.dest);

    if (fs.existsSync(srcPath)) {
      console.log(`Moving ${m.src} to ${m.dest}`);
      try {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.cpSync(srcPath, destPath, { recursive: true });
        fs.rmSync(srcPath, { recursive: true, force: true });
      } catch (err) {
         console.warn(`Could not delete original ${srcPath}, but copied successfully.`);
      }
    }
  }

  if (fs.existsSync(path.join(root, 'apps')) && fs.readdirSync(path.join(root, 'apps')).length === 0) fs.rmSync(path.join(root, 'apps'), { recursive: true, force: true });
  if (fs.existsSync(path.join(root, 'packages')) && fs.readdirSync(path.join(root, 'packages')).length === 0) fs.rmSync(path.join(root, 'packages'), { recursive: true, force: true });
  if (fs.existsSync(path.join(root, 'services')) && fs.readdirSync(path.join(root, 'services')).length === 0) fs.rmSync(path.join(root, 'services'), { recursive: true, force: true });
}

function updateRootPackageJson() {
  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.workspaces = [
      "fiora-*/*/*",
      "core/*/*"
    ];
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('Updated root package.json workspaces.');
  }
}

function replaceRelativeImports(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
      replaceRelativeImports(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const regex = /from\s+['"](?:\.\.\/)+packages\/([^/'"]+)(?:\/src\/[^'"]*)?['"]/g;
      const newContent = content.replace(regex, (match, pkgName) => {
        return `from '@fiora/${pkgName}'`;
      });

      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Rewrote imports in ${fullPath}`);
      }
    }
  }
}

try {
  moveDirectories();
  updateRootPackageJson();
  replaceRelativeImports(path.join(root, 'fiora-voice'));
  replaceRelativeImports(path.join(root, 'fiora-finance'));
  replaceRelativeImports(path.join(root, 'fiora-marketing'));
  replaceRelativeImports(path.join(root, 'fiora-sales'));
  replaceRelativeImports(path.join(root, 'fiora-support'));
  replaceRelativeImports(path.join(root, 'core'));
  console.log('Migration complete.');
} catch (err) {
  console.error('Migration failed:', err);
}
