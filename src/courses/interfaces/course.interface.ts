export enum CourseStatus {
  Draft = "draft",
  Published = "published",
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  category: string;
  price?: number;
  originalPrice?: number;
  instructor: string;
  duration?: string;
  featured: boolean;
  status: CourseStatus;
  createdAt: Date;
  updatedAt: Date;
}
