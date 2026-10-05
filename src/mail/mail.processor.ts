import { Logger } from "@nestjs/common";
import {
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from "@nestjs/bullmq";
import type { Job } from "bullmq";

import { MailService } from "./mail.service";
import {
  EMAIL_QUEUE,
  EmailJobData,
  SEND_EMAIL_JOB,
} from "./mail.queue";

@Processor(EMAIL_QUEUE, {
  concurrency: 3,
})
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(
    MailProcessor.name,
  );

  constructor(
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(
    job: Job<EmailJobData>,
  ): Promise<void> {
    if (job.name !== SEND_EMAIL_JOB) {
      throw new Error(
        `Unsupported email job: ${job.name}`,
      );
    }

    await this.mailService.deliverQueuedEmail(
      job.data,
    );
  }

  @OnWorkerEvent("failed")
  onFailed(
    job: Job<EmailJobData> | undefined,
    error: Error,
  ) {
    this.logger.error(
      `Email job ${job?.id ?? "unknown"} failed after attempt ${job?.attemptsMade ?? 0}: ${error.message}`,
      error.stack,
    );
  }
}
