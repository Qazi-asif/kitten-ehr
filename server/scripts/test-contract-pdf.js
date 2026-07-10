/**
 * Manual local test script for generateContractPdf (task #27).
 *
 * Not wired into the app anywhere - run it by hand on your own machine to
 * see a real generated PDF before this gets wired into live signing.
 * Uses only local files; no database or network access required.
 *
 * Usage (from the server/ directory):
 *   node scripts/test-contract-pdf.js
 *
 * Requires the same dependencies already in server/package.json
 * (pdf-lib, sharp) - if you haven't run `npm install` in server/ since
 * those were added, do that first.
 *
 * Writes a PDF to server/scripts/test-output/ and prints its path.
 * Open that file yourself to inspect the real output.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { generateContractPdf, pdfBytesToDataUrl } from '../src/utils/contractPdf.js';
import { DEFAULT_AGREEMENT_TEMPLATES } from '../src/constants/defaultAgreementTemplates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Obviously-fake test data - not a real client, not a real signature.
const TEST_VARIABLES = {
  signerName: 'Jane Q. Testdoe',
  signerEmail: 'jane.testdoe@example.com',
  signerPhone: '(555) 123-4567',
  signerAddress: '123 Test Lane, Sample City, CA 90000',
  kittenName: 'Whiskers (TEST DATA)',
  microchipNumber: '000000000000000',
  version: '2026.1',
};

// Mirrors renderAgreementBody() in contractAgreementText.js, reimplemented
// here so this script has zero dependency on the Prisma-backed module
// (that file imports the Prisma client at the top, which this script
// deliberately avoids so it never needs a database connection).
function renderAgreementBody(bodyText, variables) {
  return bodyText.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key];
    return value == null || value === '' ? '________________' : String(value);
  });
}

async function buildFakeSignatureDataUrl() {
  const svg = `<svg width="360" height="120" xmlns="http://www.w3.org/2000/svg">
    <rect width="360" height="120" fill="white"/>
    <path d="M10,90 C40,20 60,110 90,60 S150,10 180,70 S250,100 280,40 S330,90 350,50"
      fill="none" stroke="black" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

// Fake org logo, deliberately oversized (400x160) relative to the PDF's
// 150x60 display cap in contractPdf.js, so this test exercises the
// scale-down path (both width and height constraints) rather than a no-op.
async function buildFakeLogoDataUrl() {
  const svg = `<svg width="400" height="160" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="160" fill="white"/>
    <circle cx="80" cy="80" r="60" fill="#0f766e"/>
    <circle cx="55" cy="50" r="14" fill="#0f766e"/>
    <circle cx="105" cy="50" r="14" fill="#0f766e"/>
    <circle cx="35" cy="85" r="12" fill="#0f766e"/>
    <circle cx="125" cy="85" r="12" fill="#0f766e"/>
    <rect x="160" y="55" width="220" height="50" rx="8" fill="#0f766e"/>
  </svg>`;
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

async function main() {
  const template = DEFAULT_AGREEMENT_TEMPLATES.find((t) => t.slug === 'adoption');
  const agreementText = renderAgreementBody(template.bodyText, TEST_VARIABLES);
  const signatureImageDataUrl = await buildFakeSignatureDataUrl();
  const logoImageDataUrl = await buildFakeLogoDataUrl();

  const pdfBytes = await generateContractPdf({
    title: 'TEST DATA - NOT A REAL CONTRACT',
    agreementText,
    signatureImageDataUrl,
    logoImageDataUrl,
    signerName: TEST_VARIABLES.signerName,
    signerEmail: TEST_VARIABLES.signerEmail,
    signedAt: new Date().toISOString(),
  });

  const outDir = path.join(__dirname, 'test-output');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `contract-test-${Date.now()}.pdf`);
  fs.writeFileSync(outPath, pdfBytes);

  const dataUrl = pdfBytesToDataUrl(pdfBytes);

  console.log('Generated a real test PDF using the actual adoption agreement template.');
  console.log(`  File:  ${outPath}`);
  console.log(`  Bytes: ${pdfBytes.length}`);
  console.log(`  As base64 data URL: ${dataUrl.length} chars (this is roughly what would get stored in Contract.pdfUrl when no S3 is configured)`);
  console.log('\nOpen the file above with any PDF viewer to inspect layout, pagination, and the embedded signature.');
}

main().catch((err) => {
  console.error('Failed to generate test PDF:', err);
  process.exit(1);
});
