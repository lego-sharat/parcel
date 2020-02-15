// @flow
import path from 'path';

import type {Config} from '@parcel/types';
import type {BabelConfig} from './types';

export default function getTypescriptOptions(config: Config): BabelConfig {
  return {
    plugins: [
      [
        require('@babel/plugin-transform-typescript'),
        {isTSX: path.extname(config.searchPath) === '.tsx'},
      ],
    ],
  };
}
