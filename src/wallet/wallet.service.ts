import { Injectable } from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  WalletTransaction,
  WalletTransactionDocument,
  WalletTransactionType,
} from "./schemas/wallet-transaction.schema";

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(WalletTransaction.name)
    private readonly walletTransactionModel:
      Model<WalletTransactionDocument>,
  ) {}

  async addCredit(
    userId: string,
    amount: number,
    reason: string,
    reference?: string,
  ) {
    if (reference) {
      return this.walletTransactionModel.findOneAndUpdate(
        {
          reference,
        },
        {
          $setOnInsert: {
            userId,
            amount,
            type: WalletTransactionType.Credit,
            reason,
            reference,
          },
        },
        {
          new: true,
          upsert: true,
        },
      );
    }

    return this.walletTransactionModel.create({
      userId,
      amount,
      type: WalletTransactionType.Credit,
      reason,
    });
  }

  async getTransactions(
    userId: string,
  ) {
    return this.walletTransactionModel
      .find({
        userId,
      })
      .sort({
        createdAt: -1,
      });
  }

  async getBalance(
    userId: string,
  ) {
    const transactions =
      await this.walletTransactionModel.find({
        userId,
      });

    return transactions.reduce(
      (balance, transaction) => {
        if (
          transaction.type ===
          WalletTransactionType.Credit
        ) {
          return balance + transaction.amount;
        }

        return balance - transaction.amount;
      },
      0,
    );
  }
}