import { z } from "zod";

export const enrichSessionSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  topicPlanned: z
    .string()
    .trim()
    .min(2, "Topic planned must be at least 2 characters")
    .max(1000, "Topic planned cannot exceed 1000 characters"),
  teachingMethod: z
    .string()
    .trim()
    .min(2, "Teaching method must be at least 2 characters")
    .max(255, "Teaching method cannot exceed 255 characters"),
  assignmentActivity: z
    .string()
    .trim()
    .max(500, "Assignment / Activity cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),
  syllabusTopicIds: z.array(z.string().uuid("Invalid syllabus topic ID")).optional().default([]),
});

export const weeklySummarySchema = z.object({
  teacherId: z.string().uuid("Invalid faculty ID"),
  batchId: z.string().uuid("Invalid batch ID"),
  subjectId: z.string().uuid("Invalid subject ID"),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Week start must be YYYY-MM-DD"),
  syllabusCoverage: z
    .string()
    .trim()
    .min(2, "Syllabus coverage is required (Section 1)"),
  practicalConducted: z.string().trim().optional().or(z.literal("")),
  assessmentConducted: z.string().trim().optional().or(z.literal("")),
  slowLearners: z.string().trim().optional().or(z.literal("")),
  remedialAction: z.string().trim().optional().or(z.literal("")),
  aiDigitalTools: z.string().trim().optional().or(z.literal("")),
  industryExamples: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["submitted", "verified"]).default("submitted"),
});

export type EnrichSessionInput = z.infer<typeof enrichSessionSchema>;
export type WeeklySummaryInput = z.infer<typeof weeklySummarySchema>;
