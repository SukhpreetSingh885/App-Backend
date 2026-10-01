import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
  Error as MongooseError,
} from "mongoose";
@Catch()
export class HttpExceptionFilter
  implements ExceptionFilter
{
  catch(
    exception: unknown,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();

    const response =
      ctx.getResponse<Response>();

    const request =
      ctx.getRequest<Request>();

    let statusCode =
      HttpStatus.INTERNAL_SERVER_ERROR;

    let message =
      "Internal server error";

    if (exception instanceof HttpException) {
      statusCode =
        exception.getStatus();

      const errorResponse =
        exception.getResponse();

      if (
        typeof errorResponse === "string"
      ) {
        message = errorResponse;
      } else if (
        typeof errorResponse === "object" &&
        errorResponse !== null &&
        "message" in errorResponse
      ) {
        message =
          (errorResponse as {
            message: string;
          }).message;
      }
    }
else if (
  exception instanceof MongooseError.ValidationError
) {
  statusCode = HttpStatus.BAD_REQUEST;

  message = Object.values(
    exception.errors,
  )
    .map((error) => error.message)
    .join(", ");
}

else if (
  exception instanceof MongooseError.CastError
) {
  statusCode = HttpStatus.BAD_REQUEST;

  message = "Invalid ID format";
}

else if (
  (exception as any).code === 11000
) {
  statusCode = HttpStatus.CONFLICT;

  message = "Data already exists";
}
    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      path: request.url,
      timestamp:
        new Date().toISOString(),
    });
  }
}