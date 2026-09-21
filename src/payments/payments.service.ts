import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import Stripe = require("stripe");

import { CoursesService } from "../courses/courses.service";
import { EnrollmentsService } from "../enrollments/enrollments.service";
import { ProgressService } from "../progress/progress.service";
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from "./schemas/payment.schema";

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly progressService: ProgressService,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {
    this.stripe = new Stripe(
      this.config.getOrThrow<string>("STRIPE_SECRET_KEY"),
    );
  }

  async createPayment(
    userId: string,
    courseId: string,
  ) {
    const course =
      await this.coursesService.getDocument(
        courseId,
      );

    if (course.price <= 0) {
      throw new BadRequestException(
        "This course is free and does not require payment",
      );
    }

    const amount = Number(course.price);
    const amountInMinorUnits =
      Math.round(amount * 100);

    const paymentIntent =
      await this.stripe.paymentIntents.create({
        amount: amountInMinorUnits,
        currency: "inr",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId,
          courseId,
        },
      });

    const payment =
      await this.paymentModel.create({
        userId,
        courseId,
        amount,
        currency: paymentIntent.currency,
        stripePaymentIntentId:
          paymentIntent.id,
        status: PaymentStatus.PENDING,
      });

    return {
      paymentId: payment._id,
      paymentIntentId:
        paymentIntent.id,
      clientSecret:
        paymentIntent.client_secret,
    };
  }

  async verifyPayment(
    userId: string,
    paymentIntentId: string,
  ) {
    const payment =
      await this.paymentModel.findOne({
        userId,
        stripePaymentIntentId:
          paymentIntentId,
      });

    if (!payment) {
      throw new NotFoundException(
        "Payment not found",
      );
    }

    if (
      payment.status ===
      PaymentStatus.REFUNDED
    ) {
      return {
        success: false,
        status: PaymentStatus.REFUNDED,
        payment,
      };
    }

    if (
      payment.status ===
      PaymentStatus.PARTIALLY_REFUNDED
    ) {
      return {
        success: true,
        status:
          PaymentStatus.PARTIALLY_REFUNDED,
        payment,
      };
    }

    if (
      payment.status ===
      PaymentStatus.SUCCESS
    ) {
      const enrollment =
        await this.enrollmentsService.enrollFromPayment(
          payment.userId,
          payment.courseId,
          paymentIntentId,
        );

      return {
        success: true,
        payment,
        enrollment,
      };
    }

    const paymentIntent =
      await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
      );

    this.assertIntentMatchesPayment(
      paymentIntent,
      payment,
    );

    if (
      paymentIntent.status !==
      "succeeded"
    ) {
      return {
        success: false,
        status: String(
          paymentIntent.status,
        ),
      };
    }

    payment.status =
      PaymentStatus.SUCCESS;

    payment.currency =
      paymentIntent.currency;

    payment.paidAt =
      payment.paidAt ??
      new Date();

    await payment.save();

    const enrollment =
      await this.enrollmentsService.enrollFromPayment(
        payment.userId,
        payment.courseId,
        paymentIntentId,
      );

    return {
      success: true,
      payment,
      enrollment,
    };
  }

  async handleWebhook(
    rawBody: Buffer,
    signature: string,
  ) {
    const webhookSecret =
      this.config.getOrThrow<string>(
        "STRIPE_WEBHOOK_SECRET",
      );

    let event: Stripe.Event;

    try {
      event =
        this.stripe.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret,
        );
    } catch {
      throw new BadRequestException(
        "Invalid Stripe webhook signature",
      );
    }

    if (
      event.type ===
      "payment_intent.succeeded"
    ) {
      await this.completePaymentFromIntent(
        event.data.object,
      );
    }

    if (
      event.type ===
      "payment_intent.payment_failed"
    ) {
      await this.paymentModel.findOneAndUpdate(
        {
          stripePaymentIntentId:
            event.data.object.id,
        },
        {
          status:
            PaymentStatus.FAILED,
        },
      );
    }

    return {
      received: true,
    };
  }

  async getRevenue() {
    const payments =
      await this.paymentModel
        .find({
          status: {
            $in: [
              PaymentStatus.SUCCESS,
              PaymentStatus.PARTIALLY_REFUNDED,
            ],
          },
        })
        .sort({
          paidAt: -1,
        })
        .lean();

    const totalRevenue =
      payments.reduce(
        (sum, payment) => {
          const netAmount =
            Number(payment.amount) -
            Number(
              payment.refundedAmount ??
                0,
            );

          return (
            sum +
            Math.max(
              0,
              netAmount,
            )
          );
        },
        0,
      );

    const totalPayments =
      payments.length;

    const courseRevenueMap =
      new Map<
        string,
        {
          totalRevenue: number;
          totalPayments: number;
        }
      >();

    payments.forEach(
      (payment) => {
        const courseId =
          String(
            payment.courseId,
          );

        const netAmount =
          Number(payment.amount) -
          Number(
            payment.refundedAmount ??
              0,
          );

        const current =
          courseRevenueMap.get(
            courseId,
          ) ?? {
            totalRevenue: 0,
            totalPayments: 0,
          };

        current.totalRevenue +=
          Math.max(
            0,
            netAmount,
          );

        current.totalPayments += 1;

        courseRevenueMap.set(
          courseId,
          current,
        );
      },
    );

    const byCourse =
      Array.from(
        courseRevenueMap.entries(),
      ).map(
        ([
          courseId,
          revenue,
        ]) => ({
          courseId,
          totalRevenue:
            revenue.totalRevenue,
          totalPayments:
            revenue.totalPayments,
        }),
      );

    return {
      totalRevenue,
      totalPayments,
      currency: "inr",
      byCourse,
    };
  }

  async getPayments() {
    return this.paymentModel
      .find()
      .sort({
        paidAt: -1,
        createdAt: -1,
      })
      .lean();
  }

  async refundPayment(
    paymentId: string,
    amount?: number,
  ) {
    const payment =
      await this.paymentModel.findById(
        paymentId,
      );

    if (!payment) {
      throw new NotFoundException(
        "Payment not found",
      );
    }

    if (
      payment.status !==
        PaymentStatus.SUCCESS &&
      payment.status !==
        PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException(
        "Only successful payments can be refunded",
      );
    }

    if (
      !payment.stripePaymentIntentId
    ) {
      throw new BadRequestException(
        "Stripe payment intent is missing",
      );
    }

    const paymentIntentId =
      payment.stripePaymentIntentId;

    const alreadyRefunded =
      Number(
        payment.refundedAmount ??
          0,
      );

    const remainingAmount =
      Number(payment.amount) -
      alreadyRefunded;

    if (
      remainingAmount <= 0
    ) {
      throw new BadRequestException(
        "Payment has already been fully refunded",
      );
    }

    const refundAmount =
      amount === undefined
        ? remainingAmount
        : Number(amount);

    if (
      !Number.isFinite(
        refundAmount,
      ) ||
      refundAmount <= 0
    ) {
      throw new BadRequestException(
        "Refund amount must be greater than zero",
      );
    }

    if (
      refundAmount >
      remainingAmount
    ) {
      throw new BadRequestException(
        "Refund amount cannot exceed the remaining payment amount",
      );
    }

    const refundAmountInMinorUnits =
      Math.round(
        refundAmount * 100,
      );

    const refund =
      await this.stripe.refunds.create(
        {
          payment_intent:
            paymentIntentId,

          amount:
            refundAmountInMinorUnits,

          metadata: {
            paymentId:
              String(
                payment._id,
              ),
            userId:
              payment.userId,
            courseId:
              payment.courseId,
          },
        },
        {
          idempotencyKey:
            `refund-${String(
              payment._id,
            )}-${alreadyRefunded}-${refundAmountInMinorUnits}`,
        },
      );

    if (
      refund.status !==
      "succeeded"
    ) {
      return {
        success: false,
        refundId:
          refund.id,
        status:
          refund.status,
      };
    }

    const refundedNow =
      refund.amount / 100;

    const totalRefunded =
      Math.min(
        Number(
          payment.amount,
        ),
        alreadyRefunded +
          refundedNow,
      );

    payment.refundedAmount =
      totalRefunded;

    payment.refundedAt =
      new Date();

    payment.status =
      totalRefunded >=
      Number(payment.amount)
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    await payment.save();

    if (
      payment.status ===
      PaymentStatus.REFUNDED
    ) {
      await this.enrollmentsService.revokeFromRefund(
        payment.userId,
        payment.courseId,
        paymentIntentId,
      );

      await this.progressService.resetForCourse(
        payment.userId,
        payment.courseId,
      );
    }

    return {
      success: true,
      refundId:
        refund.id,
      refundedAmount:
        totalRefunded,
      remainingAmount:
        Math.max(
          0,
          Number(
            payment.amount,
          ) -
            totalRefunded,
        ),
      status:
        payment.status,
      payment,
    };
  }

  private async completePaymentFromIntent(
    paymentIntent:
      Stripe.PaymentIntent,
  ) {
    const payment =
      await this.paymentModel.findOne({
        stripePaymentIntentId:
          paymentIntent.id,
      });

    if (!payment) {
      return;
    }

    if (
      payment.status ===
        PaymentStatus.REFUNDED ||
      payment.status ===
        PaymentStatus.PARTIALLY_REFUNDED
    ) {
      return;
    }

    this.assertIntentMatchesPayment(
      paymentIntent,
      payment,
    );

    if (
      payment.status !==
      PaymentStatus.SUCCESS
    ) {
      payment.status =
        PaymentStatus.SUCCESS;

      payment.currency =
        paymentIntent.currency;

      payment.paidAt =
        payment.paidAt ??
        new Date();

      await payment.save();
    }

    await this.enrollmentsService.enrollFromPayment(
      payment.userId,
      payment.courseId,
      paymentIntent.id,
    );
  }

  private assertIntentMatchesPayment(
    paymentIntent:
      Stripe.PaymentIntent,
    payment:
      PaymentDocument,
  ) {
    const expectedAmount =
      Math.round(
        payment.amount * 100,
      );

    if (
      paymentIntent.amount !==
        expectedAmount ||
      paymentIntent.currency.toLowerCase() !==
        "inr" ||
      paymentIntent.metadata.userId !==
        payment.userId ||
      paymentIntent.metadata.courseId !==
        payment.courseId
    ) {
      throw new BadRequestException(
        "Payment details do not match the order",
      );
    }
  }
}