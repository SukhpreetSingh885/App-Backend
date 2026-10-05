import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { Queue } from "bullmq";

import {
  EMAIL_QUEUE,
  emailJobId,
  emailJobOptions,
  EmailJobData,
  SEND_EMAIL_JOB,
} from "./mail.queue";

@Injectable()
export class MailService {
  private readonly logger =
    new Logger(MailService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectQueue(EMAIL_QUEUE)
    private readonly emailQueue:
      Queue<EmailJobData>,
  ) {}

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>'"]/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[character] ?? character,
    );
  }

  async sendOtpEmail(
    email: string,
    otp: string,
    name?: string,
  ) {
    const recipientName = this.escapeHtml(
      name?.trim() || email.split("@")[0] || "Admin",
    );

    await this.queueEmail(
      {
        sender: {
          name:
            this.config.get<string>(
              "BREVO_SENDER_NAME",
            ) ?? "Viralstan Academy",
          email:
            this.config.getOrThrow<string>(
              "BREVO_SENDER_EMAIL",
            ),
        },
        to: [{ email }],
        subject:
          "Verify your Viralstan Academy account",
        htmlContent: `
            <div style="font-family: Arial, sans-serif; color: #172033; line-height: 1.6; max-width: 600px; margin: 0 auto;">
              <h2 style="margin-bottom: 24px;">Verify your Viralstan Academy account</h2>
              <p>Hello ${recipientName},</p>
              <p>Use the following OTP to verify your email address for Viralstan Academy.</p>
              <p style="margin-bottom: 4px;">Your OTP:</p>
              <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; margin: 0 0 20px;">${otp}</p>
              <p>This OTP is valid for 5 minutes.</p>
              <p style="margin-bottom: 4px;">For security reasons:</p>
              <ul style="margin-top: 0;">
                <li>Do not share this OTP with anyone.</li>
                <li>Viralstan Academy will never ask for your OTP.</li>
              </ul>
              <p>If you did not request this verification, please ignore this email.</p>
              <p>Thanks,<br />Viralstan Academy Team</p>
            </div>
          `,
      },
      `admin-otp:${email}:${otp}`,
    );
  }

  async queueEmail(
    email: EmailJobData,
    idempotencyKey?: string,
  ) {
    this.config.getOrThrow<string>(
      "BREVO_API_KEY",
    );

    await this.emailQueue.add(
      SEND_EMAIL_JOB,
      email,
      {
        ...emailJobOptions,
        jobId: emailJobId(idempotencyKey),
      },
    );
  }

  async deliverQueuedEmail(
    email: EmailJobData,
  ) {
    try {
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        email,
        {
          headers: {
            "api-key":
              this.config.getOrThrow<string>(
                "BREVO_API_KEY",
              ),
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error: any) {
      this.logger.error(
        `Brevo email failed: ${
          error.response?.data
            ? JSON.stringify(error.response.data)
            : error.message
        }`,
      );

      throw error;
    }
  }
}
