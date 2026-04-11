const mongoose = require('mongoose');
require('dotenv').config();

const TicketUser = require('../models/TicketUser');

const getMongoUri = () => process.env.MONGODB_URI || process.env['MONGODB-URL'] || '';
const normalizeString = (value) => String(value || '').trim();
const normalizeAccessCode = (value) => normalizeString(value).toLowerCase().replace(/\s+/g, '');

const readArg = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) return null;
  return value;
};

async function run() {
  const mongoUri = getMongoUri();
  if (!mongoUri) {
    console.error('Missing MongoDB URL. Set MONGODB_URI or MONGODB-URL in .env');
    process.exit(1);
  }

  const accessCode = normalizeAccessCode(readArg('--accessCode'));
  if (!accessCode) {
    console.log('Usage: node admin/lookup-user.js --accessCode AB9x7zK2');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    const user = await TicketUser.findOne({ accessCodeNormalized: accessCode })
      .select('name rollNo classSec accessCode accessCodeNormalized')
      .lean();

    if (!user) {
      console.log('No user found for that access code.');
      process.exit(2);
    }

    console.log('Found user:');
    console.log(`- name: ${user.name}`);
    console.log(`- rollNo: ${user.rollNo}`);
    console.log(`- classSec: ${user.classSec}`);
    console.log(`- accessCode: ${user.accessCode}`);
  } catch (err) {
    console.error('Lookup failed:', err?.message || err);
    process.exit(1);
  } finally {
    try { await mongoose.disconnect(); } catch (e) { }
  }
}

run();

