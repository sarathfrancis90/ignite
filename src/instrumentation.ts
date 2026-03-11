export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNotificationListeners } = await import("@/server/events/notification-listener");
    registerNotificationListeners();
  }
}
