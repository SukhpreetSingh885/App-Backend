import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

import { UserRole } from "../../common/enums/user-role.enum";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (request.user?.role !== UserRole.Admin) throw new ForbiddenException("Admin access required");
    return true;
  }
}
