const UserXP = require("../models/UserXP");

function getXPForNextLevel(level) {
  return 5 * level * level + 50 * level + 100;
}

async function addXP(userId, guildId, xpAmount) {
    // Kiểm tra xpAmount hợp lệ
  if (typeof xpAmount !== 'number' || isNaN(xpAmount)) {
    console.error(`❌ Giá trị xp không hợp lệ:`, xpAmount);
    return;
  }

  let user = await UserXP.findOne({ userId, guildId });
  if (!user) user = new UserXP({ userId, guildId });

  const now = new Date();
  const cooldown = 60 * 1000; // 60s cooldown

  if (now - user.lastMessage < cooldown) return null;

  user.lastMessage = now;
  user.xp += xpAmount;

  let leveledUp = false;
  while (user.xp >= getXPForNextLevel(user.level)) {
    user.xp -= getXPForNextLevel(user.level);
    user.level++;
    leveledUp = true;
  }

  await user.save();
  return leveledUp ? user.level : null;
}

async function getUserRank(userId, guildId) {
  const users = await UserXP.find({ guildId }).sort({ level: -1, xp: -1 });
  return users.findIndex(u => u.userId === userId) + 1;
}

async function handleXP(userId, guildId, amount) {
  await addXP(userId, guildId, amount);
}

module.exports = { handleXP, getXPForNextLevel, addXP, getUserRank };
