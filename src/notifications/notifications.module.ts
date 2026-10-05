import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { MongooseModule } from "@nestjs/mongoose";

import { AdminGuard } from "../admin/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import {
  AdminNotificationsController,
  NotificationsController,
} from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsProcessor } from "./notifications.processor";
import { NOTIFICATIONS_QUEUE } from "./notifications.queue";
import {
  Notification,
  NotificationSchema,
} from "./schemas/notification.schema";

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE,
    }),
    MongooseModule.forFeature([
      {
        name: Notification.name,
        schema: NotificationSchema,
      },
    ]),
  ],
  controllers: [
    NotificationsController,
    AdminNotificationsController,
  ],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    JwtAuthGuard,
    RolesGuard,
    AdminGuard,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
