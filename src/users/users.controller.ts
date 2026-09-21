import { Body, Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { RolesGuard } from "../common/guards/roles.guard";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getProfile(@Req() request: { user: AuthenticatedUser }) {
    return this.usersService.findById(request.user.id);
  }

  @Patch("me")
  updateProfile(
    @Req() request: { user: AuthenticatedUser },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(request.user.id, dto);
  }

  @Get(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  findOne(@Param("id") id: string) {
    return this.usersService.findById(id);
  }
}
