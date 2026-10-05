import { createHash, randomUUID } from "node:crypto";

import type { JobsOptions } from "bullmq";

import type { CreateNotificationInput } from "./notifications.service";

export const NOTIFICATIONS_QUEUE = "notifications";
export const CREATE_NOTIFICATION_JOB = "create-notification";

export type NotificationJobData = {
  input: CreateNotificationInput;
  idempotencyKey: string;
};

export const notificationJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 1_000,
  },
  removeOnComplete: {
    age: 24 * 60 * 60,
    count: 10_000,
  },
  removeOnFail: {
    age: 7 * 24 * 60 * 60,
    count: 10_000,
  },
};

export function createNotificationJobData(
  input: CreateNotificationInput,
): NotificationJobData {
  return {
    input,
    idempotencyKey: input.eventKey ?? randomUUID(),
  };
}

export function notificationJobId(
  data: NotificationJobData,
) {
  return `notification-${createHash("sha256")
    .update(
      `${data.input.recipientId}:${data.idempotencyKey}`,
    )
    .digest("hex")}`;
}
