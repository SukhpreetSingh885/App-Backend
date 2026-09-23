import {
  Controller,
  Get,
  Request,
  UseGuards,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WalletService } from "./wallet.service";

type AuthenticatedRequest = ExpressRequest & {
  user: {
    id: string;
  };
};

@Controller("wallet")
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
  ) {}

  @Get("transactions")
  getTransactions(
    @Request() req: AuthenticatedRequest,
  ) {
    return this.walletService.getTransactions(
      req.user.id,
    );
  }
  @Get("balance")
async getBalance(
  @Request() req: AuthenticatedRequest,
) {
  const balance =
    await this.walletService.getBalance(
      req.user.id,
    );

  return {
    balance,
  };
}
}