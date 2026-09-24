import {
  Controller,
  Get,
  Param,
  Req,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { RolesGuard } from "../common/guards/roles.guard";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { CertificatesService } from "./certificates.service";

@Controller("certificates")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Student)
export class CertificatesController {
  constructor(
    private readonly certificatesService:
      CertificatesService,
  ) {}

  @Get()
  findMine(
    @Req() request: {
      user: AuthenticatedUser;
    },
  ) {
    return this.certificatesService.findForStudent(
      request.user.id,
    );
  }

  @Get("course/:courseId")
  findMineForCourse(
    @Req() request: {
      user: AuthenticatedUser;
    },
    @Param("courseId") courseId: string,
  ) {
    return this.certificatesService.findForCourse(
      request.user.id,
      courseId,
    );
  }

  @Get(":certificateId/pdf")
  async downloadPdf(
    @Req() request: {
      user: AuthenticatedUser;
    },
    @Param("certificateId")
    certificateId: string,
  ) {
    const pdf =
      await this.certificatesService
        .generatePdfForStudent(
          request.user.id,
          certificateId,
        );

    return new StreamableFile(pdf.buffer, {
      type: "application/pdf",
      disposition:
        `attachment; filename="${pdf.fileName}"`,
      length: pdf.buffer.length,
    });
  }
}

@Controller("certificates")
export class CertificateVerificationController {
  constructor(
    private readonly certificatesService:
      CertificatesService,
  ) {}

  @Get("verify/:certificateNumber")
  verify(
    @Param("certificateNumber")
    certificateNumber: string,
  ) {
    return this.certificatesService.verify(
      certificateNumber,
    );
  }
}
