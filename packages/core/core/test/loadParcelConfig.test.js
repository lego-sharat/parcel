// @flow
import assert from 'assert';
import path from 'path';
import ParcelConfig from '../src/ParcelConfig';
import {
  validateConfigFile,
  mergePipelines,
  mergeMaps,
  mergeConfigs,
  resolveExtends,
  readAndProcess,
  resolveParcelConfig,
} from '../src/loadParcelConfig';
import {validatePackageName} from '../src/ParcelConfig.schema';
import {DEFAULT_OPTIONS} from './utils';

describe('loadParcelConfig', () => {
  describe('validatePackageName', () => {
    it('should error on an invalid official package', () => {
      assert.throws(() => {
        validatePackageName('@parcel/foo-bar', 'transform', 'transforms');
      }, /Official parcel transform packages must be named according to "@parcel\/transform-{name}"/);
    });

    it('should succeed on a valid official package', () => {
      validatePackageName('@parcel/transform-bar', 'transform', 'transforms');
    });

    it('should error on an invalid community package', () => {
      assert.throws(() => {
        validatePackageName('foo-bar', 'transform', 'transforms');
      }, /Parcel transform packages must be named according to "parcel-transform-{name}"/);

      assert.throws(() => {
        validatePackageName('parcel-foo-bar', 'transform', 'transforms');
      }, /Parcel transform packages must be named according to "parcel-transform-{name}"/);
    });

    it('should succeed on a valid community package', () => {
      validatePackageName('parcel-transform-bar', 'transform', 'transforms');
    });

    it('should error on an invalid scoped package', () => {
      assert.throws(() => {
        validatePackageName('@test/foo-bar', 'transform', 'transforms');
      }, /Scoped parcel transform packages must be named according to "@test\/parcel-transform-{name}"/);

      assert.throws(() => {
        validatePackageName('@test/parcel-foo-bar', 'transform', 'transforms');
      }, /Scoped parcel transform packages must be named according to "@test\/parcel-transform-{name}"/);
    });

    it('should succeed on a valid scoped package', () => {
      validatePackageName(
        '@test/parcel-transform-bar',
        'transform',
        'transforms',
      );
    });
  });

  describe('validateConfigFile', () => {
    it('should throw on invalid config', () => {
      assert.throws(() => {
        validateConfigFile(
          {
            filePath: '.parcelrc',
            extends: 'parcel-config-foo',
            transforms: {
              '*.js': ['parcel-invalid-plugin'],
            },
          },
          '.parcelrc',
        );
      });
    });

    it('should require pipeline to be an array', () => {
      assert.throws(() => {
        validateConfigFile(
          {
            filePath: '.parcelrc',
            // $FlowFixMe
            resolvers: '123',
          },
          '.parcelrc',
        );
      });
    });

    it('should require pipeline elements to be strings', () => {
      assert.throws(() => {
        validateConfigFile(
          {
            filePath: '.parcelrc',
            // $FlowFixMe
            resolvers: [1, '123', 5],
          },
          '.parcelrc',
        );
      });
    });

    it('should require package names to be valid', () => {
      assert.throws(() => {
        validateConfigFile(
          {
            filePath: '.parcelrc',
            // $FlowFixMe
            resolvers: ['parcel-foo-bar'],
          },
          '.parcelrc',
        );
      });
    });

    it('should succeed with an array of valid package names', () => {
      validateConfigFile(
        {
          filePath: '.parcelrc',
          // $FlowFixMe
          resolvers: ['parcel-resolver-test'],
        },
        '.parcelrc',
      );
    });

    it('should support spread elements', () => {
      validateConfigFile(
        {
          filePath: '.parcelrc',
          // $FlowFixMe
          resolvers: ['parcel-resolver-test', '...'],
        },
        '.parcelrc',
      );
    });

    it('should require glob map to be an object', () => {
      assert.throws(() => {
        validateConfigFile(
          {
            filePath: '.parcelrc',
            // $FlowFixMe
            transforms: ['parcel-transformer-test', '...'],
          },
          '.parcelrc',
        );
      });
    });

    it('should trigger the validator function for each key', () => {
      assert.throws(() => {
        validateConfigFile(
          {
            filePath: '.parcelrc',
            transforms: {
              'types:*.{ts,tsx}': ['@parcel/transformer-typescript-types'],
              'bundle-text:*': ['-inline-string', '...'],
            },
          },
          '.parcelrc',
        );
      });
    });

    it('should require extends to be a string or array of strings', () => {
      assert.throws(() => {
        validateConfigFile(
          {
            filePath: '.parcelrc',
            // $FlowFixMe
            extends: 2,
          },
          '.parcelrc',
        );
      });

      assert.throws(() => {
        validateConfigFile(
          {
            filePath: '.parcelrc',
            // $FlowFixMe
            extends: [2, 7],
          },
          '.parcelrc',
        );
      });
    });

    it('should support relative paths', () => {
      validateConfigFile(
        {
          filePath: '.parcelrc',
          extends: './foo',
        },
        '.parcelrc',
      );

      validateConfigFile(
        {
          filePath: '.parcelrc',
          extends: ['./foo', './bar'],
        },
        '.parcelrc',
      );
    });

    it('should validate package names', () => {
      assert.throws(() => {
        validateConfigFile(
          {
            filePath: '.parcelrc',
            extends: 'foo',
          },
          '.parcelrc',
        );
      });

      assert.throws(() => {
        validateConfigFile(
          {
            filePath: '.parcelrc',
            extends: ['foo', 'bar'],
          },
          '.parcelrc',
        );
      });

      validateConfigFile(
        {
          filePath: '.parcelrc',
          extends: 'parcel-config-foo',
        },
        '.parcelrc',
      );

      validateConfigFile(
        {
          filePath: '.parcelrc',
          extends: ['parcel-config-foo', 'parcel-config-bar'],
        },
        '.parcelrc',
      );
    });

    it('should succeed on valid config', () => {
      validateConfigFile(
        {
          filePath: '.parcelrc',
          extends: 'parcel-config-foo',
          transforms: {
            '*.js': ['parcel-transformer-foo'],
          },
        },
        '.parcelrc',
      );
    });

    it('should throw error on empty config file', () => {
      assert.throws(() => {
        validateConfigFile({}, '.parcelrc');
      }, /.parcelrc can't be empty/);
    });
  });

  describe('mergePipelines', () => {
    it('should return an empty array if base and extension are null', () => {
      assert.deepEqual(mergePipelines(null, null), []);
    });

    it('should return base if extension is null', () => {
      assert.deepEqual(mergePipelines(['parcel-transform-foo'], null), [
        'parcel-transform-foo',
      ]);
    });

    it('should return extension if base is null', () => {
      assert.deepEqual(mergePipelines(null, ['parcel-transform-bar']), [
        'parcel-transform-bar',
      ]);
    });

    it('should return extension if there are no spread elements', () => {
      assert.deepEqual(
        mergePipelines(['parcel-transform-foo'], ['parcel-transform-bar']),
        ['parcel-transform-bar'],
      );
    });

    it('should return merge base into extension if there are spread elements', () => {
      assert.deepEqual(
        mergePipelines(
          ['parcel-transform-foo'],
          ['parcel-transform-bar', '...', 'parcel-transform-baz'],
        ),
        [
          'parcel-transform-bar',
          'parcel-transform-foo',
          'parcel-transform-baz',
        ],
      );
    });

    it('should throw if more than one spread element is in a pipeline', () => {
      assert.throws(() => {
        mergePipelines(
          ['parcel-transform-foo'],
          ['parcel-transform-bar', '...', 'parcel-transform-baz', '...'],
        );
      }, /Only one spread element can be included in a config pipeline/);
    });
  });

  describe('mergeMaps', () => {
    it('should return an empty object if base and extension are null', () => {
      assert.deepEqual(mergeMaps(null, null), {});
    });

    it('should return base if extension is null', () => {
      assert.deepEqual(mergeMaps({'*.js': 'foo'}, null), {
        '*.js': 'foo',
      });
    });

    it('should return extension if base is null', () => {
      assert.deepEqual(mergeMaps(null, {'*.js': 'foo'}), {
        '*.js': 'foo',
      });
    });

    it('should merge the objects', () => {
      assert.deepEqual(
        mergeMaps({'*.css': 'css', '*.js': 'base-js'}, {'*.js': 'ext-js'}),
        {'*.js': 'ext-js', '*.css': 'css'},
      );
    });

    it('should ensure that extension properties have a higher precidence than base properties', () => {
      assert.deepEqual(
        mergeMaps({'*.{js,jsx}': 'base-js'}, {'*.js': 'ext-js'}),
        {'*.js': 'ext-js', '*.{js,jsx}': 'base-js'},
      );
      assert.deepEqual(
        Object.keys(mergeMaps({'*.{js,jsx}': 'base-js'}, {'*.js': 'ext-js'})),
        ['*.js', '*.{js,jsx}'],
      );
    });

    it('should call a merger function if provided', () => {
      let merger = (a, b) => [a, b];
      assert.deepEqual(
        mergeMaps({'*.js': 'base-js'}, {'*.js': 'ext-js'}, merger),
        {'*.js': ['base-js', 'ext-js']},
      );
    });
  });

  describe('mergeConfigs', () => {
    it('should merge configs', () => {
      let base = new ParcelConfig(
        {
          filePath: '.parcelrc',
          resolvers: ['parcel-resolver-base'],
          transforms: {
            '*.js': ['parcel-transform-base'],
            '*.css': ['parcel-transform-css'],
          },
          bundler: 'parcel-bundler-base',
        },
        DEFAULT_OPTIONS.packageManager,
      );

      let ext = {
        filePath: '.parcelrc',
        resolvers: ['parcel-resolver-ext', '...'],
        transforms: {
          '*.js': ['parcel-transform-ext', '...'],
        },
      };

      let merged = new ParcelConfig(
        {
          filePath: '.parcelrc',
          resolvers: ['parcel-resolver-ext', 'parcel-resolver-base'],
          transforms: {
            '*.js': ['parcel-transform-ext', 'parcel-transform-base'],
            '*.css': ['parcel-transform-css'],
          },
          bundler: 'parcel-bundler-base',
          runtimes: {},
          namers: [],
          optimizers: {},
          packagers: {},
          reporters: [],
        },
        DEFAULT_OPTIONS.packageManager,
      );

      assert.deepEqual(mergeConfigs(base, ext), merged);
    });
  });

  describe('resolveExtends', () => {
    it('should resolve a relative path', async () => {
      let resolved = await resolveExtends(
        '../.parcelrc',
        path.join(__dirname, 'fixtures', 'config', 'subfolder', '.parcelrc'),
        DEFAULT_OPTIONS,
      );
      assert.equal(
        resolved,
        path.join(__dirname, 'fixtures', 'config', '.parcelrc'),
      );
    });

    it('should resolve a package name', async () => {
      let resolved = await resolveExtends(
        '@parcel/config-default',
        path.join(__dirname, 'fixtures', 'config', 'subfolder', '.parcelrc'),
        DEFAULT_OPTIONS,
      );
      assert.equal(resolved, require.resolve('@parcel/config-default'));
    });
  });

  describe('readAndProcess', () => {
    it('should load and merge configs', async () => {
      let defaultConfig = require('@parcel/config-default');
      let {config} = await readAndProcess(
        path.join(__dirname, 'fixtures', 'config', 'subfolder', '.parcelrc'),
        DEFAULT_OPTIONS,
      );

      assert.deepEqual(config.transforms['*.js'], [
        'parcel-transformer-sub',
        'parcel-transformer-base',
        '...',
      ]);
      assert(Object.keys(config.transforms).length > 1);
      assert.deepEqual(config.resolvers, defaultConfig.resolvers);
      assert.deepEqual(config.bundler, defaultConfig.bundler);
      assert.deepEqual(config.namers, defaultConfig.namers || []);
      assert.deepEqual(config.packagers, defaultConfig.packagers || {});
      assert.deepEqual(config.optimizers, defaultConfig.optimizers || {});
      assert.deepEqual(config.reporters, defaultConfig.reporters || []);
    });
  });

  describe('resolve', () => {
    it('should return null if there is no .parcelrc file found', async () => {
      let resolved = await resolveParcelConfig(__dirname, DEFAULT_OPTIONS);
      assert.equal(resolved, null);
    });

    it('should resolve a config if a .parcelrc file is found', async () => {
      let resolved = await resolveParcelConfig(
        path.join(__dirname, 'fixtures', 'config', 'subfolder'),
        DEFAULT_OPTIONS,
      );

      assert(resolved !== null);
    });
  });
});
