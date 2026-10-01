import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ValidationPipe,BadRequestException } from "@nestjs/common";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    { rawBody: true },
  );
app.useGlobalFilters(
  new HttpExceptionFilter(),
);
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS ?? "0");

  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 1) {
    throw new Error("TRUST_PROXY_HOPS must be 0 or 1");
  }

  app.set("trust proxy", proxyHops);

  // Helmet security headers
  app.use(helmet());

  // Global API prefix
  app.setGlobalPrefix("api");

  // CORS configuration
  const allowedOrigins = (
    process.env.CORS_ORIGINS ??
    "http://localhost:5173,http://localhost:8081"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"), false);
    },
    credentials: true,
  });

  // Global request validation
  app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,

    exceptionFactory: (errors) => {
      return new BadRequestException(
        errors
          .map(
            (error) =>
              Object.values(
                error.constraints ?? {},
              ),
          )
          .flat(),
      );
    },
  }),
);
app.useGlobalInterceptors(
  new RequestLoggingInterceptor(),
);
  // Start backend server
  await app.listen(process.env.PORT ?? 3000, "0.0.0.0");
}

void bootstrap();
