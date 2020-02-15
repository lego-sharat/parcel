// @flow
import Parcel from '@parcel/core';
import SimplePackageInstaller from './SimplePackageInstaller.js';
import {NodePackageManager} from '@parcel/package-manager';
import defaultConfigContents from '@parcel/config-default';
import memFS from './fs.js';
import workerFarm from './workerFarm.js';

const INPUT = {
  'index.js': `import lib from "./lib.js";
if (false) {
  console.log("dead code");
} else {
  console.log(lib);
}`,
  'lib.js': `export default 1234;`,
};

(async () => {
  const b = new Parcel({
    entries: ['/src/index.js'],
    disableCache: true,
    mode: 'production',
    minify: true,
    logLevel: 'verbose',
    defaultConfig: {
      ...defaultConfigContents,
      reporters: ['@parcel/reporter-bundle-analyzer'],
      filePath: '/', //require.resolve('@parcel/config-default'),
    },
    inputFS: memFS,
    outputFS: memFS,
    patchConsole: false,
    workerFarm,
    packageManager: new NodePackageManager(
      memFS,
      new SimplePackageInstaller(memFS),
    ),
    defaultEngines: {
      browsers: ['last 1 Chrome version'],
      node: '10',
    },
  });
  console.log('initialized');

  await memFS.mkdirp('/src');
  await memFS.writeFile(
    '/package.json',
    JSON.stringify({
      engines: {node: '12'},
    }),
  );
  for (let [name, contents] of Object.entries(INPUT)) {
    await memFS.writeFile(`/src/${name}`, contents);
  }

  console.log('running');
  await b.run();
  console.log('finished');

  console.log(await memFS.readFile('/dist/index.js', 'utf8'));

  await workerFarm.end();
})();
