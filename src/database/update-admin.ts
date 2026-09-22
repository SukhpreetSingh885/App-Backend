import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { User } from "../users/schemas/user.schema";
import { UserRole } from "../common/enums/user-role.enum";


async function bootstrap() {

  const app =
    await NestFactory.createApplicationContext(
      AppModule,
    );


  const userModel =
    app.get<Model<User>>(
      getModelToken(User.name),
    );


  const admin =
    await userModel.findOne({
      role: UserRole.Admin,
    });


  if (!admin) {
    throw new Error(
      "Admin user not found",
    );
  }


  admin.email =
    process.env.ADMIN_EMAIL!;


  await admin.save();


  console.log(
    "Admin email updated:",
    admin.email,
  );


  await app.close();
}


bootstrap();