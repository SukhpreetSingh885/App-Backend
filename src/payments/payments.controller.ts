import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { VerifyPaymentDto } from "./dto/verify-payment.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createPayment(
    @Req() request: { user: AuthenticatedUser },
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(
      request.user.id,
      dto.courseId,
    );
  }

  @Post("verify")
  @UseGuards(JwtAuthGuard)
  verifyPayment(
    @Req() request: { user: AuthenticatedUser },
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(
      request.user.id,
      dto.paymentIntentId,
    );
  }

  @Post("webhook")
  webhook(
    @Req() request: { rawBody?: Buffer },
    @Headers("stripe-signature") signature?: string,
  ) {
    if (!request.rawBody || !signature) {
      throw new BadRequestException("Invalid Stripe webhook request");
    }

    return this.paymentsService.handleWebhook(request.rawBody, signature);
  }
}
