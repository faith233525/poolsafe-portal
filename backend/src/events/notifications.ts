import { EventEmitter } from "events";

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export interface NotificationEventPayload {
  event: "notification" | "unread_count";
  notification?: any;
  unreadCount?: number;
}

export function emitNotification(userId: string, payload: NotificationEventPayload) {
  emitter.emit(userId, payload);
}

export function addNotificationListener(
  userId: string,
  listener: (payload: NotificationEventPayload) => void,
) {
  emitter.on(userId, listener);
}

export function removeNotificationListener(
  userId: string,
  listener: (payload: NotificationEventPayload) => void,
) {
  emitter.off(userId, listener);
}
