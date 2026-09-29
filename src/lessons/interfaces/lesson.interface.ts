export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  category: "Development" | "Design" | "Marketing" | "Business" | "AI";
  videoUrl: string;
  duration: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
