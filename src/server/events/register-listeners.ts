import { registerNotificationListeners } from "./listeners/notification.listener";
import { registerEmailListeners } from "./listeners/email.listener";

const globalForListeners = globalThis as unknown as {
  listenersRegistered: boolean | undefined;
};

export function ensureListenersRegistered(): void {
  if (globalForListeners.listenersRegistered) return;

  registerNotificationListeners();
  registerEmailListeners();

  globalForListeners.listenersRegistered = true;
}

ensureListenersRegistered();
