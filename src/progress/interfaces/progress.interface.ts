export interface LessonProgress {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  completed: boolean;
  lastWatchedPosition: number;
  updatedAt: Date;
}
