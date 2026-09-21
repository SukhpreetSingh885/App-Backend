import { IsUrl } from "class-validator";

export class ChangeVideoDto {
  @IsUrl({ require_tld: false }) videoUrl!: string;
}
