import { Injectable } from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model } from "mongoose";

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
    session?: ClientSession,
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
          session,
        },
      );
    }

    if (session) {
      const [transaction] =
        await this.walletTransactionModel.create(
          [{
            userId,
            amount,
            type: WalletTransactionType.Credit,
            reason,
          }],
          { session },
        );

      return transaction;
    }

    return this.walletTransactionModel.create({
      userId,
      amount,
      type: WalletTransactionType.Credit,
      reason,
    });
  }

  async addDebit(
    userId: string,
    amount: number,
    reason: string,
    reference: string,
    session: ClientSession,
  ) {
    return this.walletTransactionModel.findOneAndUpdate(
      { reference },
      {
        $setOnInsert: {
          userId,
          amount,
          type: WalletTransactionType.Debit,
          reason,
          reference,
        },
      },
      {
        new: true,
        upsert: true,
        session,
      },
    );
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
    session?: ClientSession,
  ) {
    const query = this.walletTransactionModel.find({
      userId,
    });

    if (session) {
      query.session(session);
    }

    const transactions = await query.lean();

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
