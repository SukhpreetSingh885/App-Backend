import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes } from "mongoose";

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({
  collection: "audit_logs",
  timestamps: true,
  versionKey: false,
})
export class AuditLog {
  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  actorId!: string;

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  action!: string;

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  module!: string;

  @Prop({
    trim: true,
    index: true,
  })
  targetId?: string;

  @Prop({
    trim: true,
  })
  description?: string;

  @Prop({
    type: SchemaTypes.Mixed,
  })
  metadata?: Record<string, unknown>;

  @Prop({
    trim: true,
  })
  ipAddress?: string;

  @Prop({
    trim: true,
  })
  userAgent?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ module: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

