const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();

const readArg = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) return null;
  return value;
};

const hasFlag = (flag) => process.argv.includes(flag);

const normalizeString = (value) => String(value || '').trim();
const normalizeClassSec = (value) => normalizeString(value).toUpperCase().replace(/\s+/g, '');
const normalizeAccessCode = (value) => normalizeString(value).toLowerCase().replace(/\s+/g, '');

const generateAccessCode = () => crypto.randomBytes(6).toString('base64url').slice(0, 8);

const getMongoUri = () => process.env.MONGODB_URI || process.env['MONGODB-URL'] || '';

const main = async () => {
  const name = normalizeString(readArg('--name'));
  const rollNoRaw = normalizeString(readArg('--rollNo'));
  const classSec = normalizeClassSec(readArg('--classSec'));
  const accessCode = normalizeString(readArg('--accessCode')) || generateAccessCode();
  const accessCodeNormalized = normalizeAccessCode(accessCode);

  if (!name || !rollNoRaw || !classSec) {
    console.log('Usage: node admin/create-user.js --name "John Doe" --rollNo 38 --classSec 6E [--accessCode AB9x7zK2]');
    process.exit(1);
  }

  const rollNo = Number(rollNoRaw);
  if (!Number.isFinite(rollNo)) {
    console.error('Invalid --rollNo. Provide a number.');
    process.exit(1);
  }

  const mongoUri = getMongoUri();
  if (!mongoUri) {
    console.error('Missing MongoDB URL. Set MONGODB_URI or MONGODB-URL in .env');
    process.exit(1);
  }

  const TicketUser = require('../models/TicketUser');

  try {
    await mongoose.connect(mongoUri);

    if (!hasFlag('--force')) {
      const existingRoll = await TicketUser.findOne({ rollNo, classSecNormalized: classSec }).select('_id').lean();
      if (existingRoll) {
        console.error(`User already exists for rollNo=${rollNo}, classSec=${classSec}. Use --force to add anyway.`);
        process.exit(1);
      }

      const existingCode = await TicketUser.findOne({ accessCodeNormalized }).select('_id').lean();
      if (existingCode) {
        console.error(`Access code already exists: ${accessCode}. Use --accessCode to set a different one (or --force).`);
        process.exit(1);
      }
    }

    const user = await TicketUser.create({ name, rollNo, classSec, accessCode });
    console.log('Created user:');
    console.log(`- name: ${user.name}`);
    console.log(`- rollNo: ${user.rollNo}`);
    console.log(`- classSec: ${user.classSec}`);
    console.log(`- accessCode: ${user.accessCode}`);
  } catch (err) {
    console.error('Failed to create user:', err?.message || err);
    process.exit(1);
  } finally {
    try { await mongoose.disconnect(); } catch (e) { }
  }
};

main();
