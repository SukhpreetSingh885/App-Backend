import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";

import { UserRole } from "../common/enums/user-role.enum";
import { UpdateUserDto } from "./dto/update-user.dto";
import { PublicUser, User as UserEntity } from "./interfaces/user.interface";
import { User, UserDocument } from "./schemas/user.schema";
import * as bcrypt from "bcrypt";
type CreateInput = {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
  countryCode?: string;
  mobile?: string;
  phoneNumber?: string;
};

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(input: CreateInput): Promise<PublicUser> {
    try {
      const user = await this.userModel.create({
        name: input.name.trim(),
        email: this.normalizeEmail(input.email),
        password: input.passwordHash,
        role: input.role ?? UserRole.Student,
        countryCode: input.countryCode?.trim(),
        mobile: input.mobile?.trim(),
        phoneNumber: input.phoneNumber?.trim(),
      });
      return this.toPublic(user.toObject());
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        if (error.keyPattern?.phoneNumber || error.keyValue?.phoneNumber) {
          throw new ConflictException("Mobile number already registered");
        }
        throw new ConflictException("An account with this email already exists");
      }
      throw error;
    }
  }

  async findAll(): Promise<PublicUser[]> {
    const users = await this.userModel.find().lean().exec();
    return users.map((user) => this.toPublic(user));
  }

  async findById(id: string): Promise<PublicUser> {
    if (!isValidObjectId(id)) throw new NotFoundException("User not found");
    const user = await this.userModel.findById(id).lean().exec();
    if (!user) throw new NotFoundException("User not found");
    return this.toPublic(user);
  }

  async findByEmailWithPassword(email: string): Promise<UserEntity | undefined> {
    const user = await this.userModel
      .findOne({ email: this.normalizeEmail(email) })
      .select("+password")
      .lean()
      .exec();
    return user ? this.toEntity(user) : undefined;
  }

  async findByPhoneNumberWithPassword(identifier: string): Promise<UserEntity | undefined> {
    const normalized = identifier.trim().replace(/[\s()-]/g, "");
    const query = normalized.startsWith("+")
      ? { phoneNumber: normalized }
      : { $or: [{ phoneNumber: normalized }, { mobile: normalized }] };
    const user = await this.userModel
      .findOne(query)
      .select("+password")
      .lean()
      .exec();
    return user ? this.toEntity(user) : undefined;
  }

  async existsByEmail(email: string): Promise<boolean> {
    return Boolean(await this.userModel.exists({ email: this.normalizeEmail(email) }));
  }

  async existsByPhoneNumber(phoneNumber: string): Promise<boolean> {
    return Boolean(await this.userModel.exists({ phoneNumber: phoneNumber.trim() }));
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    if (!isValidObjectId(id)) throw new NotFoundException("User not found");
    const update: Record<string, string> = {};
    if (dto.name !== undefined) update.name = dto.name.trim();
    if (dto.email !== undefined) update.email = this.normalizeEmail(dto.email);

    try {
      const user = await this.userModel
        .findByIdAndUpdate(id, { $set: update }, { returnDocument: "after", runValidators: true })
        .lean()
        .exec();
      if (!user) throw new NotFoundException("User not found");
      return this.toPublic(user);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException("An account with this email already exists");
      }
      throw error;
    }
  }
async changePassword(
  id: string,
  newPassword: string,
): Promise<void> {
  if (!isValidObjectId(id)) {
    throw new NotFoundException(
      "User not found",
    );
  }

  const hashedPassword =
    await bcrypt.hash(
      newPassword,
      12,
    );

  const user =
    await this.userModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            password: hashedPassword,
          },
        },
        {
          new: true,
        },
      )
      .exec();

  if (!user) {
    throw new NotFoundException(
      "User not found",
    );
  }
}
async changeEmail(
  id: string,
  newEmail: string,
): Promise<void> {

  if (!isValidObjectId(id)) {
    throw new NotFoundException(
      "User not found",
    );
  }


  const normalizedEmail =
    this.normalizeEmail(
      newEmail,
    );


  const exists =
    await this.userModel.exists({
      email: normalizedEmail,
      _id: {
        $ne: id,
      },
    });


  if (exists) {
    throw new ConflictException(
      "Email already registered",
    );
  }


  const user =
    await this.userModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            email:
              normalizedEmail,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();


  if (!user) {
    throw new NotFoundException(
      "User not found",
    );
  }
}
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toEntity(user: any): UserEntity {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      countryCode: user.countryCode,
      mobile: user.mobile,
      phoneNumber: user.phoneNumber,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private toPublic(user: any): PublicUser {
    const { password: _password, ...publicUser } = this.toEntity(user);
    return publicUser;
  }

  private isDuplicateKeyError(error: unknown): error is {
    code: number;
    keyPattern?: Record<string, number>;
    keyValue?: Record<string, unknown>;
  } {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }
}
