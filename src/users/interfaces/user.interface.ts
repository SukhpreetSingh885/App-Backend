import { UserRole } from "../../common/enums/user-role.enum";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  countryCode?: string;
  mobile?: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicUser = Omit<User, "password">;
