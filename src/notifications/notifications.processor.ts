import { Logger } from "@nestjs/common";
import {
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from "@nestjs/bullmq";
import type { Job } from "bullmq";

import { NotificationsService } from "./notifications.service";
import {
  CREATE_NOTIFICATION_JOB,
  NotificationJobData,
  NOTIFICATIONS_QUEUE,
} from "./notifications.queue";

@Processor(NOTIFICATIONS_QUEUE, {
  concurrency: 5,
})
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(
    NotificationsProcessor.name,
  );

  constructor(
    private readonly notificationsService:
      NotificationsService,
  ) {
    super();
  }

  async process(
    job: Job<NotificationJobData>,
  ): Promise<void> {
    if (job.name !== CREATE_NOTIFICATION_JOB) {
      throw new Error(
        `Unsupported notification job: ${job.name}`,
      );
    }

    await this.notificationsService
      .persistQueuedNotification(
        job.data.input,
        job.data.idempotencyKey,
      );
  }

  @OnWorkerEvent("failed")
  onFailed(
    job: Job<NotificationJobData> | undefined,
    error: Error,
  ) {
    this.logger.error(
      `Notification job ${job?.id ?? "unknown"} failed after attempt ${job?.attemptsMade ?? 0}: ${error.message}`,
      error.stack,
    );
  }
}
