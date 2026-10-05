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
  Query,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { RolesGuard } from "../common/guards/roles.guard";

import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";
import { CourseQueryDto } from "./dto/course-query.dto";
import { CoursesService } from "./courses.service";

  @Controller("courses")
  export class CoursesController {
    constructor(private readonly coursesService: CoursesService) {}

  @Get()
findAll(@Query() query: CourseQueryDto) {
  return this.coursesService.findAllPaginated(query);
}
    @Get(":id")
    findOne(@Param("id") id: string) { return this.coursesService.findOne(id); }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    create(@Body() dto: CreateCourseDto ) { return this.coursesService.create(dto); }

    @Patch(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    update(@Param("id") id: string, @Body() dto: UpdateCourseDto) { return this.coursesService.update(id, dto); }

    @Patch(":id/publish")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    publish(@Param("id") id: string) { return this.coursesService.publish(id); }

    @Delete(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param("id") id: string) { this.coursesService.remove(id); }
  }
