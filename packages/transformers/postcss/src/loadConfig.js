// @flow
import type {Config, PluginOptions} from '@parcel/types';
import type {PluginLogger} from '@parcel/logger';
import path from 'path';

import loadExternalPlugins from './loadPlugins';

const MODULE_BY_NAME_RE = /\.module\./;

async function configHydrator(
  configFile: any,
  config: Config,
  options: PluginOptions,
) {
  // Use a basic, modules-only PostCSS config if the file opts in by a name
  // like foo.module.css
  if (configFile == null && config.searchPath.match(MODULE_BY_NAME_RE)) {
    configFile = {
      plugins: {
        'postcss-modules': {},
      },
    };
  }

  if (configFile == null) {
    return;
  }

  // Load the custom config...
  let modules;
  let configPlugins = configFile.plugins;
  if (
    configPlugins != null &&
    typeof configPlugins === 'object' &&
    configPlugins['postcss-modules'] != null
  ) {
    modules = configPlugins['postcss-modules'];
    delete configPlugins['postcss-modules'];
  }

  if (!modules && configFile.modules) {
    modules = {};
  }

  let plugins = await loadExternalPlugins(
    configPlugins,
    config.searchPath,
    options,
  );

  return config.setResult({
    raw: configFile,
    hydrated: {
      plugins,
      from: config.searchPath,
      to: config.searchPath,
      modules,
    },
  });
}

export async function load({
  config,
  options,
  logger,
}: {|
  config: Config,
  options: PluginOptions,
  logger: PluginLogger,
|}) {
  let configFile: any = await config.getConfig(
    ['.postcssrc', '.postcssrc.json', 'postcss.config.js', '.postcssrc.js'],
    {packageKey: 'postcss'},
  );

  let configPath = config.resolvedPath;
  if (configPath) {
    if (path.extname(configPath) === '.js') {
      logger.warn({
        message:
          'WARNING: Using a JavaScript PostCSS config file means losing out on caching features of Parcel. Use a .postcssrc(.json) file whenever possible.',
      });

      config.shouldInvalidateOnStartup();
    }

    if (configFile) {
      if (typeof configFile !== 'object') {
        throw new Error('PostCSS config should be an object.');
      }

      if (
        configFile.plugins == null ||
        typeof configFile.plugins !== 'object' ||
        Object.keys(configFile.plugins) === 0
      ) {
        throw new Error('PostCSS config must have plugins');
      }

      let configFilePlugins = Array.isArray(configFile.plugins)
        ? configFile.plugins
        : Object.keys(configFile.plugins);
      for (let p of configFilePlugins) {
        // JavaScript configs can use an array of functions... ugh
        if (typeof p === 'function') {
          configFile.__contains_functions = true;

          // Just do all the things, tbh have no clue what this does...
          config.shouldInvalidateOnStartup();
          config.shouldReload();
        }

        if (typeof p === 'string') {
          if (p.startsWith('.')) {
            logger.warn({
              message:
                'WARNING: Using relative PostCSS plugins means losing out on caching features of Parcel. Bundle this plugin up in a package or use a monorepo to resolve this issue.',
            });

            config.shouldInvalidateOnStartup();
          }

          config.addDevDependency(p);
        }
      }
    }
  }

  return configHydrator(configFile, config, options);
}

export function preSerialize(config: Config) {
  if (!config.result) return;

  if (config.result.raw.__contains_functions) {
    // $FlowFixMe
    config.result = {};
  } else {
    // $FlowFixMe
    config.result = {
      raw: config.result.raw,
    };
  }
}

export function postDeserialize(config: Config, options: PluginOptions) {
  return configHydrator(config.result.raw, config, options);
}
