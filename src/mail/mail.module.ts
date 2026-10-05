import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { EMAIL_QUEUE } from "./mail.queue";
import { MailProcessor } from "./mail.processor";
import { MailService } from "./mail.service";

@Module({
  imports: [
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
    }),
  ],
  providers: [
    MailService,
    MailProcessor,
  ],
  exports: [
    MailService,
  ],
})
export class MailModule {}
