import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  AuditLog,
  AuditLogDocument,
} from "./schemas/audit-log.schema";

export interface CreateAuditLogDto {
  actorId: string | { toString(): string };
  action: string;
  module: string;
  targetId?: string | { toString(): string };
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async createAuditLog(
    data: CreateAuditLogDto,
  ): Promise<AuditLogDocument | null> {
    try {
      return await this.auditLogModel.create({
        actorId:
          typeof data.actorId === "string"
            ? data.actorId
            : data.actorId?.toString(),
        action: data.action,
        module: data.module,
        targetId:
          typeof data.targetId === "string"
            ? data.targetId
            : data.targetId?.toString(),
        description: data.description,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to record audit log for action: ${data.action} on module: ${data.module}`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }
}

