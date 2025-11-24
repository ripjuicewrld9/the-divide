import fs from 'fs';
import path from 'path';

const root = path.resolve('./tests/integration');

async function walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const res = path.resolve(dir, e.name);
    if (e.isDirectory()) files.push(...await walk(res));
    else if (e.isFile() && res.endsWith('.js')) files.push(res);
  }
  return files;
}

(async () => {
  try {
    const files = await walk(root);
    console.log('Found', files.length, 'test files');
    let ok = 0;
    for (const f of files) {
      process.stdout.write('Importing ' + f + ' ... ');
      try {
        await import('file://' + f);
        console.log('OK');
        ok++;
      } catch (e) {
        console.log('ERROR');
        console.error(e.stack || e);
      }
    }
    console.log(`Imported ${ok}/${files.length} files successfully`);
    process.exit(0);
  } catch (e) {
    console.error('verify-imports failed', e.stack || e);
    process.exit(2);
  }
})();
