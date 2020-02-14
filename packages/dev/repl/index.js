import Parcel, {createWorkerFarm} from '@parcel/core';
import SimplePackageInstaller from './SimplePackageInstaller.js';
import {NodePackageManager} from '@parcel/package-manager';
import {MemoryFS} from '@parcel/fs';
import path from 'path';
// import defaultConfigContents from '@parcel/config-default';

const defaultConfigContents = {
  bundler: '@parcel/bundler-default',
  transforms: {
    // 'types:*.{ts,tsx}': ['@parcel/transformer-typescript-types'],
    // 'bundle-text:*': ['@parcel/transformer-inline-string', '...'],
    // 'data-url:*': ['@parcel/transformer-inline-string', '...'],
    '*.{js,mjs,jsm,jsx,es6,ts,tsx}': [
      // '@parcel/transformer-react-refresh-babel',
      // '@parcel/transformer-babel',
      // '@parcel/transformer-js',
      // '@parcel/transformer-react-refresh-wrap',
    ],
    // '*.{json,json5}': ['@parcel/transformer-json'],
    // '*.toml': ['@parcel/transformer-toml'],
    // '*.yaml': ['@parcel/transformer-yaml'],
    // '*.{gql,graphql}': ['@parcel/transformer-graphql'],
    // '*.{styl,stylus}': ['@parcel/transformer-stylus'],
    // '*.{sass,scss}': ['@parcel/transformer-sass'],
    // '*.less': ['@parcel/transformer-less'],
    // '*.css': ['@parcel/transformer-postcss', '@parcel/transformer-css'],
    // '*.sss': ['@parcel/transformer-sugarss'],
    // '*.{htm,html}': [
    //   '@parcel/transformer-posthtml',
    //   '@parcel/transformer-html',
    // ],
    // '*.pug': ['@parcel/transformer-pug'],
    // '*.coffee': ['@parcel/transformer-coffeescript'],
    // '*': ['@parcel/transformer-raw'],
  },
  namers: ['@parcel/namer-default'],
  runtimes: {
    // browser: [
    //   '@parcel/runtime-js',
    //   '@parcel/runtime-browser-hmr',
    //   '@parcel/runtime-react-refresh',
    // ],
    // node: ['@parcel/runtime-js'],
  },
  optimizers: {
    // 'data-url:*': ['...', '@parcel/optimizer-data-url'],
    // '*.css': ['@parcel/optimizer-cssnano'],
    // '*.js': ['@parcel/optimizer-terser'],
    // '*.html': ['@parcel/optimizer-htmlnano'],
  },
  packagers: {
    // '*.html': '@parcel/packager-html',
    // '*.css': '@parcel/packager-css',
    '*.js': '@parcel/packager-js',
    // '*.ts': '@parcel/packager-ts',
    // '*': '@parcel/packager-raw',
  },
  resolvers: ['@parcel/resolver-default'],
  reporters: [
    // '@parcel/reporter-cli',
    // '@parcel/reporter-dev-server',
    // '@parcel/reporter-hmr-server',
  ],
};

const INPUT = `if (false) {
  console.log('bad!');
} else {
  console.log('good!');
}
`;

(async () => {
  const workerFarm = createWorkerFarm();
  const memFS = new MemoryFS(workerFarm);

  const pkgInstaller = new SimplePackageInstaller(memFS);
  await pkgInstaller.install({
    modules: [
      '@parcel/bundler-default',
      '@parcel/namer-default',
      '@parcel/packager-js',
      '@parcel/resolver-default',
    ].map(name => ({name, range: 'nightly'})),
    cwd: '/',
  });

  console.log('installed');
  const b = new Parcel({
    entries: [path.join('/', 'src', 'index.js')],
    disableCache: true,
    mode: 'development',
    minify: false,
    logLevel: 'verbose',
    defaultConfig: {
      ...defaultConfigContents,
      filePath: '/', //require.resolve('@parcel/config-default'),
    },
    inputFS: memFS,
    outputFS: memFS,
    patchConsole: false,
    workerFarm,
    packageManager: new NodePackageManager(memFS, pkgInstaller),
    defaultEngines: {
      browsers: ['last 1 Chrome version'],
      node: '8',
    },
  });
  console.log('initialized');

  await memFS.mkdirp('/src');
  await memFS.writeFile(path.join('/src', 'index.js'), INPUT);
  await memFS.writeFile(
    path.join('/src', 'package.json'),
    JSON.stringify({
      engines: {node: '12'},
    }),
  );

  console.log('running');
  await b.run();
  console.log('finished');

  console.log(await memFS.readFile(path.join('/src', 'index.js'), 'utf8'));

  await workerFarm.end();
})();
