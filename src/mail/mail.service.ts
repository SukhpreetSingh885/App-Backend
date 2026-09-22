import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class MailService {
  private readonly logger =
    new Logger(MailService.name);

  constructor(
    private readonly config: ConfigService,
  ) {}

  async sendOtpEmail(
    email: string,
    otp: string,
  ) {
    try {
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
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

          to: [
            {
              email,
            },
          ],

          subject:
            "Viralstan Academy OTP Verification",

          htmlContent: `
            <div>
              <h2>Viralstan Academy</h2>

              <p>Your OTP code is:</p>

              <h1>${otp}</h1>

              <p>This code expires in 5 minutes.</p>
            </div>
          `,
        },
        {
          headers: {
            "api-key":
              this.config.getOrThrow<string>(
                "BREVO_API_KEY",
              ),

            "Content-Type":
              "application/json",
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