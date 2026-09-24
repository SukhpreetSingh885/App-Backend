import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  InjectConnection,
  InjectModel,
} from "@nestjs/mongoose";
import {
  Connection,
  isValidObjectId,
  Model,
  Types,
} from "mongoose";

import {
  NotificationRecipientType,
  NotificationType,
} from "../notifications/schemas/notification.schema";
import { NotificationsService } from "../notifications/notifications.service";
import { WalletService } from "../wallet/wallet.service";
import { CreateWithdrawalDto } from "./dto/create-withdrawal.dto";
import { UpdateWithdrawalSettingsDto } from "./dto/update-withdrawal-settings.dto";
import { UpdateWithdrawalStatusDto } from "./dto/update-withdrawal-status.dto";
import {
  WithdrawalSettings,
  WithdrawalSettingsDocument,
} from "./schemas/withdrawal-settings.schema";
import {
  PayoutMethod,
  Withdrawal,
  WithdrawalDocument,
  WithdrawalStatus,
} from "./schemas/withdrawal.schema";

const ACTIVE_STATUSES = [
  WithdrawalStatus.Pending,
  WithdrawalStatus.Processing,
];

const ALLOWED_TRANSITIONS: Record<
  WithdrawalStatus,
  WithdrawalStatus[]
> = {
  [WithdrawalStatus.Pending]: [
    WithdrawalStatus.Processing,
    WithdrawalStatus.Rejected,
  ],
  [WithdrawalStatus.Processing]: [
    WithdrawalStatus.Paid,
    WithdrawalStatus.Failed,
  ],
  [WithdrawalStatus.Paid]: [],
  [WithdrawalStatus.Failed]: [],
  [WithdrawalStatus.Rejected]: [],
};

@Injectable()
export class WithdrawalsService {
  private readonly logger =
    new Logger(WithdrawalsService.name);

  constructor(
    @InjectModel(Withdrawal.name)
    private readonly withdrawalModel:
      Model<WithdrawalDocument>,
    @InjectModel(WithdrawalSettings.name)
    private readonly settingsModel:
      Model<WithdrawalSettingsDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly walletService: WalletService,
    private readonly notificationsService:
      NotificationsService,
  ) {}

  async getStudentSettings() {
    const settings = await this.ensureSettings();

    if (!settings) {
      throw new BadRequestException(
        "Withdrawal settings are unavailable",
      );
    }

    return {
      withdrawalsEnabled: settings.withdrawalsEnabled,
      minimumWithdrawalAmount:
        settings.minimumWithdrawalAmount,
    };
  }

  async getAdminSettings() {
    return this.getStudentSettings();
  }

  async updateSettings(
    dto: UpdateWithdrawalSettingsDto,
  ) {
    const settings = await this.settingsModel
      .findOneAndUpdate(
        { key: "default" },
        {
          $set: {
            withdrawalsEnabled:
              dto.withdrawalsEnabled,
            minimumWithdrawalAmount:
              dto.minimumWithdrawalAmount,
          },
          $setOnInsert: { key: "default" },
        },
        { new: true, upsert: true },
      )
      .exec();

    if (!settings) {
      throw new BadRequestException(
        "Withdrawal settings could not be updated",
      );
    }

    return {
      withdrawalsEnabled: settings.withdrawalsEnabled,
      minimumWithdrawalAmount:
        settings.minimumWithdrawalAmount,
    };
  }

  async findMine(studentId: string) {
    const withdrawals = await this.withdrawalModel
      .find({ studentId })
      .select("+bankAccountNumber")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return withdrawals.map((withdrawal) =>
      this.toStudentResponse(withdrawal),
    );
  }

