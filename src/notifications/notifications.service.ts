import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  isValidObjectId,
  Model,
  Types,
} from "mongoose";

import {
  Notification,
  NotificationDocument,
  NotificationRecipientType,
  NotificationType,
} from "./schemas/notification.schema";

export type CreateNotificationInput = {
  recipientId: string;
  recipientType: NotificationRecipientType;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  eventKey?: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel:
      Model<NotificationDocument>,
  ) {}

  async create(input: CreateNotificationInput) {
    const notification =
      this.toPersistenceObject(input);

    if (input.eventKey) {
      return this.notificationModel
        .findOneAndUpdate(
          {
            recipientId:
              notification.recipientId,
            eventKey: input.eventKey,
          },
          {
            $setOnInsert: notification,
          },
          {
            new: true,
            upsert: true,
          },
        )
        .exec();
    }

    return this.notificationModel.create(
      notification,
    );
  }

  async createMany(
    inputs: CreateNotificationInput[],
  ) {
    if (!inputs.length) {
      return;
    }

    const operations = inputs.map((input) => {
      const notification =
        this.toPersistenceObject(input);

      if (input.eventKey) {
        return {
          updateOne: {
            filter: {
              recipientId:
                notification.recipientId,
              eventKey: input.eventKey,
            },
            update: {
              $setOnInsert: notification,
            },
            upsert: true,
          },
        };
      }

      return {
        insertOne: {
          document: notification,
        },
      };
    });

    await this.notificationModel.bulkWrite(
      operations,
      { ordered: false },
    );
  }

  async findForRecipient(
    recipientId: string,
    recipientType: NotificationRecipientType,
  ) {
    return this.notificationModel
      .find({
        recipientId:
          this.toObjectId(recipientId),
        recipientType,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async getUnreadCount(
    recipientId: string,
    recipientType: NotificationRecipientType,
  ) {
    const unreadCount =
      await this.notificationModel.countDocuments({
        recipientId:
          this.toObjectId(recipientId),
        recipientType,
        read: false,
      });

    return { unreadCount };
  }

  async markAsRead(
    notificationId: string,
    recipientId: string,
    recipientType: NotificationRecipientType,
  ) {
    if (!isValidObjectId(notificationId)) {
      throw new NotFoundException(
        "Notification not found",
      );
    }

    const notification =
      await this.notificationModel
        .findOneAndUpdate(
          {
            _id: notificationId,
            recipientId:
              this.toObjectId(recipientId),
            recipientType,
          },
          {
            $set: { read: true },
          },
          { new: true },
        )
        .exec();

    if (!notification) {
      throw new NotFoundException(
        "Notification not found",
      );
    }

    return notification;
  }

  async markAllAsRead(
    recipientId: string,
    recipientType: NotificationRecipientType,
  ) {
    const result =
      await this.notificationModel.updateMany(
        {
          recipientId:
            this.toObjectId(recipientId),
          recipientType,
          read: false,
        },
        {
          $set: { read: true },
        },
      );

    return {
      modifiedCount: result.modifiedCount,
    };
  }

  private toPersistenceObject(
    input: CreateNotificationInput,
  ) {
    return {
      recipientId:
        this.toObjectId(input.recipientId),
      recipientType: input.recipientType,
      type: input.type,
      title: input.title,
      message: input.message,
      read: false,
      ...(input.data
        ? { data: input.data }
        : {}),
      ...(input.eventKey
        ? { eventKey: input.eventKey }
        : {}),
    };
  }

  private toObjectId(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        "Recipient not found",
      );
    }

    return new Types.ObjectId(id);
  }
}
