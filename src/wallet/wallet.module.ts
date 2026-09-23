import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { WalletService } from "./wallet.service";
import { WalletController } from "./wallet.controller";

import {
  WalletTransaction,
  WalletTransactionSchema,
} from "./schemas/wallet-transaction.schema";


@Module({

  imports: [

    MongooseModule.forFeature([
      {
        name: WalletTransaction.name,
        schema: WalletTransactionSchema,
      },
    ]),

  ],


  controllers: [
    WalletController,
  ],


  providers: [
    WalletService,
  ],


  exports: [
    WalletService,
  ],

})
export class WalletModule {}