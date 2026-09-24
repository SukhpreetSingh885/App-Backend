import { existsSync } from "fs";
import { join } from "path";
import PDFDocument = require("pdfkit");

export type CertificatePdfData = {
  studentName: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: Date;
};

const NAVY = "#0B1F3A";
const GOLD = "#C79A32";
const MUTED = "#526175";
const PAPER = "#FFFDF7";

export function createCertificatePdf(
  data: CertificatePdfData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
      info: {
        Title:
          `Viralstan Academy Certificate - ${data.certificateNumber}`,
        Author: "Viralstan Academy",
        Subject:
          `Certificate of completion for ${data.courseTitle}`,
      },
    });

    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) =>
      chunks.push(chunk),
    );
    document.on("end", () =>
      resolve(Buffer.concat(chunks)),
    );
    document.on("error", reject);

    const width = document.page.width;
    const height = document.page.height;

    document.rect(0, 0, width, height)
      .fill(PAPER);

    document.lineWidth(4)
      .strokeColor(NAVY)
      .rect(18, 18, width - 36, height - 36)
      .stroke();

    document.lineWidth(1.5)
      .strokeColor(GOLD)
      .rect(28, 28, width - 56, height - 56)
      .stroke();

    document.fillColor(GOLD)
      .polygon([28, 28], [115, 28], [28, 115])
      .fill();
    document.fillColor(GOLD)
      .polygon(
        [width - 28, height - 28],
        [width - 115, height - 28],
        [width - 28, height - 115],
      )
      .fill();

    const logoPath = join(
      process.cwd(),
      "assets",
      "viralstan-academy-logo.png",
    );

    if (existsSync(logoPath)) {
      document.image(
        logoPath,
        width / 2 - 38,
        42,
        { width: 76, height: 76 },
      );
    }

    document.fillColor(NAVY)
      .font("Helvetica-Bold")
      .fontSize(17)
      .text(
        "VIRALSTAN ACADEMY",
        0,
        122,
        { width, align: "center" },
      );

    document.fillColor(GOLD)
      .font("Helvetica-Bold")
      .fontSize(31)
      .text(
        "CERTIFICATE OF COMPLETION",
        60,
        158,
        { width: width - 120, align: "center" },
      );

    document.moveTo(width / 2 - 120, 200)
      .lineTo(width / 2 + 120, 200)
      .lineWidth(1)
      .strokeColor(GOLD)
      .stroke();

    document.fillColor(MUTED)
      .font("Helvetica")
      .fontSize(13)
      .text(
        "This certificate is proudly presented to",
        80,
        220,
        { width: width - 160, align: "center" },
      );

    const studentFontSize =
      data.studentName.length > 34 ? 27 : 34;

    document.fillColor(NAVY)
      .font("Times-BoldItalic")
      .fontSize(studentFontSize)
      .text(
        data.studentName,
        80,
        251,
        { width: width - 160, align: "center" },
      );

    document.fillColor(MUTED)
      .font("Helvetica")
      .fontSize(13)
      .text(
        "for successfully completing the course",
        80,
        303,
        { width: width - 160, align: "center" },
      );

    const courseFontSize =
      data.courseTitle.length > 48 ? 20 : 25;

    document.fillColor(NAVY)
      .font("Helvetica-Bold")
      .fontSize(courseFontSize)
      .text(
        data.courseTitle,
        90,
        333,
        { width: width - 180, align: "center" },
      );

    document.fillColor(MUTED)
      .font("Helvetica")
      .fontSize(11)
      .text(
        "This achievement confirms successful completion of all required course lessons.",
        100,
        378,
        { width: width - 200, align: "center" },
      );

    const issueDate = data.issuedAt.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      },
    );

    document.fillColor(NAVY)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("ISSUED ON", 88, 452, {
        width: 180,
        align: "center",
      });
    document.fillColor(MUTED)
      .font("Helvetica")
      .fontSize(11)
      .text(issueDate, 88, 470, {
        width: 180,
        align: "center",
      });

const signaturePath = join(
  process.cwd(),
  "assets",
  "authorized-signature.png",
);

if (existsSync(signaturePath)) {
  document.image(
    signaturePath,
    width / 2 - 60,
    425,
    {
      width: 120,
      height: 40,
      fit: [120, 40],
      align: "center",
      valign: "center",
    },
  );
}

document.moveTo(width / 2 - 85, 468)
  .lineTo(width / 2 + 85, 468)
  .lineWidth(1)
  .strokeColor(NAVY)
  .stroke();

document.fillColor(MUTED)
  .font("Helvetica")
  .fontSize(10)
  .text(
    "AUTHORIZED SIGNATORY",
    width / 2 - 85,
    476,
    {
      width: 170,
      align: "center",
    },
  );
    document.fillColor(NAVY)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("CERTIFICATE NUMBER", width - 268, 452, {
        width: 180,
        align: "center",
      });
    document.fillColor(MUTED)
      .font("Helvetica")
      .fontSize(10)
      .text(
        data.certificateNumber,
        width - 268,
        470,
        { width: 180, align: "center" },
      );

    document.fillColor(MUTED)
      .font("Helvetica")
      .fontSize(8)
      .text(
        "Verify this certificate using its unique certificate number.",
        80,
        height - 57,
        { width: width - 160, align: "center" },
      );

    document.end();
  });
}
