import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";

import { Request, Response } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";


@Injectable()
export class RequestLoggingInterceptor
  implements NestInterceptor
{

  private readonly logger =
    new Logger(
      RequestLoggingInterceptor.name,
    );


  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {

    const request =
      context
        .switchToHttp()
        .getRequest<Request>();


    const response =
      context
        .switchToHttp()
        .getResponse<Response>();


    const startTime =
      Date.now();


    // User information (available after authentication)
    const user =
      (request as any).user;


    return next.handle().pipe(

      tap({

        next: () => {

          const duration =
            Date.now() - startTime;


          this.logger.log(
            JSON.stringify({

              type:
                "HTTP_REQUEST",

              timestamp:
                new Date().toISOString(),

              userId:
                user?.id ?? null,

              method:
                request.method,

              url:
                request.originalUrl,

              query:
                request.query,

              statusCode:
                response.statusCode,

              duration:
                `${duration}ms`,

              ip:
                request.ip,

              userAgent:
                request.headers["user-agent"],

            }),
          );

        },


        error: (error) => {

          const duration =
            Date.now() - startTime;


          this.logger.error(
            JSON.stringify({

              type:
                "HTTP_ERROR",

              timestamp:
                new Date().toISOString(),

              userId:
                user?.id ?? null,

              method:
                request.method,

              url:
                request.originalUrl,

              query:
                request.query,

              statusCode:
                error.status ?? 500,

              message:
                error.message ??
                "Unknown error",

              duration:
                `${duration}ms`,

              ip:
                request.ip,

              userAgent:
                request.headers["user-agent"],

            }),
          );

        },

      }),

    );

  }

}