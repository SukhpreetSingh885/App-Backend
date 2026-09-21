export enum EnrollmentStatus {
  Active = "active",
  Completed = "completed",
  Cancelled = "cancelled",
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrollmentDate: Date;
  status: EnrollmentStatus;
}
