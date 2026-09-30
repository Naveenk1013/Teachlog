import { DetailedAttendanceMatrixResult } from "@/lib/data/attendance";
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

const PRIMARY_COLOR = "1e3a8a";
const HEADER_BG = "dbeafe";   // blue-100
const GREEN_COLOR = "047857";
const RED_COLOR = "b91c1c";
const AMBER_COLOR = "b45309";
const SLATE_BG = "f1f5f9";

// ─────────────────────────────────────────
//  CSV builder — full student × session
// ─────────────────────────────────────────

/**
 * Builds a detailed CSV attendance register with one column per session.
 * Columns: Roll No | Name | Section | Group | [date1] | [date2] … | Held | Present | Absent | Late | OD | % | Status
 */
export function buildDetailedAttendanceCSV(
  data: DetailedAttendanceMatrixResult,
  generatedByName?: string
): string {
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const sessionHeaders = data.sessions.map((s) => {
    const d = s.sessionDate ? s.sessionDate.slice(5) : ""; // MM-DD
    return `"${d} (${s.subjectName.slice(0, 8)})"`;
  });

  const fixedHeaders = [
    "Roll Number",
    "Student Name",
    "Section",
    "Practical Group",
    ...sessionHeaders,
    "Classes Held",
    "Present",
    "Absent",
    "Late",
    "OD",
    "Attendance %",
    "Exam Eligibility",
  ];

  const infoRows = [
    [`"IIHM Hyderabad – Detailed Attendance Register"`],
    [`"Cohort: ${data.batchName}"`],
    [`"Type: ${data.isPractical ? `Practical Lab (${data.group})` : "Theory Section"}"`],
    [`"Generated: ${dateStr} | By: ${generatedByName || "Academic Office"}"`],
    [`"Legend: P = Present | A = Absent | L = Late | OD = On Duty | - = Not Recorded"`],
    [],
  ];

  const dataRows = data.students.map((s) => {
    const sessionCells = data.sessions.map((sess) => s.sessionMarks[sess.id] ?? "-");
    const eligibility = s.percentage >= 75 ? "ELIGIBLE" : s.percentage >= 65 ? "BORDERLINE" : "SHORTAGE";
    return [
      s.rollNumber,
      `"${s.fullName.replace(/"/g, '""')}"`,
      s.section,
      s.practicalGroup || "—",
      ...sessionCells,
      s.totalClasses,
      s.attendedClasses,
      s.absentClasses,
      s.lateClasses,
      s.odClasses,
      `${s.percentage}%`,
      eligibility,
    ];
  });

  const allRows = [
    ...infoRows,
    fixedHeaders,
    ...dataRows,
  ];

  return "\uFEFF" + allRows.map((r) => r.join(",")).join("\r\n");
}

// ─────────────────────────────────────────
//  DOCX builder — full student × session
// ─────────────────────────────────────────

