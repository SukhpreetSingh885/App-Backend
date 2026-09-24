import { Injectable } from "@nestjs/common";

import { CoursesService } from "../courses/courses.service";
import { EnrollmentsService } from "../enrollments/enrollments.service";
import { LessonsService } from "../lessons/lessons.service";
import { ProgressService } from "../progress/progress.service";
import { UsersService } from "../users/users.service";

import { PaymentsService } from "../payments/payments.service";


@Injectable()
export class AdminService {


constructor(

  private readonly usersService: UsersService,

  private readonly coursesService: CoursesService,

  private readonly enrollmentsService: EnrollmentsService,

  private readonly lessonsService: LessonsService,

  private readonly progressService: ProgressService,

  private readonly paymentsService: PaymentsService,

){}





async dashboard(){


const [

users,

courses,

enrollments,

progress,

revenue,

]= await Promise.all([


this.usersService.findAll(),


this.coursesService.findAll({
  includeDrafts:true,
}),


this.enrollmentsService.findAll(),


this.progressService.findAll(),


this.paymentsService.getRevenue(),


]);



return {


users:
users.length,


courses:
courses.length,


enrollments:
enrollments.length,


revenue,


completedLessons:
progress.filter(
({completed})=>completed,
).length,


};


}





async users(){

return this.usersService.findAll();

}



async courses(){

return this.coursesService.findAll({
includeDrafts:true,
});

}



async enrollments(){

return this.enrollmentsService.findAll();

}



async progress(){

return this.progressService.findAll();

}



async lessons(){

return this.lessonsService.findAll();

}

async revenue() {
  return this.paymentsService.getRevenue();
}
async payments() {
  return this.paymentsService.getPayments();
}
}
