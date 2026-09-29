import { Injectable } from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import { Model } from "mongoose";

import {
  AuthSecurity,
  AuthSecurityDocument,
} from "./schemas/auth-security.schema";


@Injectable()
export class AuthSecurityService {

  constructor(
    @InjectModel(AuthSecurity.name)
    private readonly authSecurityModel:
      Model<AuthSecurityDocument>,
  ) {}


  async getOrCreate(
    userId: string,
  ) {

    let security =
      await this.authSecurityModel
        .findOne({
          userId,
        });


    if (!security) {

      security =
        await this.authSecurityModel.create({
          userId,
        });

    }


    return security;
  }



  async recordFailedLogin(
    userId: string,
  ) {

    const security =
      await this.getOrCreate(userId);


    const attempts =
      security.failedLoginAttempts + 1;


    const update: {
      failedLoginAttempts: number;
      lockUntil?: Date | null;
    } = {
      failedLoginAttempts: attempts,
    };


    if (attempts >= 5) {

      update.lockUntil =
        new Date(
          Date.now() +
          15 * 60 * 1000,
        );

    }


    await this.authSecurityModel.updateOne(
      {
        userId,
      },

      {
        $set: update,
      },
    );
  }



  async resetFailedAttempts(
    userId: string,
  ) {

    await this.authSecurityModel.updateOne(
      {
        userId,
      },

      {
        $set: {
          failedLoginAttempts: 0,
          lockUntil: null,
          lastLoginAt: new Date(),
        },
      },
    );
  }

}