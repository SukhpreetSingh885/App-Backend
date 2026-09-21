import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { CreateEnrollmentDto } from "./dto/create-enrollment.dto";
import { EnrollmentsService } from "./enrollments.service";

@Controller("enrollments")
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  enrollFree(
    @Req() request: { user: AuthenticatedUser },
    @Body() dto: CreateEnrollmentDto,
  ) {
    return this.enrollmentsService.enrollFree(request.user.id, dto.courseId);
  }

  @Get("me")
  findMine(@Req() request: { user: AuthenticatedUser }) {
    return this.enrollmentsService.findForUser(request.user.id);
  }
}
