import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import {
  InjectConnection,
  InjectModel,
} from "@nestjs/mongoose";

import {
  Connection,
  Model,
} from "mongoose";

import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";

import { UserRole } from "../common/enums/user-role.enum";
import { UsersService } from "../users/users.service";
import { ReferralService } from "../referrals/referral.service";

import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

import {
  ReferralCode,
  ReferralCodeDocument,
} from "../referrals/schemas/referral-code.schema";

import {
  ReferralUsage,
  ReferralUsageDocument,
  ReferralUsageStatus,
} from "../referrals/schemas/referral-usage.schema";

@Injectable()
export class AuthService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    private readonly usersService: UsersService,

    private readonly jwtService: JwtService,

    private readonly referralService: ReferralService,

    @InjectModel(ReferralCode.name)
    private readonly referralCodeModel:
      Model<ReferralCodeDocument>,

    @InjectModel(ReferralUsage.name)
    private readonly referralUsageModel:
      Model<ReferralUsageDocument>,
  ) {}

  async register(dto: RegisterDto) {
    if (
      await this.usersService.existsByEmail(
        dto.email,
      )
    ) {
      throw new ConflictException(
        "An account with this email already exists",
      );
    }

    const countryCode =
      dto.countryCode.trim();

    const mobile =
      dto.mobile.trim();

    const phoneNumber =
      `${countryCode}${mobile}`;

    if (
      await this.usersService.existsByPhoneNumber(
        phoneNumber,
      )
    ) {
      throw new ConflictException(
        "Mobile number already registered",
      );
    }

    const passwordHash =
      await hash(dto.password, 12);

    const referralCode =
      dto.referralCode
        ?.trim()
        .toUpperCase();

    const rewardAmount =
      referralCode
        ? await this.referralService
            .getRewardAmount()
        : 0;

    const session =
      await this.connection.startSession();

    try {
      let user:
        Awaited<
          ReturnType<UsersService["create"]>
        > | undefined;

      await session.withTransaction(
        async () => {
          let referralCodeData:
            ReferralCodeDocument | null = null;

          if (referralCode) {
            referralCodeData =
              await this.referralCodeModel
                .findOneAndUpdate(
                  {
                    code: referralCode,
                    active: true,
                  },
                  {
                    $set: {
                      active: false,
                    },
                  },
                  {
                    new: true,
                    session,
                  },
                )
                .exec();

            if (!referralCodeData) {
              throw new ConflictException(
                "Invalid or already used referral code",
              );
            }
          }

          user =
            await this.usersService.create(
              {
                name: dto.name,
                email: dto.email,
                passwordHash,
                role: UserRole.Student,
                countryCode,
                mobile,
                phoneNumber,
              },
              session,
            );

          if (referralCodeData) {
            await this.referralUsageModel.create(
              [
                {
                  referrerId:
                    referralCodeData.studentId,

                  referredStudentId:
                    user.id,

                  referralCode:
                    referralCodeData.code,

                  rewardAmount,

                  status:
                    ReferralUsageStatus.Pending,

                  rewardGiven: false,
                },
              ],
              {
                session,
              },
            );
          }
        },
      );

      if (!user) {
        throw new Error(
          "Registration transaction did not create a user",
        );
      }

      return {
        user,
        accessToken:
          await this.sign(user),
      };
    } finally {
      await session.endSession();
    }
  }

  async login(dto: LoginDto) {
    const identifier =
      dto.identifier.trim();

    const user =
      identifier.includes("@")
        ? await this.usersService
            .findByEmailWithPassword(
              identifier,
            )
        : await this.usersService
            .findByPhoneNumberWithPassword(
              identifier,
            );

    if (
      !user ||
      !(await compare(
        dto.password,
        user.password,
      ))
    ) {
      throw new UnauthorizedException(
        "Invalid email/mobile or password",
      );
    }

    const {
      password: _password,
      ...publicUser
    } = user;

    return {
      user: publicUser,
      accessToken:
        await this.sign(publicUser),
    };
  }

  private sign(
    user: {
      id: string;
      email: string;
      role: UserRole;
    },
  ): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}