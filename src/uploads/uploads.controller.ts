import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { AdminGuard } from "../admin/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UploadsService } from "./uploads.service";

type UploadFile = {
  buffer: Buffer;
};

@Controller("admin/uploads")
@UseGuards(JwtAuthGuard, AdminGuard)
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
  ) {}

  @Post("image")
  @UseInterceptors(FileInterceptor("file"))
  uploadImage(
    @UploadedFile() file: UploadFile,
  ) {
    return this.uploadsService.uploadImage(file);
  }

  @Post("video")
  @UseInterceptors(FileInterceptor("file"))
  uploadVideo(
    @UploadedFile() file: UploadFile,
  ) {
    return this.uploadsService.uploadVideo(file);
  }
}