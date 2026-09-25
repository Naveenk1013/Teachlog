import {
  Document,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  ImageRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer,
  HeadingLevel,
  UnderlineType,
  ShadingType,
} from "docx";
import fs from "fs";
import path from "path";
import { format, addDays, parseISO } from "date-fns";
import { getTeachingWeekOfMonth } from "@/lib/dates";

export interface ReportSessionData {
  sessionDate: string; // YYYY-MM-DD
  dayName: string;     // Monday, Tuesday, ...
  startTime: string;   // 09:00
  endTime: string;     // 10:00
  topicPlanned: string | null;
  topicCovered: string;
  teachingMethod: string | null;
  assignmentActivity: string | null;
  status: "submitted" | "verified";
}

export interface ReportSummaryData {
  syllabusCoverage: string;
  practicalConducted: string;
  assessmentConducted: string;
  slowLearners: string;
  remedialAction: string;
  aiDigitalTools: string;
  industryExamples: string;
  submittedOn: string | null;
  status: "submitted" | "verified";
}

export interface WeeklyReportData {
  facultyName: string;
  department: string;
  subjectName: string;
  subjectCode: string | null;
  programmeName: string;
  batchName: string;
  semester: number;
  academicYear: string;
  weekStart: string; // YYYY-MM-DD (Monday)
  sessions: ReportSessionData[];
  summary: ReportSummaryData | null;
  allVerified?: boolean;
}

const FONT_FAMILY = "Times New Roman";

// Standard border styles
const THIN_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: "888888",
};

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF",
};

const CELL_BORDERS = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};

