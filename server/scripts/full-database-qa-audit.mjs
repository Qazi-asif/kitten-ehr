import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

const SCHEMA_MODELS = [
  'Litter', 'Foster', 'Kitten', 'Update', 'Sponsorship', 'Placement', 'WeightLog',
  'Vaccine', 'Medication', 'VetAppointment', 'Document', 'Application', 'ContractTemplate',
  'Contract', 'ContractHouseholdAcknowledgment', 'FosterOnboarding', 'OnboardingChecklist',
  'ApplicationUpload', 'Content', 'ContentCompletion', 'Event', 'EventRSVP', 'EventCats',
  'Role', 'Permission', 'RolePermission', 'User', 'PasswordResetToken', 'Protocol',
  'ProtocolDrug', 'ActiveProtocol', 'ProtocolDose', 'Settings', 'EmailTemplate', 'EmailLog',
  'Transaction', 'Wishlist', 'SocialPost',
];

// User checklist vs schema
const USER_CHECKLIST = [
  'Kitten', 'Foster', 'Application', 'Placement', 'Contract', 'ContractHouseholdAcknowledgment',
  'ContractTemplate', 'Document', 'User', 'Role', 'RolePermission', 'PasswordResetToken',
  'Settings', 'Wishlist', 'ActiveProtocol', 'ProtocolDose', 'EmailLog', 'OnboardingChecklist',
  'ContentCompletion',
];

const ORPHAN_CHECKS = [
  ['Kitten.litterId', 'Kitten', 'Litter', 'k."litterId"', 'l.id', 'k."litterId" IS NOT NULL'],
  ['Kitten.bondedWithKittenId', 'Kitten', 'Kitten', 'k."bondedWithKittenId"', 'b.id', 'k."bondedWithKittenId" IS NOT NULL'],
  ['Kitten.currentFosterId', 'Kitten', 'Foster', 'k."currentFosterId"', 'f.id', 'k."currentFosterId" IS NOT NULL'],
  ['Update.kittenId', 'Update', 'Kitten', 'u."kittenId"', 'k.id', 'TRUE'],
  ['Sponsorship.kittenId', 'Sponsorship', 'Kitten', 's."kittenId"', 'k.id', 'TRUE'],
  ['Placement.kittenId', 'Placement', 'Kitten', 'p."kittenId"', 'k.id', 'TRUE'],
  ['Placement.fosterId', 'Placement', 'Foster', 'p."fosterId"', 'f.id', 'TRUE'],
  ['WeightLog.kittenId', 'WeightLog', 'Kitten', 'w."kittenId"', 'k.id', 'TRUE'],
  ['Vaccine.kittenId', 'Vaccine', 'Kitten', 'v."kittenId"', 'k.id', 'TRUE'],
  ['Medication.kittenId', 'Medication', 'Kitten', 'm."kittenId"', 'k.id', 'TRUE'],
  ['VetAppointment.kittenId', 'VetAppointment', 'Kitten', 'va."kittenId"', 'k.id', 'TRUE'],
  ['Document.kittenId', 'Document', 'Kitten', 'd."kittenId"', 'k.id', 'TRUE'],
  ['Application.rejectedById', 'Application', 'User', 'a."rejectedById"', 'u.id', 'a."rejectedById" IS NOT NULL'],
  ['Contract.kittenId', 'Contract', 'Kitten', 'c."kittenId"', 'k.id', 'c."kittenId" IS NOT NULL'],
  ['Contract.fosterId', 'Contract', 'Foster', 'c."fosterId"', 'f.id', 'c."fosterId" IS NOT NULL'],
  ['Contract.applicationId', 'Contract', 'Application', 'c."applicationId"', 'a.id', 'c."applicationId" IS NOT NULL'],
  ['ContractHouseholdAcknowledgment.contractId', 'ContractHouseholdAcknowledgment', 'Contract', 'h."contractId"', 'c.id', 'TRUE'],
  ['OnboardingChecklist.onboardingId', 'OnboardingChecklist', 'FosterOnboarding', 'oc."onboardingId"', 'fo.id', 'TRUE'],
  ['OnboardingChecklist.completedBy', 'OnboardingChecklist', 'User', 'oc."completedBy"', 'u.id', 'oc."completedBy" IS NOT NULL'],
  ['ApplicationUpload.applicationId', 'ApplicationUpload', 'Application', 'au."applicationId"', 'a.id', 'TRUE'],
  ['ContentCompletion.userId', 'ContentCompletion', 'User', 'cc."userId"', 'u.id', 'TRUE'],
  ['ContentCompletion.contentId', 'ContentCompletion', 'Content', 'cc."contentId"', 'c.id', 'TRUE'],
  ['EventRSVP.eventId', 'EventRSVP', 'Event', 'er."eventId"', 'e.id', 'TRUE'],
  ['EventCats.eventId', 'EventCats', 'Event', 'ec."eventId"', 'e.id', 'TRUE'],
  ['EventCats.kittenId', 'EventCats', 'Kitten', 'ec."kittenId"', 'k.id', 'TRUE'],
  ['RolePermission.roleId', 'RolePermission', 'Role', 'rp."roleId"', 'r.id', 'TRUE', 'roleId, permissionId'],
  ['RolePermission.permissionId', 'RolePermission', 'Permission', 'rp."permissionId"', 'p.id', 'TRUE', 'roleId, permissionId'],
  ['User.roleId', 'User', 'Role', 'u."roleId"', 'r.id', 'TRUE'],
  ['User.fosterId', 'User', 'Foster', 'u."fosterId"', 'f.id', 'u."fosterId" IS NOT NULL'],
  ['PasswordResetToken.userId', 'PasswordResetToken', 'User', 't."userId"', 'u.id', 'TRUE'],
  ['ProtocolDrug.protocolId', 'ProtocolDrug', 'Protocol', 'pd."protocolId"', 'pr.id', 'TRUE'],
  ['ActiveProtocol.protocolId', 'ActiveProtocol', 'Protocol', 'ap."protocolId"', 'pr.id', 'TRUE'],
  ['ActiveProtocol.kittenId', 'ActiveProtocol', 'Kitten', 'ap."kittenId"', 'k.id', 'TRUE'],
  ['ActiveProtocol.activatedById', 'ActiveProtocol', 'User', 'ap."activatedById"', 'u.id', 'TRUE'],
  ['ProtocolDose.activeProtocolId', 'ProtocolDose', 'ActiveProtocol', 'd."activeProtocolId"', 'ap.id', 'TRUE'],
  ['ProtocolDose.protocolDrugId', 'ProtocolDose', 'ProtocolDrug', 'd."protocolDrugId"', 'pd.id', 'TRUE'],
  ['ProtocolDose.administeredById', 'ProtocolDose', 'User', 'd."administeredById"', 'u.id', 'd."administeredById" IS NOT NULL'],
  ['Transaction.kittenId', 'Transaction', 'Kitten', 't."kittenId"', 'k.id', 't."kittenId" IS NOT NULL'],
];

