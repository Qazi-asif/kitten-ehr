import { createHash } from 'crypto';
import { formatExternalId } from '../utils/kittenScope.js';
import {
  mapBreed,
  mapNegativeFlag,
  mapSex,
  stripHtml,
} from './syndicationLookups.js';

export const CSV_HEADERS = [
  'externalID', 'status', 'internalID', 'rescueID', 'name', 'type', 'priBreed', 'secBreed',
  'mix', 'sex', 'okwithdogs', 'okwithcats', 'okwithkids', 'declawed', 'housebroken', 'age',
  'specialNeeds', 'altered', 'size', 'uptodate', 'color', 'pattern', 'coatLength', 'courtesy',
  'dsc', 'found', 'foundDate', 'foundZipcode', 'photo1', 'photo2', 'photo3', 'photo4', 'videoUrl',
];

export const SNAPSHOT_STATUSES = new Set(['Available for Adoption']);
export const PENDING_OR_ADOPTED = new Set(['Adopted', 'Adoption Pending', 'Pending']);

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function ageLabel(dateOfBirth) {
  if (!dateOfBirth) return '';
  const ms = Date.now() - new Date(dateOfBirth).getTime();
  const weeks = Math.floor(ms / (7 * 86400000));
  if (weeks < 0) return '';
  if (weeks < 52) return 'Baby';
  if (weeks < 104) return 'Young';
  return 'Adult';
}

function sizeFromGrams(grams) {
  if (!grams || grams <= 0) return 'Small';
  if (grams < 2500) return 'Small';
  if (grams < 5000) return 'Medium';
  return 'Large';
}

function coatLengthFromBreed(priBreed) {
  if (priBreed.includes('Long')) return 'Long';
  if (priBreed.includes('Medium')) return 'Medium';
  return 'Short';
}

export function isSnapshotEligible(kitten) {
  if (!SNAPSHOT_STATUSES.has(kitten.status)) return false;
  if (kitten.isActive === false) return false;
  if (!mapSex(kitten.sex)) return false;
  return true;
}

export function buildDescription({ kitten, orgName, applyUrl }) {
  const body = stripHtml(kitten.rescueStory || kitten.notes || '');
  const footer = [orgName, applyUrl].filter(Boolean).join(' — ');
  return [body, footer].filter(Boolean).join(' ').trim();
}

export function kittenToCsvRow(kitten, {
  orgName = 'Pawsitive Transformations',
  applyBaseUrl = '',
  photos = [],
  breedMap = new Map(),
} = {}) {
  const externalID = kitten.externalId || formatExternalId(kitten.id);
  const priBreed = mapBreed(kitten.breed, breedMap);
  const sex = mapSex(kitten.sex);
  const applyUrl = applyBaseUrl
    ? `${applyBaseUrl.replace(/\/$/, '')}/adopt/apply?cat=${encodeURIComponent(externalID)}&kitten=${encodeURIComponent(kitten.name || '')}&kittenId=${kitten.id}`
    : '';
  const photosPadded = [...photos, '', '', '', ''].slice(0, 4);
  const altered = kitten.fixedStatus === 'Spayed/Neutered' ? 'Yes' : 'No';

  return {
    externalID,
    status: 'Available',
    internalID: String(kitten.id),
    rescueID: externalID,
    name: kitten.name || '',
    type: 'Cat',
    priBreed,
    secBreed: '',
    mix: '',
    sex,
    okwithdogs: mapNegativeFlag(kitten.okWithDogs),
    okwithcats: mapNegativeFlag(kitten.okWithCats),
    okwithkids: mapNegativeFlag(kitten.okWithKids),
    declawed: 'No',
    housebroken: '',
    age: ageLabel(kitten.dateOfBirth),
    specialNeeds: kitten.isMedicalSpecialNeeds || kitten.specialNeeds ? 'Yes' : '',
    altered,
    size: sizeFromGrams(kitten.latestWeightGrams),
    uptodate: '',
    color: kitten.color || '',
    pattern: kitten.coatPattern || '',
    coatLength: coatLengthFromBreed(priBreed),
    courtesy: '',
    dsc: buildDescription({ kitten, orgName, applyUrl }),
    found: '',
    foundDate: '',
    foundZipcode: '',
    photo1: photosPadded[0],
    photo2: photosPadded[1],
    photo3: photosPadded[2],
    photo4: photosPadded[3],
    videoUrl: '',
  };
}

export function rowsToCsv(rows) {
  const lines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    lines.push(CSV_HEADERS.map((header) => csvEscape(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function hashCsv(csv) {
  return createHash('sha256').update(csv).digest('hex');
}

export function buildSnapshotCsv(kittens, options = {}) {
  const eligible = kittens.filter(isSnapshotEligible);
  const rows = eligible.map((kitten) => kittenToCsvRow(kitten, options));
  const csv = rowsToCsv(rows);
  return {
    csv,
    rows,
    rowCount: rows.length,
    ids: rows.map((row) => row.externalID),
    fileHash: hashCsv(csv),
  };
}
