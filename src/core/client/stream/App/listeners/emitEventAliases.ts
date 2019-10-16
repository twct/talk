import { EventEmitter2 } from "eventemitter2";

export default function emitEventAliases(
  eventEmitter: EventEmitter2,
  eventName: string,
  value: any
) {
  switch (eventName) {
    case "internal.mutation.showAuthPopup":
      switch (value.view) {
        case "SIGN_IN":
          eventEmitter.emit("loginPrompt");
          break;
      }
      break;
    case "internal.mutation.createComment.success":
      eventEmitter.emit("createComment", {
        id: value.result.edge.node.id,
        status: value.result.edge.node.status,
      });
      break;
  }
}
