import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { UpdateProgressDto } from "./dto/update-progress.dto";
import { ProgressService } from "./progress.service";

@Controller("progress")
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get("me")
  findMine(@Req() request: { user: AuthenticatedUser }) { return this.progressService.findForUser(request.user.id); }

  @Get("me/course/:courseId")
  findMineForCourse(@Req() request: { user: AuthenticatedUser }, @Param("courseId") courseId: string) {
    return this.progressService.findForUser(request.user.id, courseId);
  }

  @Patch(":courseId/:lessonId")
  update(@Req() request: { user: AuthenticatedUser }, @Param("courseId") courseId: string, @Param("lessonId") lessonId: string, @Body() dto: UpdateProgressDto) {
    return this.progressService.update(request.user.id, courseId, lessonId, dto);
  }

  @Post(":courseId/:lessonId/complete")
  complete(@Req() request: { user: AuthenticatedUser }, @Param("courseId") courseId: string, @Param("lessonId") lessonId: string) {
    return this.progressService.complete(request.user.id, courseId, lessonId);
  }
}
