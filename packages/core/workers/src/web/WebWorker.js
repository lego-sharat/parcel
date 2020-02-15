// @flow

import type {
  WorkerImpl,
  MessageHandler,
  ErrorHandler,
  ExitHandler,
  WorkerMessage,
} from '../types';
import {prepareForSerialization, restoreDeserializedObject} from '@parcel/core';

export default class WebWorker implements WorkerImpl {
  execArgv: Object;
  onMessage: MessageHandler;
  onError: ErrorHandler;
  onExit: ExitHandler;
  worker: Worker;

  constructor(
    execArgv: Object,
    onMessage: MessageHandler,
    onError: ErrorHandler,
    onExit: ExitHandler,
  ) {
    this.execArgv = execArgv;
    this.onMessage = onMessage;
    this.onError = onError;
    this.onExit = onExit;
  }

  start() {
    this.worker = new Worker('./WebChild.js');

    this.worker.onmessage = ({data}) => this.handleMessage(data);
    this.worker.onerror = this.onError;
    // this.worker.on('exit', this.onExit);

    return Promise.resolve();
    // return new Promise<void>(resolve => {
    //   this.worker.on('online', resolve);
    // });
  }

  stop() {
    // In node 12, this returns a promise, but previously it accepted a callback
    // TODO: Pass a callback in earlier versions of Node
    return Promise.resolve(this.worker.terminate());
  }

  handleMessage(data: WorkerMessage) {
    this.onMessage(restoreDeserializedObject(data));
  }

  send(data: WorkerMessage) {
    this.worker.postMessage(prepareForSerialization(data));
  }
}
