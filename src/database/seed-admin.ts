import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";

import { User } from "../users/schemas/user.schema";
import { UserRole } from "../common/enums/user-role.enum";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userModel = app.get<Model<User>>(
    getModelToken(User.name),
  );
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  throw new Error("Admin credentials missing in .env");
} 
  const existing = await userModel.findOne({ email });

  if (existing) {
    console.log("Admin already exists");
    await app.close();
    return;
  }

 const hashedPassword = await bcrypt.hash(
  password!,
  12,
);

  await userModel.create({
    name: "Viralstan Admin",
    email,
    password: hashedPassword,
    role: UserRole.Admin,
  });

  console.log("Admin created successfully");

  await app.close();
}

bootstrap();