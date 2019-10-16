import { useState } from "react";
import { RelayPaginationProp } from "react-relay";
import { Variables } from "relay-runtime";

import { useEffectWhenChanged } from "coral-framework/hooks";

import { useCoralContext } from "../bootstrap";

type RefetchFunction = () => void;
type IsRefetching = boolean;

/**
 * useRefetch is a react hook that returns a `refetch` callback
 * and a `isRefetching` boolean. Any change to the variables
 * will result in a `refetch`.
 */
export default function useRefetch<V = Variables>(
  relay: RelayPaginationProp,
  variables: V = {} as any,
  options: { emitEvent?: string } = {}
): [RefetchFunction, IsRefetching] {
  const { eventEmitter } = useCoralContext();
  const [manualRefetchCount, setManualRefetchCount] = useState(0);
  const [refetching, setRefetching] = useState(false);
  useEffectWhenChanged(() => {
    setRefetching(true);
    if (options.emitEvent) {
      eventEmitter.emit(
        `internal.refetch.${options.emitEvent}.init`,
        variables
      );
    }
    const disposable = relay.refetchConnection(
      10,
      error => {
        setRefetching(false);
        if (error) {
          // eslint-disable-next-line no-console
          console.error(error);
        }
        if (options.emitEvent) {
          if (error) {
            eventEmitter.emit(
              `internal.refetch.${options.emitEvent}.error`,
              variables
            );
          } else {
            eventEmitter.emit(
              `internal.refetch.${options.emitEvent}.success`,
              variables
            );
          }
        }
      },
      variables
    );
    return () => {
      if (disposable) {
        if (options.emitEvent) {
          eventEmitter.emit(
            `internal.refetch.${options.emitEvent}.cancel`,
            variables
          );
        }
        disposable.dispose();
      }
    };
  }, [
    relay.environment,
    manualRefetchCount,
    ...Object.keys(variables).reduce<any[]>((a, k) => {
      a.push((variables as any)[k]);
      return a;
    }, []),
  ]);
  return [() => setManualRefetchCount(manualRefetchCount + 1), refetching];
}
