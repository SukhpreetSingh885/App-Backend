import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AdminGuard } from "../admin/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import {
  AdminNotificationsController,
  NotificationsController,
} from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import {
  Notification,
  NotificationSchema,
} from "./schemas/notification.schema";

@Module({
  imports: [
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
    JwtAuthGuard,
    RolesGuard,
    AdminGuard,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
