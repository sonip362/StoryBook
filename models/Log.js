const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  attemptedUsername: { type: String, default: '' },
  typedPassword: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

logSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Log', logSchema);
