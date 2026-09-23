import { Injectable } from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  ReferralCode,
  ReferralCodeDocument,
} from "./schemas/referral-code.schema";

import {
  ReferralSettings,
  ReferralSettingsDocument,
} from "./schemas/referral-settings.schema";

@Injectable()
export class ReferralService {
  constructor(
    @InjectModel(ReferralCode.name)
    private readonly referralCodeModel:
      Model<ReferralCodeDocument>,

    @InjectModel(ReferralSettings.name)
    private readonly referralSettingsModel:
      Model<ReferralSettingsDocument>,
  ) {}

  private async generateReferralCode(): Promise<string> {
    while (true) {
      const random =
        Math.floor(
          100000 + Math.random() * 900000,
        );

      const code =
        `VIRAL${random}`;

      const exists =
        await this.referralCodeModel.exists({
          code,
        });

      if (!exists) {
        return code;
      }
    }
  }

  async createReferralCodes(
    studentId: string,
  ) {
    const existingCodes =
      await this.referralCodeModel.countDocuments({
        studentId,
        active: true,
      });

    if (existingCodes >= 3) {
      return;
    }

    const codes: ReferralCodeDocument[] = [];

    for (
      let i = existingCodes;
      i < 3;
      i++
    ) {
      const code =
        await this.generateReferralCode();

      const savedCode =
        await this.referralCodeModel.create({
          studentId,
          code,
        });

      codes.push(savedCode);
    }

    return codes;
  }

  async getMyCodes(
    studentId: string,
  ) {
    const codes =
      await this.referralCodeModel.find({
        studentId,
        active: true,
      });

    const settings =
      await this.getSettings();

    return {
      rewardAmount:
        settings?.rewardAmount ?? 0,

      codes: codes.map((item) => ({
        code: item.code,

        link:
          this.generateReferralLink(
            item.code,
          ),
      })),
    };
  }

  generateReferralLink(
    code: string,
  ): string {
    return `viralstanacademy://ref/${code}`;
  }

  async getRewardAmount(): Promise<number> {
    const settings =
      await this.referralSettingsModel.findOne({
        key: "default",
        active: true,
      });

    return settings?.rewardAmount ?? 0;
  }

  async updateRewardAmount(
    amount: number,
  ) {
    return this.referralSettingsModel.findOneAndUpdate(
      {
        key: "default",
      },
      {
        $set: {
          rewardAmount: amount,
          active: true,
        },
        $setOnInsert: {
          key: "default",
        },
      },
      {
        new: true,
        upsert: true,
      },
    );
  }

  async getSettings() {
    return this.referralSettingsModel.findOne({
      key: "default",
      active: true,
    });
  }
}