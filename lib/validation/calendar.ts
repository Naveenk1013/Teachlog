import { z } from "zod";

export const academicEventSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters")
      .max(150, "Title is too long (max 150 characters)"),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    eventType: z.enum(["holiday", "vacation", "exam", "event", "academic_note"]),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
    isHoliday: z.boolean().default(true),
    batchId: z.string().uuid().nullable().optional(),
    teacherId: z.string().uuid().nullable().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date.",
    path: ["endDate"],
  });

export type AcademicEventInput = z.infer<typeof academicEventSchema>;
