// @flow
import type {BackendType, WorkerImpl} from './types';

export function detectBackend(): BackendType {
  if (process.browser) return 'web';

  try {
    require('worker_threads');
    return 'threads';
  } catch (err) {
    return 'process';
  }
}

export function getWorkerBackend(backend: BackendType): Class<WorkerImpl> {
  switch (backend) {
    case 'threads':
      return require('./threads/ThreadsWorker').default;
    case 'web':
      return require('./web/WebWorker').default;
    case 'process':
      return require('./process/ProcessWorker').default;
    default:
      throw new Error(`Invalid backend: ${backend}`);
  }
}