export async function buildWeeklyLogDocx(data: WeeklyReportData): Promise<Buffer> {
  const weekStartDate = parseISO(data.weekStart);
  const weekOfMonth = getTeachingWeekOfMonth(weekStartDate);
  const monthYearStr = format(weekStartDate, "MMMM yyyy");

  // 1. Calculate the 6 teaching days (Monday to Saturday)
  const weekDays: { dateStr: string; dayName: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = addDays(weekStartDate, i);
    weekDays.push({
      dateStr: format(d, "yyyy-MM-dd"),
      dayName: format(d, "EEEE"),
    });
  }

  // 2. Title Block with IIHM Logo
  const logoPath = path.join(process.cwd(), "public", "iihm_logo.png");
  let logoParagraph: Paragraph | null = null;
  try {
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoParagraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80, before: 0 },
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 110, height: 85 },
            type: "png",
          }),
        ],
      });
    }
  } catch (err) {
    console.error("Error embedding IIHM logo in docx:", err);
  }

  const titleBlock = [
    ...(logoParagraph ? [logoParagraph] : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30, before: 0 },
      children: [
        new TextRun({
          text: "INTERNATIONAL INSTITUTE OF HOTEL MANAGEMENT",
          font: FONT_FAMILY,
          bold: true,
          size: 20, // 10pt
          color: "1A237E",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60, before: 0 },
      children: [
        new TextRun({
          text: "IIHM HYDERABAD",
          font: FONT_FAMILY,
          bold: true,
          size: 32, // 16pt
          color: "1A237E",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: "WEEKLY TEACHING LOG SHEET & SUMMARY",
          font: FONT_FAMILY,
          bold: true,
          size: 24, // 12pt
          color: "222222",
        }),
      ],
    }),
  ];

  // 3. Metadata Header Table (2 columns of key-values)
  const metaRows = [
    [
      { label: "Faculty Name:", val: data.facultyName },
      { label: "Department:", val: data.department || "Hospitality Studies" },
    ],
    [
      { label: "Subject:", val: `${data.subjectName} ${data.subjectCode ? `(${data.subjectCode})` : ""}` },
      { label: "Programme:", val: data.programmeName || "B.Sc. in Hospitality & Hotel Admin" },
    ],
    [
      { label: "Batch / Semester:", val: `${data.batchName} — Semester ${data.semester}` },
      { label: "Week No. / Month:", val: `Week ${weekOfMonth} (${monthYearStr})` },
    ],
    [
      { label: "Academic Year:", val: data.academicYear || "2026-27" },
      { label: "Week Duration:", val: `${format(weekStartDate, "dd/MM/yyyy")} to ${format(addDays(weekStartDate, 5), "dd/MM/yyyy")}` },
    ],
  ];

  const metaTableRows = metaRows.map((pair) =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: 1800, type: WidthType.DXA },
          borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
          children: [
            new Paragraph({
              children: [new TextRun({ text: pair[0].label, font: FONT_FAMILY, bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
          children: [
            new Paragraph({
              children: [new TextRun({ text: pair[0].val, font: FONT_FAMILY, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 1800, type: WidthType.DXA },
          borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
          children: [
            new Paragraph({
              children: [new TextRun({ text: pair[1].label, font: FONT_FAMILY, bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
          children: [
            new Paragraph({
              children: [new TextRun({ text: pair[1].val, font: FONT_FAMILY, size: 18 })],
            }),
          ],
        }),
      ],
    })
  );

  const metaTable = new Table({
    width: { size: 10800, type: WidthType.DXA },
    rows: metaTableRows,
  });

  // 4. Log Table Headers (7 Columns matching IIHM standard)
  const logHeaders = [
    { text: "Day & Date", width: 1500 },
    { text: "Time", width: 1200 },
    { text: "Topic Planned", width: 2200 },
    { text: "Topic Completed (Actual)", width: 2300 },
    { text: "Teaching Method", width: 1500 },
    { text: "Assignment / Activity", width: 1400 },
    { text: "Faculty Sign", width: 700 },
  ];

  const logHeaderRow = new TableRow({
    tableHeader: true,
    children: logHeaders.map(
      (h) =>
        new TableCell({
          width: { size: h.width, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: "E8EAF6" },
          borders: CELL_BORDERS,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
              children: [new TextRun({ text: h.text, font: FONT_FAMILY, bold: true, size: 16 })],
            }),
          ],
        })
    ),
  });

  // 5. Log Table Data Rows (Monday to Saturday)
  const logDataRows: TableRow[] = [];

  for (const day of weekDays) {
    const matchingSessions = data.sessions.filter((s) => s.sessionDate === day.dateStr);
    const dayDisplay = `${day.dayName.slice(0, 3)}, ${format(parseISO(day.dateStr), "dd/MM")}`;

    if (matchingSessions.length === 0) {
      // Empty row for days with no class
      logDataRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 1500, type: WidthType.DXA },
              borders: CELL_BORDERS,
              children: [
                new Paragraph({
                  spacing: { before: 60, after: 60 },
                  children: [new TextRun({ text: dayDisplay, font: FONT_FAMILY, bold: true, size: 16 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 1200, type: WidthType.DXA },
              borders: CELL_BORDERS,
              children: [new Paragraph({ children: [new TextRun({ text: "—", font: FONT_FAMILY, size: 16 })] })],
            }),
            new TableCell({
              width: { size: 2200, type: WidthType.DXA },
              borders: CELL_BORDERS,
              children: [new Paragraph({ children: [new TextRun({ text: "No class scheduled", font: FONT_FAMILY, italics: true, size: 16, color: "888888" })] })],
            }),
            new TableCell({
              width: { size: 2300, type: WidthType.DXA },
              borders: CELL_BORDERS,
              children: [new Paragraph({ children: [new TextRun({ text: "—", font: FONT_FAMILY, size: 16 })] })],
            }),
            new TableCell({
              width: { size: 1500, type: WidthType.DXA },
              borders: CELL_BORDERS,
              children: [new Paragraph({ children: [new TextRun({ text: "—", font: FONT_FAMILY, size: 16 })] })],
            }),
            new TableCell({
              width: { size: 1400, type: WidthType.DXA },
              borders: CELL_BORDERS,
              children: [new Paragraph({ children: [new TextRun({ text: "—", font: FONT_FAMILY, size: 16 })] })],
            }),
            new TableCell({
              width: { size: 700, type: WidthType.DXA },
              borders: CELL_BORDERS,
              children: [new Paragraph({ children: [] })],
            }),
          ],
        })
      );
    } else {
      // One row per session
      for (const session of matchingSessions) {
        logDataRows.push(
          new TableRow({
            children: [
              new TableCell({
                width: { size: 1500, type: WidthType.DXA },
                borders: CELL_BORDERS,
                children: [
                  new Paragraph({
                    spacing: { before: 60, after: 60 },
                    children: [new TextRun({ text: dayDisplay, font: FONT_FAMILY, bold: true, size: 16 })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 1200, type: WidthType.DXA },
                borders: CELL_BORDERS,
                children: [
                  new Paragraph({
                    spacing: { before: 60, after: 60 },
                    children: [new TextRun({ text: `${session.startTime}-${session.endTime}`, font: FONT_FAMILY, size: 16 })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 2200, type: WidthType.DXA },
                borders: CELL_BORDERS,
                children: [
                  new Paragraph({
                    spacing: { before: 60, after: 60 },
                    children: [new TextRun({ text: session.topicCovered || session.topicPlanned || "—", font: FONT_FAMILY, size: 16 })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 2300, type: WidthType.DXA },
                borders: CELL_BORDERS,
                children: [
                  new Paragraph({
                    spacing: { before: 60, after: 60 },
                    children: [new TextRun({ text: session.topicCovered || session.topicPlanned || "—", font: FONT_FAMILY, size: 16 })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 1500, type: WidthType.DXA },
                borders: CELL_BORDERS,
                children: [
                  new Paragraph({
                    spacing: { before: 60, after: 60 },
                    children: [new TextRun({ text: session.teachingMethod || "Lecture", font: FONT_FAMILY, size: 16 })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 1400, type: WidthType.DXA },
                borders: CELL_BORDERS,
                children: [
                  new Paragraph({
                    spacing: { before: 60, after: 60 },
                    children: [new TextRun({ text: session.assignmentActivity || "—", font: FONT_FAMILY, size: 16 })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 700, type: WidthType.DXA },
                borders: CELL_BORDERS,
                children: [new Paragraph({ children: [] })],
              }),
            ],
          })
        );
      }
    }
  }

  const logTable = new Table({
    width: { size: 10800, type: WidthType.DXA },
    rows: [logHeaderRow, ...logDataRows],
  });

  // 6. Weekly Summary Section (7 Official Sections)
  const summaryHeader = new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: "WEEKLY TEACHING SUMMARY",
        font: FONT_FAMILY,
        bold: true,
        size: 22,
        color: "1A237E",
      }),
    ],
  });

  const summary = data.summary;
  const summarySections = [
    { num: "1", title: "Syllabus Coverage This Week", content: summary?.syllabusCoverage },
    { num: "2", title: "Practical / Demonstration Conducted", content: summary?.practicalConducted },
    { num: "3", title: "Assessment / Evaluation Conducted", content: summary?.assessmentConducted },
    { num: "4", title: "Slow Learners Identified", content: summary?.slowLearners },
    { num: "5", title: "Remedial Action Planned / Taken", content: summary?.remedialAction },
    { num: "6", title: "AI / Digital Tools Used", content: summary?.aiDigitalTools },
    { num: "7", title: "Industry Examples / Case Studies Discussed", content: summary?.industryExamples },
  ];

  const summaryParagraphs: Paragraph[] = [];
  summarySections.forEach((s) => {
    summaryParagraphs.push(
      new Paragraph({
        spacing: { before: 100, after: 40 },
        children: [
          new TextRun({
            text: `${s.num}. ${s.title}: `,
            font: FONT_FAMILY,
            bold: true,
            size: 18,
          }),
          new TextRun({
            text: s.content ? s.content : "None reported.",
            font: FONT_FAMILY,
            size: 18,
          }),
        ],
      })
    );
  });

  // 7. Signature and Sign-Off Block
  const submissionDate = summary?.submittedOn
    ? format(parseISO(summary.submittedOn), "dd/MM/yyyy")
    : format(new Date(), "dd/MM/yyyy");

  const signOffTable = new Table({
    width: { size: 10800, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 3600, type: WidthType.DXA },
            borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
            children: [
              new Paragraph({
                spacing: { before: 300, after: 60 },
                children: [
                  new TextRun({
                    text: `Date of Submission: ${submissionDate}`,
                    font: FONT_FAMILY,
                    size: 18,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 200 },
                children: [
                  new TextRun({
                    text: "____________________________",
                    font: FONT_FAMILY,
                    size: 18,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Faculty Signature",
                    font: FONT_FAMILY,
                    bold: true,
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 3600, type: WidthType.DXA },
            borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
            children: [
              new Paragraph({
                spacing: { before: 560 },
                children: [
                  new TextRun({
                    text: "____________________________",
                    font: FONT_FAMILY,
                    size: 18,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Verified by Program Leader",
                    font: FONT_FAMILY,
                    bold: true,
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 3600, type: WidthType.DXA },
            borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
            children: [
              new Paragraph({
                spacing: { before: 560 },
                children: [
                  new TextRun({
                    text: "____________________________",
                    font: FONT_FAMILY,
                    size: 18,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Director Signature",
                    font: FONT_FAMILY,
                    bold: true,
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Draft watermark note if unverified
  const hasUnverified = data.sessions.some((s) => s.status === "submitted");
  const draftNote = hasUnverified
    ? [
        new Paragraph({
          spacing: { before: 180 },
          children: [
            new TextRun({
              text: "* Note: This document contains session entries that have not yet been formally verified by faculty.",
              font: FONT_FAMILY,
              size: 16,
              italics: true,
              color: "B71C1C",
            }),
          ],
        }),
      ]
    : [];

  // Assemble full document
  const doc = new Document({
    title: `IIHM Hyderabad Weekly Teaching Log - ${data.subjectName}`,
    creator: "TeachLog IIHM Hyderabad",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1080,    // 0.75 in
              right: 1080,  // 0.75 in
              bottom: 1080, // 0.75 in
              left: 1080,   // 0.75 in
            },
          },
        },
        children: [
          ...titleBlock,
          metaTable,
          new Paragraph({ spacing: { before: 120 } }),
          logTable,
          summaryHeader,
          ...summaryParagraphs,
          ...draftNote,
          signOffTable,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
