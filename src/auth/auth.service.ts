import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";

import { UserRole } from "../common/enums/user-role.enum";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService, private readonly jwtService: JwtService) {}

async register(dto: RegisterDto) {
  if (await this.usersService.existsByEmail(dto.email)) {
    throw new ConflictException("An account with this email already exists");
  }

  const countryCode = dto.countryCode.trim();
  const mobile = dto.mobile.trim();
  const phoneNumber = `${countryCode}${mobile}`;

  if (await this.usersService.existsByPhoneNumber(phoneNumber)) {
    throw new ConflictException("Mobile number already registered");
  }

  const user = await this.usersService.create({
    name: dto.name,
    email: dto.email,
    passwordHash: await hash(dto.password, 12),
    role: UserRole.Student,
    countryCode,
    mobile,
    phoneNumber,
  });

  return { user, accessToken: await this.sign(user) };
} 

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();
    const user = identifier.includes("@")
      ? await this.usersService.findByEmailWithPassword(identifier)
      : await this.usersService.findByPhoneNumberWithPassword(identifier);
    if (!user || !(await compare(dto.password, user.password))) {
      throw new UnauthorizedException("Invalid email/mobile or password");
    }
    const { password: _password, ...publicUser } = user;
    return { user: publicUser, accessToken: await this.sign(publicUser) };
  }

  private sign(user: { id: string; email: string; role: UserRole }): Promise<string> {
    return this.jwtService.signAsync({ sub: user.id, email: user.email, role: user.role });
  }
}
