import { EventEmitter2 } from "eventemitter2";

import isPromise from "coral-common/utils/isPromise";

function executeAndEmit<R>(
  emitter: EventEmitter2,
  eventName: string,
  variables: any,
  callback: () => R
): R {
  try {
    const result = callback();
    if (isPromise(result)) {
      return result
        .then(r => {
          emitter.emit(`${eventName}.success`, { variables, result: r });
          return r;
        })
        .catch(e => {
          emitter.emit(`${eventName}.error`, { variables, error: e });
          throw e;
        }) as any;
    }
    emitter.emit(`${eventName}.success`, { variables, result });
    return result;
  } catch (error) {
    emitter.emit(`${eventName}.error`, { variables, error });
    throw error;
  }
}

export default executeAndEmit;
