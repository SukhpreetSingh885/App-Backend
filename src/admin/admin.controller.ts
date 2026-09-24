import {
  Controller,
  Get,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "./guards/admin.guard";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  dashboard() { return this.adminService.dashboard(); }

  @Get("users")
  users() { return this.adminService.users(); }

  @Get("courses")
  courses() { return this.adminService.courses(); }

  @Get("enrollments")
  enrollments() { return this.adminService.enrollments(); }

  @Get("progress")
  progress() { return this.adminService.progress(); }

  @Get("lessons")
  lessons() { return this.adminService.lessons(); }
  @Get("revenue")
revenue() {
  return this.adminService.revenue();
}
@Get("payments")
payments() {
  return this.adminService.payments();
}
}
