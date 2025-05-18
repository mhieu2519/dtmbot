const mongoose = require("mongoose");

const userXPSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  lastMessage: { type: Date, default: new Date(0) }
});

module.exports = mongoose.model("UserXP", userXPSchema);
