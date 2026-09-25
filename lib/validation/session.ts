import { z } from "zod";
import { isWithinCRDateLimit } from "@/lib/dates";

export const createSessionSchema = z
  .object({
    batchId: z.string().uuid("Invalid batch ID"),
    subjectId: z.string().uuid("Please select a valid subject"),
    teacherId: z.string().uuid("Assigned faculty is required"),
    sessionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .refine(
        (val) => isWithinCRDateLimit(val),
        "Date cannot be in the future or older than 2 days."
      ),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must be HH:MM format"),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must be HH:MM format"),
    studentsPresent: z.coerce
      .number()
      .int("Student count must be an integer")
      .min(0, "Student count cannot be negative"),
    topicCovered: z
      .string()
      .trim()
      .min(3, "Please enter at least 3 characters describing the topic covered")
      .max(1000, "Topic description is too long (max 1000 characters)"),
  })
  .refine(
    (data) => data.endTime > data.startTime,
    {
      message: "Class end time must be after start time.",
      path: ["endTime"],
    }
  );

export const updateSessionSchema = z
  .object({
    sessionId: z.string().uuid("Invalid session ID"),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must be HH:MM format"),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must be HH:MM format"),
    studentsPresent: z.coerce
      .number()
      .int("Student count must be an integer")
      .min(0, "Student count cannot be negative"),
    topicCovered: z
      .string()
      .trim()
      .min(3, "Please enter at least 3 characters describing the topic covered")
      .max(1000, "Topic description is too long (max 1000 characters)"),
  })
  .refine(
    (data) => data.endTime > data.startTime,
    {
      message: "Class end time must be after start time.",
      path: ["endTime"],
    }
  );

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
