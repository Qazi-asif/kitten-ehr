import { randomUUID } from 'crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { isObjectStorageConfigured, uploadToObjectStorage } from './objectStorage.js';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const BODY_FONT_SIZE = 10;
const LINE_HEIGHT = 14;
const TITLE_FONT_SIZE = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const SIGNATURE_WIDTH = 180;
const LOGO_MAX_WIDTH = 150;
const LOGO_MAX_HEIGHT = 60;

function wrapParagraph(text, font, fontSize, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function decodeDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

/**
 * Renders a signed agreement into a real PDF: an optional org logo header
 * (first page only), the (already-frozen) agreement text, the drawn
 * signature image, and the signer's name/email/date. Pure function - no
 * database or network I/O, safe to call in isolation. Never throws on a
 * missing/malformed logo or signature image; it just omits the image and
 * continues, since a PDF generation hiccup should never block a successful
 * signature from being recorded. logoImageDataUrl is optional - omitting it
 * produces byte-identical output to before this parameter existed.
 */
export async function generateContractPdf({
  title,
  agreementText,
  signatureImageDataUrl,
  signerName,
  signerEmail,
  signedAt,
  logoImageDataUrl,
  orgSignatureImageDataUrl,
  orgName,
}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function ensureSpace(neededHeight) {
    if (y - neededHeight < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  function drawLine(text, { font: lineFont = font, size = BODY_FONT_SIZE, gapAfter = LINE_HEIGHT } = {}) {
    ensureSpace(LINE_HEIGHT);
    page.drawText(text, { x: MARGIN, y, size, font: lineFont, color: rgb(0, 0, 0) });
    y -= gapAfter;
  }

  // Logo, if provided, is drawn once on this first page only - it is
  // intentionally not repeated on subsequent pages (letterhead convention,
  // and keeps pagination logic unchanged for pages 2+). A missing or
  // malformed logo must never block PDF generation.
  try {
    const decodedLogo = decodeDataUrl(logoImageDataUrl);
    if (decodedLogo) {
      let logoImage = null;
      if (decodedLogo.mimeType.includes('png')) {
        logoImage = await pdfDoc.embedPng(decodedLogo.buffer);
      } else if (decodedLogo.mimeType.includes('jpeg') || decodedLogo.mimeType.includes('jpg')) {
        logoImage = await pdfDoc.embedJpg(decodedLogo.buffer);
      }
      if (logoImage) {
        // Scale down to fit within LOGO_MAX_WIDTH x LOGO_MAX_HEIGHT, but
        // never scale up a smaller source image (avoids a blurry stretched
        // logo) - same "min(1, ...)" approach as would apply to any other
        // fixed display box, mirroring how the signature image is fitted.
        const scale = Math.min(1, LOGO_MAX_WIDTH / logoImage.width, LOGO_MAX_HEIGHT / logoImage.height);
        const logoWidth = logoImage.width * scale;
        const logoHeight = logoImage.height * scale;
        page.drawImage(logoImage, { x: MARGIN, y: y - logoHeight, width: logoWidth, height: logoHeight });
        y -= logoHeight + 12;
      }
    }
  } catch (error) {
    console.warn('[contractPdf] Failed to embed logo image, continuing without it:', error.message);
  }

  if (title) {
    ensureSpace(TITLE_FONT_SIZE + 10);
    page.drawText(title, { x: MARGIN, y, size: TITLE_FONT_SIZE, font: boldFont, color: rgb(0, 0, 0) });
    y -= TITLE_FONT_SIZE + 10;
  }

  const paragraphs = (agreementText || '').split(/\n/);
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      y -= LINE_HEIGHT * 0.6;
      continue;
    }
    const lines = wrapParagraph(paragraph, font, BODY_FONT_SIZE, CONTENT_WIDTH);
    for (const line of lines) {
      drawLine(line);
    }
  }

  ensureSpace(140);
  y -= 10;
  drawLine('Electronic Signature', { font: boldFont, size: 11, gapAfter: LINE_HEIGHT + 4 });

  try {
    const decoded = decodeDataUrl(signatureImageDataUrl);
    if (decoded) {
      let sigImage = null;
      if (decoded.mimeType.includes('png')) {
        sigImage = await pdfDoc.embedPng(decoded.buffer);
      } else if (decoded.mimeType.includes('jpeg') || decoded.mimeType.includes('jpg')) {
        sigImage = await pdfDoc.embedJpg(decoded.buffer);
      }
      if (sigImage) {
        const sigHeight = (sigImage.height / sigImage.width) * SIGNATURE_WIDTH;
        ensureSpace(sigHeight + 10);
        page.drawImage(sigImage, { x: MARGIN, y: y - sigHeight, width: SIGNATURE_WIDTH, height: sigHeight });
        y -= sigHeight + 8;
      }
    }
  } catch (error) {
    console.warn('[contractPdf] Failed to embed signature image, continuing without it:', error.message);
  }

  drawLine(`Signed by: ${signerName || 'Unknown'}`, { size: 10 });
  if (signerEmail) drawLine(`Email: ${signerEmail}`, { size: 10 });
  if (signedAt) drawLine(`Date: ${new Date(signedAt).toLocaleString()}`, { size: 10 });

  // Org "authorized representative" signature - applied automatically to
  // every signed contract's PDF as a second signature block, alongside
  // (not replacing) the foster/adopter's own signature above. Same
  // embed-and-fall-back-gracefully treatment as the logo: a missing or
  // malformed image must never block PDF generation. The whole block is
  // only drawn when an org signature image is actually present and
  // decodable, mirroring how the logo section only appears when provided -
  // orgSignatureImageDataUrl is optional, so omitting it produces the same
  // output as before this parameter existed.
  try {
    const decodedOrgSig = decodeDataUrl(orgSignatureImageDataUrl);
    if (decodedOrgSig) {
      let orgSigImage = null;
      if (decodedOrgSig.mimeType.includes('png')) {
        orgSigImage = await pdfDoc.embedPng(decodedOrgSig.buffer);
      } else if (decodedOrgSig.mimeType.includes('jpeg') || decodedOrgSig.mimeType.includes('jpg')) {
        orgSigImage = await pdfDoc.embedJpg(decodedOrgSig.buffer);
      }
      if (orgSigImage) {
        const orgSigHeight = (orgSigImage.height / orgSigImage.width) * SIGNATURE_WIDTH;
        ensureSpace(orgSigHeight + LINE_HEIGHT + 4 + 24);
        y -= 14;
        drawLine('For the Rescue (Authorized Representative)', { font: boldFont, size: 11, gapAfter: LINE_HEIGHT + 4 });
        ensureSpace(orgSigHeight + 10);
        page.drawImage(orgSigImage, { x: MARGIN, y: y - orgSigHeight, width: SIGNATURE_WIDTH, height: orgSigHeight });
        y -= orgSigHeight + 8;
        if (orgName) drawLine(`Signed by: ${orgName}`, { size: 10 });
        if (signedAt) drawLine(`Date: ${new Date(signedAt).toLocaleString()}`, { size: 10 });
      }
    }
  } catch (error) {
    console.warn('[contractPdf] Failed to embed org signature image, continuing without it:', error.message);
  }

  return pdfDoc.save();
}

export function pdfBytesToDataUrl(bytes) {
  return `data:application/pdf;base64,${Buffer.from(bytes).toString('base64')}`;
}

/**
 * Stores generated PDF bytes: uploads to object storage if S3/R2 is
 * configured, otherwise falls back to an inline base64 data URL - the same
 * pattern already used for kitten photos when no object storage is set up.
 * Returns the URL/data-URL string to save on the Contract row. Never
 * throws; a storage failure returns null so callers can leave pdfUrl empty
 * and let signing succeed regardless.
 */
export async function storeContractPdf(contractId, pdfBytes) {
  try {
    if (isObjectStorageConfigured()) {
      const key = `contracts/${contractId}/${randomUUID()}.pdf`;
      return await uploadToObjectStorage(key, Buffer.from(pdfBytes), 'application/pdf');
    }
    return pdfBytesToDataUrl(pdfBytes);
  } catch (error) {
    console.warn('[contractPdf] Failed to store generated PDF:', error.message);
    return null;
  }
}