const findings = [];

function add(f) {
  findings.push(f);
}

async function countTable(table) {
  try {
    const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "${table}"`);
    return rows[0].count;
  } catch (error) {
    if (table === 'SocialPost') {
      const rows = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM social_posts');
      return rows[0].count;
    }
    throw error;
  }
}

async function runOrphan(label, childTable, parentTable, childCol, parentCol, whereClause, aliasMap, selectCols = 'id') {
  const c = aliasMap?.[`${childTable}@child`] || aliasMap?.[childTable] || 'c';
  const p = aliasMap?.[`${parentTable}@parent`] || aliasMap?.[parentTable] || 'p';
  const selectExpr = selectCols.includes(',')
    ? selectCols.split(',').map((col) => `${c}."${col.trim()}"`).join(', ')
    : `${c}."${selectCols}"`;
  const sql = `SELECT ${selectExpr} FROM "${childTable}" ${c} LEFT JOIN "${parentTable}" ${p} ON ${p}.id = ${childCol} WHERE ${whereClause} AND ${p}.id IS NULL`;
  const rows = await prisma.$queryRawUnsafe(sql);
  add({
    finding: `Orphan FK: ${label}`,
    table: childTable,
    count: rows.length,
    severity: rows.length > 0 ? 'structural bug' : 'informational',
    approach: sql,
    sample: rows.slice(0, 5),
  });
  return rows.length;
}

async function main() {
  console.log('=== SCHEMA COVERAGE ===');
  const missingFromUserList = SCHEMA_MODELS.filter((m) => !USER_CHECKLIST.includes(m));
  const userListNotInSchema = USER_CHECKLIST.filter((m) => !SCHEMA_MODELS.includes(m));
  console.log('Schema models (38):', SCHEMA_MODELS.join(', '));
  console.log('User checklist missing from prompt:', missingFromUserList.join(', '));
  console.log('Prompt names not in schema (ProtocolTemplate):', userListNotInSchema.filter((m) => m !== 'ProtocolTemplate').join(', ') || 'none except ProtocolTemplate');
  console.log('Note: ProtocolTemplate does NOT exist. Actual protocol models: Protocol, ProtocolDrug, ActiveProtocol, ProtocolDose');
  console.log('');

  console.log('=== ROW COUNTS (ALL TABLES) ===');
  const rowCounts = {};
  for (const table of SCHEMA_MODELS) {
    const count = await countTable(table);
    rowCounts[table] = count;
    console.log(`${table}: ${count}`);
  }
  console.log('');

  console.log('=== ORPHAN FK CHECKS ===');
  const aliasOverrides = {
    Kitten: { 'Kitten@child': 'k', 'Kitten@parent': 'b', Litter: 'l', Foster: 'f' },
    Update: { Update: 'u', Kitten: 'k' },
    Sponsorship: { Sponsorship: 's', Kitten: 'k' },
    Placement: { Placement: 'p', Kitten: 'k', Foster: 'f' },
    WeightLog: { WeightLog: 'w', Kitten: 'k' },
    Vaccine: { Vaccine: 'v', Kitten: 'k' },
    Medication: { Medication: 'm', Kitten: 'k' },
    VetAppointment: { VetAppointment: 'va', Kitten: 'k' },
    Document: { Document: 'd', Kitten: 'k' },
    Application: { Application: 'a', User: 'u' },
    Contract: { Contract: 'c', Kitten: 'k', Foster: 'f', Application: 'a' },
    ContractHouseholdAcknowledgment: { ContractHouseholdAcknowledgment: 'h', Contract: 'c' },
    OnboardingChecklist: { OnboardingChecklist: 'oc', FosterOnboarding: 'fo', User: 'u' },
    ApplicationUpload: { ApplicationUpload: 'au', Application: 'a' },
    ContentCompletion: { ContentCompletion: 'cc', User: 'u', Content: 'c' },
    EventRSVP: { EventRSVP: 'er', Event: 'e' },
    EventCats: { EventCats: 'ec', Event: 'e', Kitten: 'k' },
    RolePermission: { RolePermission: 'rp', Role: 'r', Permission: 'p' },
    User: { User: 'u', Role: 'r', Foster: 'f' },
    PasswordResetToken: { PasswordResetToken: 't', User: 'u' },
    ProtocolDrug: { ProtocolDrug: 'pd', Protocol: 'pr' },
    ActiveProtocol: { ActiveProtocol: 'ap', Protocol: 'pr', Kitten: 'k', User: 'u' },
    ProtocolDose: { ProtocolDose: 'd', ActiveProtocol: 'ap', ProtocolDrug: 'pd', User: 'u' },
    Transaction: { Transaction: 't', Kitten: 'k' },
  };

  for (const row of ORPHAN_CHECKS) {
    const [label, child, parent, childCol, parentCol, where, selectCols = 'id'] = row;
    const count = await runOrphan(label, child, parent, childCol, parentCol, where, aliasOverrides[child], selectCols);
    console.log(`${label}: ${count}`);
  }

  // --- Cross-module consistency ---
  const currentFosterVsOpenPlacementSql = `
    SELECT k.id, k.name, k."currentFosterId",
      (SELECT p."fosterId" FROM "Placement" p WHERE p."kittenId" = k.id AND p."dischargeDate" IS NULL ORDER BY p."intakeDate" DESC LIMIT 1) AS open_placement_foster
    FROM "Kitten" k
    WHERE (
      (k."currentFosterId" IS NULL AND EXISTS (SELECT 1 FROM "Placement" p WHERE p."kittenId" = k.id AND p."dischargeDate" IS NULL))
      OR (k."currentFosterId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Placement" p WHERE p."kittenId" = k.id AND p."dischargeDate" IS NULL AND p."fosterId" = k."currentFosterId"))
      OR (k."currentFosterId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Placement" p WHERE p."kittenId" = k.id AND p."dischargeDate" IS NULL))
    )
  `;
  const fosterPlacementMismatch = await prisma.$queryRawUnsafe(currentFosterVsOpenPlacementSql);
  add({
    finding: 'Kitten.currentFosterId disagrees with open Placement',
    table: 'Kitten + Placement',
    count: fosterPlacementMismatch.length,
    severity: fosterPlacementMismatch.length > 0 ? 'structural bug' : 'informational',
    approach: currentFosterVsOpenPlacementSql.trim(),
    sample: fosterPlacementMismatch,
  });

  const adoptedStatusSql = `
    SELECT DISTINCT k.id, k.name, k.status
    FROM "Kitten" k
    JOIN "Contract" c ON c."kittenId" = k.id
    WHERE c.type = 'ADOPTION' AND c.status = 'SIGNED' AND k.status <> 'Adopted'
  `;
  const adoptedStatusMismatch = await prisma.$queryRawUnsafe(adoptedStatusSql);
  add({
    finding: 'Kitten has signed ADOPTION contract but status is not Adopted',
    table: 'Kitten + Contract',
    count: adoptedStatusMismatch.length,
    severity: adoptedStatusMismatch.length > 0 ? 'stale-but-harmless' : 'informational',
    approach: adoptedStatusSql.trim(),
    sample: adoptedStatusMismatch,
  });

  const contractFosterNoPlacementSql = `
    SELECT c.id AS contract_id, c."kittenId", c."fosterId", c.type, c.status
    FROM "Contract" c
    WHERE c."fosterId" IS NOT NULL AND c."kittenId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "Placement" p
        WHERE p."kittenId" = c."kittenId" AND p."fosterId" = c."fosterId"
      )
  `;
  const contractFosterNoPlacement = await prisma.$queryRawUnsafe(contractFosterNoPlacementSql);
  add({
    finding: 'Contract fosterId+kittenId with no Placement history for that pair',
    table: 'Contract + Placement',
    count: contractFosterNoPlacement.length,
    severity: contractFosterNoPlacement.length > 0 ? 'informational' : 'informational',
    approach: contractFosterNoPlacementSql.trim(),
    sample: contractFosterNoPlacement,
    note: 'May be valid for drafts; flag for manual review',
  });

  const duplicateActiveProtocolSql = `
    SELECT "kittenId", "protocolId", COUNT(*)::int AS cnt
    FROM "ActiveProtocol"
    WHERE status = 'ACTIVE'
    GROUP BY "kittenId", "protocolId"
    HAVING COUNT(*) > 1
  `;
  const duplicateActiveProtocols = await prisma.$queryRawUnsafe(duplicateActiveProtocolSql);
  add({
    finding: 'Duplicate ACTIVE ActiveProtocol per kitten+protocol',
    table: 'ActiveProtocol',
    count: duplicateActiveProtocols.length,
    severity: duplicateActiveProtocols.length > 0 ? 'structural bug' : 'informational',
    approach: duplicateActiveProtocolSql.trim(),
    sample: duplicateActiveProtocols,
  });

  const doseOrphanProtocolSql = `
    SELECT d.id FROM "ProtocolDose" d
    LEFT JOIN "ActiveProtocol" ap ON ap.id = d."activeProtocolId"
    WHERE ap.id IS NULL
  `;
  const doseOrphans = await prisma.$queryRawUnsafe(doseOrphanProtocolSql);
  add({
    finding: 'ProtocolDose with missing ActiveProtocol parent',
    table: 'ProtocolDose',
    count: doseOrphans.length,
    severity: doseOrphans.length > 0 ? 'structural bug' : 'informational',
    approach: doseOrphanProtocolSql.trim(),
    sample: doseOrphans,
  });

  const portalUserChecks = [
    {
      sql: `SELECT u.id, u.email, u."fosterId", r.name, r."isPortalRole" FROM "User" u JOIN "Role" r ON r.id = u."roleId" WHERE u."fosterId" IS NOT NULL AND r."isPortalRole" = false`,
      finding: 'User has fosterId but role.isPortalRole=false',
      severity: 'structural bug',
    },
    {
      sql: `SELECT u.id, u.email, u."fosterId", r.name FROM "User" u JOIN "Role" r ON r.id = u."roleId" WHERE r."isPortalRole" = true AND u."fosterId" IS NULL`,
      finding: 'Portal role user without fosterId',
      severity: 'stale-but-harmless',
    },
    {
      sql: `SELECT u.id, u.email, r.name FROM "User" u JOIN "Role" r ON r.id = u."roleId" WHERE r."isPortalRole" = true`,
      finding: 'All portal-role users (inventory)',
      severity: 'informational',
    },
    {
      sql: `SELECT u.id, u.email, r.name FROM "User" u JOIN "Role" r ON r.id = u."roleId" WHERE r."isPortalRole" = false AND r.name = 'Foster Parent'`,
      finding: 'Users on legacy Foster Parent role (not portal flag)',
      severity: 'informational',
    },
  ];
  for (const check of portalUserChecks) {
    const rows = await prisma.$queryRawUnsafe(check.sql);
    add({
      finding: check.finding,
      table: 'User + Role',
      count: rows.length,
      severity: rows.length > 0 && check.severity !== 'informational' ? check.severity : rows.length > 0 ? check.severity : 'informational',
      approach: check.sql.trim(),
      sample: rows.slice(0, 10),
    });
  }

  // Wishlist polymorphic integrity
  const wishlistOrphanSql = `
    SELECT w.id, w."ownerType", w."ownerId"
    FROM "Wishlist" w
    WHERE (w."ownerType" = 'KITTEN' AND NOT EXISTS (SELECT 1 FROM "Kitten" k WHERE k.id = w."ownerId"))
       OR (w."ownerType" = 'FOSTER' AND NOT EXISTS (SELECT 1 FROM "Foster" f WHERE f.id = w."ownerId"))
       OR (w."ownerType" = 'ORG' AND w."ownerId" <> 1)
  `;
  const wishlistOrphans = await prisma.$queryRawUnsafe(wishlistOrphanSql);
  add({
    finding: 'Wishlist ownerId points at missing Kitten/Foster or invalid ORG id',
    table: 'Wishlist',
    count: wishlistOrphans.length,
    severity: wishlistOrphans.length > 0 ? 'structural bug' : 'informational',
    approach: wishlistOrphanSql.trim(),
    sample: wishlistOrphans,
    note: 'ORG ownerId=1 assumed for Settings singleton — verify if convention differs',
  });

  // Data quality
  const qualityChecks = [
    {
      finding: 'Duplicate User.email',
      sql: `SELECT email, COUNT(*)::int cnt FROM "User" GROUP BY email HAVING COUNT(*) > 1`,
      table: 'User',
      severity: 'structural bug',
    },
    {
      finding: 'Foster rows with empty email',
      sql: `SELECT id, name, email FROM "Foster" WHERE TRIM(email) = ''`,
      table: 'Foster',
      severity: 'structural bug',
    },
    {
      finding: 'Kitten rows with empty name',
      sql: `SELECT id, name FROM "Kitten" WHERE TRIM(name) = ''`,
      table: 'Kitten',
      severity: 'structural bug',
    },
    {
      finding: 'Kitten thumbnail without primary photo',
      sql: `SELECT id, name FROM "Kitten" WHERE "thumbnailUrl" IS NOT NULL AND COALESCE("primaryPhotoUrl",'') = ''`,
      table: 'Kitten',
      severity: 'stale-but-harmless',
    },
    {
      finding: 'SIGNED Contract missing e-signature metadata (frozen/sig/IP)',
      sql: `SELECT id, "signedAt" FROM "Contract" WHERE status='SIGNED' AND (COALESCE("frozenAgreementText",'')='' OR COALESCE("signatureImageUrl",'')='' OR COALESCE("signedIpAddress",'')='')`,
      table: 'Contract',
      severity: 'stale-but-harmless',
    },
    {
      finding: 'signedIpAddress = 192.0.2.1 placeholder',
      sql: `SELECT id FROM "Contract" WHERE "signedIpAddress" = '192.0.2.1'`,
      table: 'Contract',
      severity: 'structural bug',
    },
    {
      finding: 'SIGNED contract with null signedAt',
      sql: `SELECT id FROM "Contract" WHERE status='SIGNED' AND "signedAt" IS NULL`,
      table: 'Contract',
      severity: 'structural bug',
    },
    {
      finding: 'Duplicate User.fosterId',
      sql: `SELECT "fosterId", COUNT(*)::int cnt FROM "User" WHERE "fosterId" IS NOT NULL GROUP BY "fosterId" HAVING COUNT(*) > 1`,
      table: 'User',
      severity: 'structural bug',
    },
    {
      finding: 'Expired unused PasswordResetToken',
      sql: `SELECT id, "userId", purpose, "expiresAt" FROM "PasswordResetToken" WHERE "expiresAt" < NOW() AND "usedAt" IS NULL`,
      table: 'PasswordResetToken',
      severity: 'informational',
    },
  ];
  for (const q of qualityChecks) {
    const rows = await prisma.$queryRawUnsafe(q.sql);
    add({
      finding: q.finding,
      table: q.table,
      count: rows.length,
      severity: rows.length > 0 ? q.severity : 'informational',
      approach: q.sql.trim(),
      sample: rows.slice(0, 10),
    });
  }

  // Test/QA leftover data patterns
  const testPatterns = [
    { label: 'Kitten test names', sql: `SELECT id, name FROM "Kitten" WHERE name ILIKE '%test%' OR name ILIKE '%do not use%' OR name ILIKE '%qa%'` },
    { label: 'Foster test names/emails', sql: `SELECT id, name, email FROM "Foster" WHERE name ILIKE '%test%' OR email ILIKE '%test%' OR name ILIKE '%do not use%'` },
    { label: 'Application test data in formData', sql: `SELECT id, type, status, LEFT("formData", 120) AS form_preview FROM "Application" WHERE "formData" ILIKE '%test%' OR "formData" ILIKE '%testerson%'` },
    { label: 'User test emails', sql: `SELECT id, email, "firstName", "lastName" FROM "User" WHERE email ILIKE '%test%' OR "firstName" ILIKE '%test%' OR "lastName" ILIKE '%testerson%'` },
    { label: 'Protocol test names', sql: `SELECT id, name FROM "Protocol" WHERE name ILIKE '%test%' OR name ILIKE '%qa%' OR name ILIKE '%disposable%'` },
    { label: 'Contract test signer names', sql: `SELECT id, "signerName", "signerEmail" FROM "Contract" WHERE "signerName" ILIKE '%test%' OR "signerEmail" ILIKE '%test%'` },
    { label: 'Transaction test descriptions', sql: `SELECT id, description, "donorName" FROM "Transaction" WHERE description ILIKE '%test%' OR "donorName" ILIKE '%test%'` },
    { label: 'Litter test names', sql: `SELECT id, name FROM "Litter" WHERE name ILIKE '%test%'` },
  ];
  for (const t of testPatterns) {
    const rows = await prisma.$queryRawUnsafe(t.sql);
    add({
      finding: `Leftover test/QA data: ${t.label}`,
      table: t.label,
      count: rows.length,
      severity: rows.length > 0 ? 'leftover test data' : 'informational',
      approach: t.sql.trim(),
      sample: rows,
    });
  }

  // Application email overlap with Foster (informational)
  const appFosterEmailSql = `
    SELECT f.email AS foster_email, a.id AS application_id, a.type
    FROM "Foster" f
    JOIN "Application" a ON LOWER(TRIM(a."formData")) LIKE '%' || LOWER(TRIM(f.email)) || '%'
  `;
  try {
    const overlap = await prisma.$queryRawUnsafe(appFosterEmailSql);
    add({
      finding: 'Application formData loosely contains Foster email (heuristic)',
      table: 'Application + Foster',
      count: overlap.length,
      severity: 'informational',
      approach: appFosterEmailSql.trim(),
      sample: overlap.slice(0, 5),
      note: 'Heuristic only — not definitive duplicate',
    });
  } catch {
    // ignore
  }

  // Inventory key entities
  const inventorySql = {
    kittens: `SELECT id, name, status, "currentFosterId" FROM "Kitten" ORDER BY id`,
    fosters: `SELECT id, name, email FROM "Foster" ORDER BY id`,
    users: `SELECT u.id, u.email, r.name AS role, r."isPortalRole", u."fosterId" FROM "User" u JOIN "Role" r ON r.id=u."roleId"`,
    roles: `SELECT id, name, "isPortalRole", "isSystem" FROM "Role" ORDER BY id`,
    contracts: `SELECT id, type, status, "kittenId", "fosterId", "signedAt" FROM "Contract" ORDER BY id`,
  };
  const inventory = {};
  for (const [k, sql] of Object.entries(inventorySql)) {
    inventory[k] = await prisma.$queryRawUnsafe(sql);
  }

  console.log('\n=== SUMMARY ===');
  const bugs = findings.filter((f) => f.severity === 'structural bug' && f.count > 0);
  const stale = findings.filter((f) => f.severity === 'stale-but-harmless' && f.count > 0);
  const testData = findings.filter((f) => f.severity === 'leftover test data' && f.count > 0);
  console.log(`Structural bugs with count>0: ${bugs.length}`);
  console.log(`Stale-but-harmless with count>0: ${stale.length}`);
  console.log(`Leftover test data with count>0: ${testData.length}`);
  console.log(JSON.stringify({ rowCounts, schemaCoverage: { models: SCHEMA_MODELS, userChecklistGaps: missingFromUserList }, inventory, findings }, (k, v) =>
    typeof v === 'bigint' ? String(v) : v instanceof Date ? v.toISOString() : v,
  null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