  async create(
    studentId: string,
    dto: CreateWithdrawalDto,
  ) {
    await this.ensureSettings();

    const withdrawalId = new Types.ObjectId();
    const session =
      await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const settings = await this.settingsModel
          .findOne({ key: "default" })
          .session(session)
          .exec();

        if (!settings) {
          throw new BadRequestException(
            "Withdrawal settings are unavailable",
          );
        }

        if (!settings.withdrawalsEnabled) {
          throw new BadRequestException(
            "Withdrawals are currently disabled",
          );
        }

        if (
          dto.amount <
          settings.minimumWithdrawalAmount
        ) {
          throw new BadRequestException(
            `Minimum withdrawal amount is ₹${settings.minimumWithdrawalAmount}`,
          );
        }

        const active = await this.withdrawalModel
          .exists({
            studentId,
            status: { $in: ACTIVE_STATUSES },
          })
          .session(session);

        if (active) {
          throw new ConflictException(
            "You already have an active withdrawal request",
          );
        }

        const balance =
          await this.walletService.getBalance(
            studentId,
            session,
          );

        if (dto.amount > balance) {
          throw new BadRequestException(
            "Withdrawal amount exceeds available wallet balance",
          );
        }

        await this.withdrawalModel.create(
          [{
            _id: withdrawalId,
            studentId,
            amount: dto.amount,
            status: WithdrawalStatus.Pending,
            payoutMethod: dto.payoutMethod,
            ...(dto.payoutMethod === PayoutMethod.Upi
              ? { upiId: dto.upiId }
              : {
                  accountHolderName:
                    dto.accountHolderName,
                  bankAccountNumber:
                    dto.bankAccountNumber,
                  ifscCode:
                    dto.ifscCode?.toUpperCase(),
                }),
          }],
          { session },
        );

        await this.walletService.addDebit(
          studentId,
          dto.amount,
          "Withdrawal reserved",
          `withdrawal:${withdrawalId.toString()}`,
          session,
        );
      });
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          "You already have an active withdrawal request",
        );
      }

      throw error;
    } finally {
      await session.endSession();
    }

    const created = await this.withdrawalModel
      .findById(withdrawalId)
      .select("+bankAccountNumber")
      .lean()
      .exec();

    if (!created) {
      throw new ConflictException(
        "Withdrawal request could not be created",
      );
    }

    await this.notify(
      studentId,
      withdrawalId.toString(),
      NotificationType.WithdrawalRequested,
      "Withdrawal Requested",
      `Your withdrawal request for ₹${dto.amount.toLocaleString("en-IN")} is pending review.`,
      "withdrawal-requested",
    );

    return this.toStudentResponse(created);
  }

  async findAllForAdmin() {
    const withdrawals = await this.withdrawalModel
      .find()
      .select("+bankAccountNumber")
      .populate("studentId", "name email")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return withdrawals.map((withdrawal) => {
      const student = withdrawal.studentId as unknown as {
        _id: Types.ObjectId;
        name?: string;
        email?: string;
      } | null;

      return {
        ...this.toStudentResponse(withdrawal),
        student: {
          id: student?._id?.toString() ?? "",
          name: student?.name ?? "Student unavailable",
          email: student?.email ?? "",
        },
        providerReference:
          withdrawal.providerReference,
        adminNote: withdrawal.adminNote,
      };
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateWithdrawalStatusDto,
  ) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        "Withdrawal not found",
      );
    }

    const session =
      await this.connection.startSession();
    let previousStatus: WithdrawalStatus | null = null;

    try {
      await session.withTransaction(async () => {
        const withdrawal =
          await this.withdrawalModel
            .findById(id)
            .select("+bankAccountNumber")
            .session(session)
            .exec();

        if (!withdrawal) {
          throw new NotFoundException(
            "Withdrawal not found",
          );
        }

        previousStatus = withdrawal.status;

        if (withdrawal.status === dto.status) {
          if (dto.adminNote !== undefined) {
            withdrawal.adminNote = dto.adminNote;
          }
          if (dto.failureReason !== undefined) {
            withdrawal.failureReason = dto.failureReason;
          }
          if (dto.providerReference !== undefined) {
            withdrawal.providerReference = dto.providerReference;
          }
          await withdrawal.save({ session });
          return;
        }

        if (
          !ALLOWED_TRANSITIONS[withdrawal.status]
            .includes(dto.status)
        ) {
          throw new BadRequestException(
            `Cannot change withdrawal from ${withdrawal.status} to ${dto.status}`,
          );
        }

        withdrawal.status = dto.status;
        withdrawal.adminNote = dto.adminNote;
        withdrawal.failureReason =
          dto.failureReason;
        withdrawal.providerReference =
          dto.providerReference;

        if (dto.status === WithdrawalStatus.Paid) {
          withdrawal.paidAt = new Date();
        }

        if (
          dto.status === WithdrawalStatus.Failed ||
          dto.status === WithdrawalStatus.Rejected
        ) {
          await this.walletService.addCredit(
            withdrawal.studentId.toString(),
            withdrawal.amount,
            "Withdrawal refund",
            `withdrawal-refund:${withdrawal._id.toString()}`,
            session,
          );
        }

        await withdrawal.save({ session });
      });
    } finally {
      await session.endSession();
    }

    const updated = await this.withdrawalModel
      .findById(id)
      .exec();

    if (!updated) {
      throw new NotFoundException(
        "Withdrawal not found",
      );
    }

    if (previousStatus !== updated.status) {
      await this.notifyStatus(updated);
    }

    const populated = await this.withdrawalModel
      .findById(updated._id)
      .select("+bankAccountNumber")
      .populate("studentId", "name email")
      .lean()
      .exec();

    if (!populated) {
      throw new NotFoundException(
        "Withdrawal not found",
      );
    }

    const student = populated.studentId as unknown as {
      _id: Types.ObjectId;
      name?: string;
      email?: string;
    } | null;

    return {
      ...this.toStudentResponse(populated),
      student: {
        id: student?._id?.toString() ?? "",
        name: student?.name ?? "Student unavailable",
        email: student?.email ?? "",
      },
      providerReference: populated.providerReference,
      adminNote: populated.adminNote,
    };
  }

  private async ensureSettings() {
    return this.settingsModel
      .findOneAndUpdate(
        { key: "default" },
        {
          $setOnInsert: {
            key: "default",
            withdrawalsEnabled: true,
            minimumWithdrawalAmount: 100,
          },
        },
        { new: true, upsert: true },
      )
      .exec();
  }

  private toStudentResponse(
    withdrawal: Pick<
      Withdrawal,
      | "amount"
      | "status"
      | "payoutMethod"
      | "upiId"
      | "accountHolderName"
      | "bankAccountNumber"
      | "ifscCode"
      | "failureReason"
      | "createdAt"
      | "updatedAt"
      | "paidAt"
    > & { _id: { toString(): string } },
  ) {
    return {
      _id: withdrawal._id.toString(),
      amount: withdrawal.amount,
      status: withdrawal.status,
      payoutMethod: withdrawal.payoutMethod,
      payoutDestination:
        withdrawal.payoutMethod === PayoutMethod.Upi
          ? this.maskUpi(withdrawal.upiId)
          : this.maskAccount(
              withdrawal.bankAccountNumber,
              withdrawal.ifscCode,
            ),
      accountHolderName:
        withdrawal.accountHolderName,
      failureReason: withdrawal.failureReason,
      createdAt: withdrawal.createdAt,
      updatedAt: withdrawal.updatedAt,
      paidAt: withdrawal.paidAt,
    };
  }

  private maskUpi(value?: string) {
    if (!value) return "UPI";
    const [name, provider] = value.split("@");
    const visible = name.slice(-2);
    return `${"*".repeat(Math.max(2, name.length - 2))}${visible}${provider ? `@${provider}` : ""}`;
  }

  private maskAccount(
    value?: string,
    ifscCode?: string,
  ) {
    if (!value) return ifscCode ?? "Bank account";
    return `••••${value.slice(-4)}${ifscCode ? ` · ${ifscCode}` : ""}`;
  }

  private async notifyStatus(
    withdrawal: WithdrawalDocument,
  ) {
    if (withdrawal.status === WithdrawalStatus.Paid) {
      await this.notify(
        withdrawal.studentId.toString(),
        withdrawal._id.toString(),
        NotificationType.WithdrawalPaid,
        "Withdrawal Paid",
        `Your withdrawal of ₹${withdrawal.amount.toLocaleString("en-IN")} has been marked paid.`,
        "withdrawal-paid",
      );
    }

    if (
      withdrawal.status === WithdrawalStatus.Failed ||
      withdrawal.status === WithdrawalStatus.Rejected
    ) {
      await this.notify(
        withdrawal.studentId.toString(),
        withdrawal._id.toString(),
        NotificationType.WithdrawalFailed,
        withdrawal.status === WithdrawalStatus.Failed
          ? "Withdrawal Failed"
          : "Withdrawal Rejected",
        `Your withdrawal of ₹${withdrawal.amount.toLocaleString("en-IN")} was ${withdrawal.status}. The reserved amount was returned to your wallet.`,
        `withdrawal-${withdrawal.status}`,
      );
    }
  }

  private async notify(
    studentId: string,
    withdrawalId: string,
    type: NotificationType,
    title: string,
    message: string,
    event: string,
  ) {
    try {
      await this.notificationsService.create({
        recipientId: studentId,
        recipientType:
          NotificationRecipientType.Student,
        type,
        title,
        message,
        data: { withdrawalId },
        eventKey: `${event}:${withdrawalId}`,
      });
    } catch (error: unknown) {
      this.logger.error(
        "Failed to create withdrawal notification",
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }
  }

  private isDuplicateKeyError(
    error: unknown,
  ): error is { code: number } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    );
  }
}
