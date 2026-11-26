const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const pkg = readJson('package.json');
const app = readJson('app.json').expo;
const eas = readJson('eas.json');
const checks = [];
function ok(label, condition) { checks.push({ label, condition: Boolean(condition) }); }
ok('App version is 1.5.2', app.version === '1.5.2' && pkg.version === '1.5.2');
ok('Android application ID exists', app.android?.package === 'com.zhixueai.student');
ok('Android versionCode is a positive integer', Number.isInteger(app.android?.versionCode) && app.android.versionCode > 0);
ok('APK preview profile exists', eas.build?.preview?.android?.buildType === 'apk');
ok('Expo owner is configured', app.owner === 'jeffrey760719');
ok('EAS project ID is pending authenticated eas init', !app.extra?.eas?.projectId || typeof app.extra.eas.projectId === 'string');
for (const asset of ['assets/icon.png', 'assets/adaptive-icon.png', 'assets/splash.png']) {
  const p = path.join(root, asset);
  const b = fs.existsSync(p) ? fs.readFileSync(p) : Buffer.alloc(0);
  ok(`${asset} exists and is a PNG`, b.length > 8 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
}
const appJs = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
ok('Cloud AI tutor connection is present', appJs.includes('xiaomi-ai.jeffrey760719.workers.dev') && appJs.includes('method:"POST"'));
ok('Backup import validates data', appJs.includes('validateBackup(JSON.parse(backupInput))'));
const syntax = spawnSync(process.execPath, ['--check', path.join(root, 'App.js')], { encoding: 'utf8' });
ok('App.js JavaScript syntax passes Node parser', syntax.status === 0);
for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'}  ${item.label}`);
if (checks.some(x => !x.condition)) process.exit(1);
console.log(`\n${checks.length} project checks passed.`);
