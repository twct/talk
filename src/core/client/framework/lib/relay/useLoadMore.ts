import { useCallback, useState } from "react";
import { RelayPaginationProp } from "react-relay";
import { useCoralContext } from "../bootstrap";

/**
 * useLoadMore is a react hook that returns a `loadMore` callback
 * and a `isLoadingMore` boolean.
 */
export default function useLoadMore(
  relay: RelayPaginationProp,
  count: number,
  options: { emitEvent?: string } = {}
): [() => void, boolean] {
  const { eventEmitter } = useCoralContext();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMore = useCallback(() => {
    if (!relay.hasMore() || relay.isLoading()) {
      return;
    }
    if (options.emitEvent) {
      eventEmitter.emit(`internal.loadMore.${options.emitEvent}.init`, {
        count,
      });
    }
    setIsLoadingMore(true);
    relay.loadMore(count, error => {
      setIsLoadingMore(false);
      if (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
      if (options.emitEvent) {
        if (error) {
          eventEmitter.emit(`internal.loadMore.${options.emitEvent}.error`, {
            count,
          });
        } else {
          eventEmitter.emit(`internal.loadMore.${options.emitEvent}.success`, {
            count,
          });
        }
      }
    });
  }, [relay]);
  return [loadMore, isLoadingMore];
}
