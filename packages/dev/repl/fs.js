import {MemoryFS} from '@parcel/fs';
import workerFarm from './workerFarm.js';

module.exports = new MemoryFS(workerFarm);
