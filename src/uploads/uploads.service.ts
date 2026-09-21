import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  UploadApiResponse,
  v2 as cloudinary,
} from "cloudinary";

type UploadFile = {
  buffer: Buffer;
};

type CloudinaryError = {
  message?: string;
  name?: string;
  http_code?: number;
};

@Injectable()
export class UploadsService {
  private readonly logger =
    new Logger(UploadsService.name);

  constructor(
    private readonly config: ConfigService,
  ) {
    cloudinary.config({
      cloud_name:
        this.config.getOrThrow<string>(
          "CLOUDINARY_CLOUD_NAME",
        ),
      api_key:
        this.config.getOrThrow<string>(
          "CLOUDINARY_API_KEY",
        ),
      api_secret:
        this.config.getOrThrow<string>(
          "CLOUDINARY_API_SECRET",
        ),
    });
  }

  async uploadImage(
    file: UploadFile,
  ) {
    if (!file) {
      throw new BadRequestException(
        "Image file is required",
      );
    }

    const result =
      await this.uploadBuffer(
        file.buffer,
        "viralstan-academy/thumbnails",
        "image",
      );

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  async uploadVideo(
    file: UploadFile,
  ) {
    if (!file) {
      throw new BadRequestException(
        "Video file is required",
      );
    }

    const result =
      await this.uploadBuffer(
        file.buffer,
        "viralstan-academy/videos",
        "video",
      );

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  private uploadBuffer(
    buffer: Buffer,
    folder: string,
    resourceType: "image" | "video",
  ): Promise<UploadApiResponse> {
    return new Promise(
      (resolve, reject) => {
        const stream =
          cloudinary.uploader.upload_stream(
            {
              folder,
              resource_type:
                resourceType,
            },
            (error, result) => {
              if (error) {
                const cloudinaryError =
                  error as CloudinaryError;

                this.logger.error(
                  `Cloudinary upload failed: ${cloudinaryError.message ?? "Unknown error"} | status: ${cloudinaryError.http_code ?? "unknown"} | name: ${cloudinaryError.name ?? "unknown"}`,
                );

                reject(error);
                return;
              }

              if (!result) {
                this.logger.error(
                  "Cloudinary upload returned no result",
                );

                reject(
                  new Error(
                    "Upload failed",
                  ),
                );

                return;
              }

              resolve(result);
            },
          );

        stream.on(
          "error",
          (error: CloudinaryError) => {
            this.logger.error(
              `Cloudinary stream error: ${error.message ?? "Unknown error"} | status: ${error.http_code ?? "unknown"} | name: ${error.name ?? "unknown"}`,
            );
          },
        );

        stream.end(buffer);
      },
    );
  }
}