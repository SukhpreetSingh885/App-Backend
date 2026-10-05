import { createHash, randomUUID } from "node:crypto";

import type { JobsOptions } from "bullmq";

export const EMAIL_QUEUE = "emails";
export const SEND_EMAIL_JOB = "send-email";

export type EmailJobData = {
  sender: {
    name: string;
    email: string;
  };
  to: Array<{
    email: string;
  }>;
  subject: string;
  htmlContent: string;
};

export const emailJobOptions: JobsOptions = {
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

export function emailJobId(
  idempotencyKey: string = randomUUID(),
) {
  return `email-${createHash("sha256")
    .update(idempotencyKey)
    .digest("hex")}`;
}
