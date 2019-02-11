// @flow
import Config from '../src/Config';
import assert from 'assert';
import path from 'path';
import sinon from 'sinon';
import logger from '@parcel/logger';

describe('Config', () => {
  describe('matchGlobMap', () => {
    let config = new Config(
      {
        packagers: {
          '*.css': 'parcel-packager-css',
          '*.js': 'parcel-packager-js'
        }
      },
      '.parcelrc'
    );

    it('should return null array if no glob matches', () => {
      let result = config.matchGlobMap('foo.wasm', config.packagers);
      assert.deepEqual(result, null);
    });

    it('should return a matching pipeline', () => {
      let result = config.matchGlobMap('foo.js', config.packagers);
      assert.deepEqual(result, 'parcel-packager-js');
    });
  });

  describe('matchGlobMapPipelines', () => {
    let config = new Config(
      {
        transforms: {
          '*.jsx': ['parcel-transform-jsx', '...'],
          '*.{js,jsx}': ['parcel-transform-js']
        }
      },
      '.parcelrc'
    );

    it('should return an empty array if no pipeline matches', () => {
      let pipeline = config.matchGlobMapPipelines('foo.css', config.transforms);
      assert.deepEqual(pipeline, []);
    });

    it('should return a matching pipeline', () => {
      let pipeline = config.matchGlobMapPipelines('foo.js', config.transforms);
      assert.deepEqual(pipeline, ['parcel-transform-js']);
    });

    it('should merge pipelines with spread elements', () => {
      let pipeline = config.matchGlobMapPipelines('foo.jsx', config.transforms);
      assert.deepEqual(pipeline, [
        'parcel-transform-jsx',
        'parcel-transform-js'
      ]);
    });
  });

  describe('loadPlugin', () => {
    it('should warn if a plugin needs to specify an engines.parcel field in package.json', async () => {
      let config = new Config(
        {
          transforms: {
            '*.js': ['parcel-transformer-no-engines']
          }
        },
        path.join(__dirname, 'fixtures', 'plugins', '.parcelrc')
      );

      sinon.stub(logger, 'warn');
      let plugin = await config.loadPlugin('parcel-transformer-no-engines');
      assert(plugin);
      assert.equal(typeof plugin.transform, 'function');
      assert(logger.warn.calledOnce);
      assert.equal(
        logger.warn.getCall(0).args[0],
        'The plugin "parcel-transformer-no-engines" needs to specify a `package.json#engines.parcel` field with the supported Parcel version range.'
      );
      logger.warn.restore();
    });

    it('should error if a plugin specifies an invalid engines.parcel field in package.json', async () => {
      let config = new Config(
        {
          transforms: {
            '*.js': ['parcel-transformer-bad-engines']
          }
        },
        path.join(__dirname, 'fixtures', 'plugins', '.parcelrc')
      );

      let errored = false;
      try {
        await config.loadPlugin('parcel-transformer-bad-engines');
      } catch (err) {
        errored = true;
        let parcelVersion = require('../package.json').version;
        assert.equal(
          err.message,
          `The plugin "parcel-transformer-bad-engines" is not compatible with the current version of Parcel. Requires "5.x" but the current version is "${parcelVersion}".`
        );
      }

      assert(errored, 'did not error');
    });
  });
});
