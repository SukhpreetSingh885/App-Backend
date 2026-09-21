import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { RolesGuard } from "../common/guards/roles.guard";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { ChangeVideoDto } from "./dto/change-video.dto";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";
import { LessonsService } from "./lessons.service";

@Controller("lessons")
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get("course/:courseId")
  @UseGuards(JwtAuthGuard)
  findByCourse(
    @Req() request: { user: AuthenticatedUser },
    @Param("courseId") courseId: string,
  ) {
    return this.lessonsService.findByCourse(
      courseId,
      request.user.id,
      request.user.role,
    );
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  findOne(
    @Req() request: { user: AuthenticatedUser },
    @Param("id") id: string,
  ) {
    return this.lessonsService.findOneForUser(
      id,
      request.user.id,
      request.user.role,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  create(@Body() dto: CreateLessonDto) {
    return this.lessonsService.create(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  update(@Param("id") id: string, @Body() dto: UpdateLessonDto) {
    return this.lessonsService.update(id, dto);
  }

  @Patch(":id/video")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  changeVideo(@Param("id") id: string, @Body() dto: ChangeVideoDto) {
    return this.lessonsService.changeVideo(id, dto.videoUrl);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.lessonsService.remove(id);
  }
}
