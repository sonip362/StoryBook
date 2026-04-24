const mongoose = require('mongoose');

const normalizeString = (value) => String(value || '').trim();
const normalizeName = (value) => normalizeString(value).toLowerCase();
const normalizeClassSec = (value) => normalizeString(value).toUpperCase().replace(/\s+/g, '');
const normalizeAccessCode = (value) => normalizeString(value).toLowerCase().replace(/\s+/g, '');

const ticketUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameNormalized: { type: String, required: true, index: true },
    rollNo: { type: Number, required: true, index: true },
    classSec: { type: String, required: true, trim: true },
    classSecNormalized: { type: String, required: true, index: true },
    accessCode: { type: String, required: true, trim: true },
    accessCodeNormalized: { type: String, required: true, unique: true },
    easterEggs: { type: [String], default: [] },
    gems: { type: Number, default: 0 },
    // Data URL (base64) for the user's chosen profile picture (kept small)
    profilePic: { type: String, default: null },
    used: { type: Boolean, default: false },
    rewardsReceived: { type: [String], default: [] }
  },
  { timestamps: true }
);

ticketUserSchema.index({ rollNo: 1, classSecNormalized: 1 }, { unique: true });

ticketUserSchema.pre('validate', function () {
  this.nameNormalized = normalizeName(this.name);
  this.classSecNormalized = normalizeClassSec(this.classSec);
  this.accessCode = normalizeString(this.accessCode);
  this.accessCodeNormalized = normalizeAccessCode(this.accessCode);
});

module.exports = mongoose.model('TicketUser', ticketUserSchema);
