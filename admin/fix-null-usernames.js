const mongoose = require('mongoose');
require('dotenv').config();

const TicketUser = require('../models/TicketUser');

const getMongoUri = () => process.env.MONGODB_URI || process.env['MONGODB-URL'] || '';

async function run() {
  const mongoUri = getMongoUri();
  if (!mongoUri) {
    console.error('Missing MongoDB URL. Set MONGODB_URI or MONGODB-URL in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find users where usernameNormalized is null and unset it
    const result = await TicketUser.updateMany(
      { usernameNormalized: null },
      { $unset: { username: "", usernameNormalized: "" } }
    );

    console.log(`Cleanup complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    
    // Also check for users with empty string if any
    const resultEmpty = await TicketUser.updateMany(
      { usernameNormalized: "" },
      { $unset: { username: "", usernameNormalized: "" } }
    );
    console.log(`Cleanup empty strings complete. Matched: ${resultEmpty.matchedCount}, Modified: ${resultEmpty.modifiedCount}`);

  } catch (err) {
    console.error('Cleanup failed:', err?.message || err);
    process.exit(1);
  } finally {
    try { await mongoose.disconnect(); } catch (e) { }
  }
}

run();
