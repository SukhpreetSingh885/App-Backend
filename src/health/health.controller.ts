import {
  CACHE_MANAGER,
} from "@nestjs/cache-manager";
import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from "@nestjs/terminus";
import { Cache } from "cache-manager";

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.mongoose.pingCheck("mongodb"),

      async () => {
        try {
          const key = "health:redis";
          await this.cacheManager.set(key, "ok", 5000);

          const value =
            await this.cacheManager.get<string>(key);

          if (value !== "ok") {
            throw new Error("Redis health check failed");
          }

          return {
            redis: {
              status: "up",
            },
          };
        } catch {
          throw new ServiceUnavailableException(
            "Redis health check failed",
          );
        }
      },
    ]);
  }
}