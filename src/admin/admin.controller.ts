import {
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "./guards/admin.guard";
import { AdminService } from "./admin.service";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  dashboard() { return this.adminService.dashboard(); }

 @Get("users")
users(@Query() query: PaginationQueryDto) {
  return this.adminService.users(query);
}

  @Get("courses")
  courses() { return this.adminService.courses(); }

@Get("enrollments")
enrollments(@Query() query: PaginationQueryDto) {
  return this.adminService.enrollments(query);
}

  @Get("progress")
  progress() { return this.adminService.progress(); }

  @Get("lessons")
  lessons() { return this.adminService.lessons(); }
  @Get("revenue")
revenue() {
  return this.adminService.revenue();
}
@Get("payments")
payments(@Query() query: PaginationQueryDto) {
  return this.adminService.payments(query);
}
}
