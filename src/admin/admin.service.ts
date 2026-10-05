import { Injectable } from "@nestjs/common";

import { CoursesService } from "../courses/courses.service";
import { EnrollmentsService } from "../enrollments/enrollments.service";
import { LessonsService } from "../lessons/lessons.service";
import { ProgressService } from "../progress/progress.service";
import { UsersService } from "../users/users.service";

import { PaymentsService } from "../payments/payments.service";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";

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

lessons,

payments,

]= await Promise.all([


this.usersService.findAll(),


this.coursesService.findAll({
  includeDrafts:true,
}),


this.enrollmentsService.findAll(),


this.progressService.findAll(),


this.paymentsService.getRevenue(),


this.lessonsService.findAll(),


this.paymentsService.getPayments(),


]);



return {


users,


courses,


enrollments,


progress,


lessons,


revenue,


payments,


};


}



async users(query: PaginationQueryDto) {
  return this.usersService.findAllPaginated(query);
}

async courses(){

return this.coursesService.findAll({
includeDrafts:true,
});

}



async enrollments(query: PaginationQueryDto) {
  return this.enrollmentsService.findAllPaginated(query);
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
async payments(query: PaginationQueryDto) {
  return this.paymentsService.getPaymentsPaginated(query);
}
}