export async function buildDetailedAttendanceDocx(
  data: DetailedAttendanceMatrixResult,
  generatedByName?: string
): Promise<Buffer> {
  const generatedDateStr = format(new Date(), "dd MMMM yyyy, HH:mm");
  const eligibleCount = data.students.filter((s) => s.percentage >= 75).length;
  const shortageCount = data.students.filter((s) => s.percentage < 75).length;

  // Session columns (limit to avoid page overflow — DOCX tables max ~20 cols comfortably)
  const MAX_SESSION_COLS = 30;
  const sessionSlice = data.sessions.slice(0, MAX_SESSION_COLS);
  const truncated = data.sessions.length > MAX_SESSION_COLS;

  /** Narrow column header cell */
  const sessionHeaderCell = (text: string) =>
    new TableCell({
      width: { size: 4, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: HEADER_BG },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, size: 14, color: PRIMARY_COLOR, font: "Calibri" })],
        }),
      ],
    });

  /** Data cell with colour coding */
  const markCell = (mark: string) => {
    const color =
      mark === "P" ? GREEN_COLOR
      : mark === "A" ? RED_COLOR
      : mark === "L" ? AMBER_COLOR
      : mark === "OD" ? "7c3aed"
      : "94a3b8";

    return new TableCell({
      width: { size: 4, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: mark, bold: mark !== "-", size: 14, color, font: "Calibri" })],
        }),
      ],
    });
  };

  const headerCell = (text: string, widthPct: number) =>
    new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: SLATE_BG },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, size: 14, color: "0f172a", font: "Calibri" })],
        }),
      ],
    });

  const dataCell = (text: string, widthPct: number, color = "0f172a", bold = false) =>
    new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold, size: 14, color, font: "Calibri" })],
        }),
      ],
    });

  // Build table header row
  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("#", 3),
      headerCell("Roll No.", 10),
      headerCell("Student Name", 16),
      ...sessionSlice.map((s) =>
        sessionHeaderCell(s.sessionDate ? s.sessionDate.slice(5).replace("-", "/") : "?")
      ),
      headerCell("Held", 5),
      headerCell("Pres", 5),
      headerCell("Abs", 5),
      headerCell("%", 5),
      headerCell("Status", 8),
    ],
  });

  const tableRows = data.students.map((student, idx) => {
    const isShortage = student.percentage < 75;
    const pctColor =
      student.percentage >= 75 ? GREEN_COLOR
      : student.percentage >= 65 ? AMBER_COLOR
      : RED_COLOR;
    const statusText =
      student.percentage >= 75 ? "ELIGIBLE"
      : student.percentage >= 65 ? "BORDERLINE"
      : "SHORTAGE";

    return new TableRow({
      children: [
        dataCell(String(idx + 1), 3),
        dataCell(student.rollNumber, 10, PRIMARY_COLOR, true),
        new TableCell({
          width: { size: 16, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: student.fullName, size: 14, font: "Calibri", bold: false }),
              ],
            }),
          ],
        }),
        ...sessionSlice.map((s) => markCell(student.sessionMarks[s.id] ?? "-")),
        dataCell(String(student.totalClasses), 5),
        dataCell(String(student.attendedClasses), 5, GREEN_COLOR, true),
        dataCell(String(student.absentClasses), 5, RED_COLOR),
        dataCell(`${student.percentage}%`, 5, pctColor, true),
        dataCell(statusText, 8, pctColor, true),
      ],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 15840, height: 12240 }, // Landscape (A3-ish)
            margin: { top: 560, bottom: 560, left: 560, right: 560 },
          },
        },
        children: [
          // Title
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
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "HYDERABAD CAMPUS  •  DETAILED CLASS ATTENDANCE REGISTER",
                bold: true,
                size: 18,
                color: "475569",
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: `Cohort: ${data.batchName}  |  Total Sessions: ${data.sessions.length}  |  Students: ${data.students.length}  |  Eligible: ${eligibleCount}  |  Shortage: ${shortageCount}  |  Generated: ${generatedDateStr}  |  By: ${generatedByName || "Academic Office"}`,
                size: 15,
                color: "475569",
                font: "Calibri",
              }),
            ],
          }),

          ...(truncated
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 120 },
                  children: [
                    new TextRun({
                      text: `⚠ Note: Only first ${MAX_SESSION_COLS} sessions shown in this document. Download CSV for complete data.`,
                      size: 14,
                      color: AMBER_COLOR,
                      bold: true,
                      font: "Calibri",
                    }),
                  ],
                }),
              ]
            : []),

          // Legend
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "Legend: ", bold: true, size: 15, font: "Calibri" }),
              new TextRun({ text: "P ", bold: true, size: 15, color: GREEN_COLOR, font: "Calibri" }),
              new TextRun({ text: "= Present   ", size: 15, font: "Calibri" }),
              new TextRun({ text: "A ", bold: true, size: 15, color: RED_COLOR, font: "Calibri" }),
              new TextRun({ text: "= Absent   ", size: 15, font: "Calibri" }),
              new TextRun({ text: "L ", bold: true, size: 15, color: AMBER_COLOR, font: "Calibri" }),
              new TextRun({ text: "= Late   ", size: 15, font: "Calibri" }),
              new TextRun({ text: "OD ", bold: true, size: 15, color: "7c3aed", font: "Calibri" }),
              new TextRun({ text: "= On Duty   ", size: 15, font: "Calibri" }),
              new TextRun({ text: "-", bold: false, size: 15, color: "94a3b8", font: "Calibri" }),
              new TextRun({ text: " = Not Recorded", size: 15, font: "Calibri" }),
            ],
          }),

          // Main attendance matrix table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "0f172a" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "0f172a" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "e2e8f0" },
              insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "e2e8f0" },
            },
            rows: [tableHeaderRow, ...tableRows],
          }),

          new Paragraph({ spacing: { after: 280 } }),

          // Signature block
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({ text: "_______________________     ", color: "94a3b8" }),
              new TextRun({ text: "_______________________     ", color: "94a3b8" }),
              new TextRun({ text: "_______________________", color: "94a3b8" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({ text: "Class Representative          ", bold: true, size: 16, font: "Calibri" }),
              new TextRun({ text: `${generatedByName || "Faculty / Tutor"}               `, bold: true, size: 16, font: "Calibri" }),
              new TextRun({ text: "Academic Head / Principal", bold: true, size: 16, font: "Calibri" }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
