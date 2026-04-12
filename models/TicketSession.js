const mongoose = require('mongoose');

const ticketSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    user: {
      name: { type: String, required: true },
      rollNo: { type: Number, required: true },
      classSec: { type: String, required: true }
    },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// Automatically delete expired sessions
ticketSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TicketSession', ticketSessionSchema);

