const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const TicketUser = require('../models/TicketUser');

const getMongoUri = () => process.env.MONGODB_URI || process.env['MONGODB-URL'] || '';

const parseArgs = () => {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has('--dry-run'),
    skipExisting: args.has('--skip-existing')
  };
};

const normalizeString = (value) => String(value || '').trim();
const normalizeClassSec = (value) => normalizeString(value).toUpperCase().replace(/\s+/g, '');
const normalizeName = (value) => normalizeString(value).toLowerCase();
const normalizeAccessCode = (value) => normalizeString(value).toLowerCase().replace(/\s+/g, '');

const normalizeUser = (item) => ({
  name: normalizeString(item?.name),
  nameNormalized: normalizeName(item?.name),
  rollNo: Number(item?.rollNo),
  classSec: normalizeClassSec(item?.classSec),
  classSecNormalized: normalizeClassSec(item?.classSec),
  accessCode: normalizeString(item?.accessCode),
  accessCodeNormalized: normalizeAccessCode(item?.accessCode)
});

async function migrate() {
  const { dryRun, skipExisting } = parseArgs();
  const mongoUri = getMongoUri();

  if (!mongoUri) {
    console.error('Missing MongoDB URL. Set MONGODB_URI or MONGODB-URL in .env');
    process.exit(1);
  }

  const usersPath = path.join(__dirname, '..', 'users.json');
  const parsed = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  const users = Array.isArray(parsed) ? parsed : [parsed];

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    for (const item of users) {
      const u = normalizeUser(item);

      if (!u.name || !Number.isFinite(u.rollNo) || !u.classSec || !u.accessCode) {
        console.log('Skipped invalid user row');
        skipped += 1;
        continue;
      }

      const existing = await TicketUser.findOne({ rollNo: u.rollNo, classSecNormalized: u.classSec }).select('_id').lean();
      if (existing && skipExisting) {
        console.log(`Skipped (exists): rollNo=${u.rollNo}, classSec=${u.classSec}`);
        skipped += 1;
        continue;
      }

      if (dryRun) {
        console.log(`${existing ? 'Would update' : 'Would insert'}: ${u.name} (${u.rollNo}-${u.classSec})`);
        continue;
      }

      await TicketUser.updateOne(
        { rollNo: u.rollNo, classSecNormalized: u.classSec },
        {
          $set: {
            name: u.name,
            nameNormalized: u.nameNormalized,
            rollNo: u.rollNo,
            classSec: u.classSec,
            classSecNormalized: u.classSecNormalized,
            accessCode: u.accessCode,
            accessCodeNormalized: u.accessCodeNormalized
          }
        },
        { upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );

      if (existing) updated += 1;
      else inserted += 1;
    }

    if (dryRun) console.log('\nDry run complete (no DB writes).');
    else console.log(`\nMigration complete. Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
  } catch (err) {
    console.error('Migration failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    try { await mongoose.disconnect(); } catch (e) { }
  }
}

migrate();
