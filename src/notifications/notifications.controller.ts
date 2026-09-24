import {
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AdminGuard } from "../admin/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { RolesGuard } from "../common/guards/roles.guard";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { NotificationsService } from "./notifications.service";
import { NotificationRecipientType } from "./schemas/notification.schema";

@Controller("notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Student)
export class NotificationsController {
  constructor(
    private readonly notificationsService:
      NotificationsService,
  ) {}

  @Get()
  findMine(
    @Req() request: {
      user: AuthenticatedUser;
    },
  ) {
    return this.notificationsService
      .findForRecipient(
        request.user.id,
        NotificationRecipientType.Student,
      );
  }

  @Get("unread-count")
  unreadCount(
    @Req() request: {
      user: AuthenticatedUser;
    },
  ) {
    return this.notificationsService
      .getUnreadCount(
        request.user.id,
        NotificationRecipientType.Student,
      );
  }

  @Patch("read-all")
  markAllAsRead(
    @Req() request: {
      user: AuthenticatedUser;
    },
  ) {
    return this.notificationsService
      .markAllAsRead(
        request.user.id,
        NotificationRecipientType.Student,
      );
  }

  @Patch(":id/read")
  markAsRead(
    @Req() request: {
      user: AuthenticatedUser;
    },
    @Param("id") id: string,
  ) {
    return this.notificationsService.markAsRead(
      id,
      request.user.id,
      NotificationRecipientType.Student,
    );
  }
}

@Controller("admin/notifications")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService:
      NotificationsService,
  ) {}

  @Get()
  findMine(
    @Req() request: {
      user: AuthenticatedUser;
    },
  ) {
    return this.notificationsService
      .findForRecipient(
        request.user.id,
        NotificationRecipientType.Admin,
      );
  }

  @Get("unread-count")
  unreadCount(
    @Req() request: {
      user: AuthenticatedUser;
    },
  ) {
    return this.notificationsService
      .getUnreadCount(
        request.user.id,
        NotificationRecipientType.Admin,
      );
  }

  @Patch("read-all")
  markAllAsRead(
    @Req() request: {
      user: AuthenticatedUser;
    },
  ) {
    return this.notificationsService
      .markAllAsRead(
        request.user.id,
        NotificationRecipientType.Admin,
      );
  }

  @Patch(":id/read")
  markAsRead(
    @Req() request: {
      user: AuthenticatedUser;
    },
    @Param("id") id: string,
  ) {
    return this.notificationsService.markAsRead(
      id,
      request.user.id,
      NotificationRecipientType.Admin,
    );
  }
}
