import { registerNotificationListeners } from "./listeners/notification.listener";

const globalForListeners = globalThis as unknown as {
  listenersRegistered: boolean | undefined;
};

export function ensureListenersRegistered(): void {
  if (globalForListeners.listenersRegistered) return;

  registerNotificationListeners();

  globalForListeners.listenersRegistered = true;
}

ensureListenersRegistered();
