import {
  Document,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer,
  HeadingLevel,
  ShadingType,
} from "docx";
import { format } from "date-fns";
import { CohortAttendanceOverviewResult } from "@/lib/data/attendance";

const PRIMARY_COLOR = "1e3a8a"; // Navy Blue
const HEADER_BG = "f1f5f9";    // Slate 100
const GREEN_COLOR = "047857";  // Emerald 700
const RED_COLOR = "b91c1c";    // Red 700
const AMBER_COLOR = "b45309";  // Amber 700

/**
 * Builds a professional Microsoft Word (.docx) Attendance Report
 */
export async function buildAttendanceReportDocx(
  data: CohortAttendanceOverviewResult,
  generatedByName?: string
): Promise<Buffer> {
  const generatedDateStr = format(new Date(), "dd MMMM yyyy, HH:mm");

  const eligibleCount = data.students.filter((s) => s.percentage >= 75).length;
  const shortageCount = data.students.filter((s) => s.percentage < 75).length;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: [
          // 1. Institution Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "INTERNATIONAL INSTITUTE OF HOTEL MANAGEMENT",
                bold: true,
                size: 26,
                color: PRIMARY_COLOR,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "HYDERABAD CAMPUS • ACADEMIC MONITORING SYSTEM",
                bold: true,
                size: 18,
                color: "475569",
                font: "Calibri",
              }),
            ],
          }),

          // Report Title Box
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: "STUDENT ATTENDANCE & EXAMINATION ELIGIBILITY REPORT",
                bold: true,
                size: 22,
                color: "0f172a",
                underline: {},
                font: "Calibri",
              }),
            ],
          }),

          // 2. Metadata Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "e2e8f0" },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: "Cohort / Batch:", bold: true, size: 18, font: "Calibri" })] })],
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: data.batchName, size: 18, font: "Calibri" })] })],
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: "Type:", bold: true, size: 18, font: "Calibri" })] })],
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: data.isPractical ? `Practical Lab (${data.group})` : "Theory Section",
                            bold: true,
                            color: data.isPractical ? AMBER_COLOR : PRIMARY_COLOR,
                            size: 18,
                            font: "Calibri",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Total Classes Held:", bold: true, size: 18, font: "Calibri" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `${data.totalSessionsHeld} Sessions`, size: 18, font: "Calibri" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Total Students:", bold: true, size: 18, font: "Calibri" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `${data.students.length} Enrolled`, size: 18, font: "Calibri" })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Average Attendance:", bold: true, size: 18, font: "Calibri" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `${data.averageAttendancePct}%`, bold: true, color: GREEN_COLOR, size: 18, font: "Calibri" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Generated On:", bold: true, size: 18, font: "Calibri" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: generatedDateStr, size: 16, font: "Calibri" })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Eligible Students (≥75%):", bold: true, size: 18, font: "Calibri" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `${eligibleCount} Students`, bold: true, color: GREEN_COLOR, size: 18, font: "Calibri" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Shortage Alerts (<75%):", bold: true, size: 18, font: "Calibri" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `${shortageCount} Students`, bold: true, color: RED_COLOR, size: 18, font: "Calibri" })] })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 200 } }),

          // 3. Section Heading: Student Roll Roster
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 100, after: 100 },
            children: [
              new TextRun({
                text: "Student Roster & Attendance Performance Register",
                bold: true,
                size: 20,
                color: PRIMARY_COLOR,
                font: "Calibri",
              }),
            ],
          }),

          // 4. Student Roster Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "0f172a" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "0f172a" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "e2e8f0" },
              insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "e2e8f0" },
            },
            rows: [
              // Table Header Row
              new TableRow({
                tableHeader: true,
                children: [
                  createHeaderCell("#", 5),
                  createHeaderCell("Roll Number", 20),
                  createHeaderCell("Student Name", 33),
                  createHeaderCell("Group", 10),
                  createHeaderCell("Held", 8),
                  createHeaderCell("Attended", 8),
                  createHeaderCell("Rate %", 8),
                  createHeaderCell("Eligibility", 8),
                ],
              }),
              // Table Data Rows
              ...data.students.map((student, idx) => {
                const isShortage = student.percentage < 75;
                const statusColor = student.percentage >= 75 ? GREEN_COLOR : student.percentage >= 65 ? AMBER_COLOR : RED_COLOR;
                const statusText = student.percentage >= 75 ? "ELIGIBLE" : "SHORTAGE";

                return new TableRow({
                  children: [
                    createDataCell(String(idx + 1), 5, AlignmentType.CENTER),
                    createDataCell(student.rollNumber, 20, AlignmentType.LEFT, true),
                    createDataCell(student.fullName, 33, AlignmentType.LEFT),
                    createDataCell(student.practicalGroup ? `Lab ${student.practicalGroup}` : student.section, 10, AlignmentType.CENTER),
                    createDataCell(String(student.totalClasses), 8, AlignmentType.CENTER),
                    createDataCell(String(student.attendedClasses), 8, AlignmentType.CENTER, true),
                    createDataCell(`${student.percentage}%`, 8, AlignmentType.CENTER, true, statusColor),
                    createDataCell(statusText, 8, AlignmentType.CENTER, true, statusColor),
                  ],
                });
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 360 } }),

          // 5. Signatures Block
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "_______________________", color: "94a3b8" })] }),
                      new Paragraph({ children: [new TextRun({ text: "Class Representative", bold: true, size: 16, font: "Calibri" })] }),
                      new Paragraph({ children: [new TextRun({ text: "Student Signature", size: 14, color: "64748b", font: "Calibri" })] }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "_______________________", color: "94a3b8" })] }),
                      new Paragraph({ children: [new TextRun({ text: "Course Faculty / Tutor", bold: true, size: 16, font: "Calibri" })] }),
                      new Paragraph({ children: [new TextRun({ text: generatedByName || "Faculty Signature", size: 14, color: "64748b", font: "Calibri" })] }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 34, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "_______________________", color: "94a3b8" })] }),
                      new Paragraph({ children: [new TextRun({ text: "Academic Head / Principal", bold: true, size: 16, font: "Calibri" })] }),
                      new Paragraph({ children: [new TextRun({ text: "IIHM Hyderabad", size: 14, color: "64748b", font: "Calibri" })] }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

function createHeaderCell(text: string, widthPct: number) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: HEADER_BG },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: true,
            size: 16,
            color: "0f172a",
            font: "Calibri",
          }),
        ],
      }),
    ],
  });
}

function createDataCell(
  text: string,
  widthPct: number,
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
  bold = false,
  color = "0f172a"
) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        alignment,
        children: [
          new TextRun({
            text,
            bold,
            size: 15,
            color,
            font: "Calibri",
          }),
        ],
      }),
    ],
  });
}
