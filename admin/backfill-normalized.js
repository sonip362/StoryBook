const mongoose = require('mongoose');
require('dotenv').config();

const TicketUser = require('../models/TicketUser');

const getMongoUri = () => process.env.MONGODB_URI || process.env['MONGODB-URL'] || '';
const normalizeString = (value) => String(value || '').trim();
const normalizeName = (value) => normalizeString(value).toLowerCase();
const normalizeClassSec = (value) => normalizeString(value).toUpperCase().replace(/\s+/g, '');
const normalizeAccessCode = (value) => normalizeString(value).toLowerCase().replace(/\s+/g, '');

async function run() {
  const mongoUri = getMongoUri();
  if (!mongoUri) {
    console.error('Missing MongoDB URL. Set MONGODB_URI or MONGODB-URL in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const cursor = TicketUser.find({}).cursor();
    let updated = 0;
    let total = 0;

    for await (const doc of cursor) {
      total += 1;
      const nameNormalized = normalizeName(doc.name);
      const classSecNormalized = normalizeClassSec(doc.classSec);
      const accessCode = normalizeString(doc.accessCode);
      const accessCodeNormalized = normalizeAccessCode(doc.accessCodeNormalized || doc.accessCode);

      const needs =
        doc.nameNormalized !== nameNormalized ||
        doc.classSecNormalized !== classSecNormalized ||
        doc.accessCode !== accessCode ||
        doc.accessCodeNormalized !== accessCodeNormalized;

      if (!needs) continue;

      await TicketUser.updateOne(
        { _id: doc._id },
        { $set: { nameNormalized, classSecNormalized, accessCode, accessCodeNormalized } }
      );
      updated += 1;
    }

    console.log(`Backfill complete. Updated: ${updated} / ${total}`);
  } catch (err) {
    console.error('Backfill failed:', err?.message || err);
    process.exit(1);
  } finally {
    try { await mongoose.disconnect(); } catch (e) { }
  }
}

run();
