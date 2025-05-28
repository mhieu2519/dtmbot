const UserXP = require("../models/UserXP");
const { getRandomXP, addXP } = require("../utils/xpSystem");

const COOLDOWN = 60 * 60 * 1000;
const ENTRY_FEE = 50;

async function handleSecretRealm(interaction) {
  const userId = interaction.user.id;
  const guildId = interaction.guild.id;
  const now = new Date();

  let user = await UserXP.findOne({ userId, guildId });
  if (!user) user = new UserXP({ userId, guildId });

  // Cooldown
  if (user.lastSecretRealmTime && now - user.lastSecretRealmTime < COOLDOWN) {
    const remaining = Math.ceil((COOLDOWN - (now - user.lastSecretRealmTime)) / 60000);
    return `⏳ Đạo hữu cần nghỉ ngơi. Quay lại sau ${remaining} phút nữa.`;
  }

  // Không đủ phí
  if (user.stone < ENTRY_FEE) {
    return `💎 Đạo hữu không đủ ${ENTRY_FEE} linh thạch để vào bí cảnh!`;
  }

  user.stone -= ENTRY_FEE;
  user.lastSecretRealmTime = now;

  const scenarios = [
    "gặp yêu thú",
    "gặp cường giả",
    "trúng mỏ linh thạch",
    "mở được kho báu bí cảnh"
  ];
  const chosen = scenarios[Math.floor(Math.random() * scenarios.length)];

  let result = `🔮 Đạo hữu tiến vào bí cảnh và ${chosen}...\n`;

  switch (chosen) {
    case "gặp yêu thú": {
      const win = Math.random() < 0.5;
      if (win) {
        const reward = Math.floor(Math.random() * 50) + 20;
        user.stone += reward;
        result += `🗡️ Chiến thắng yêu thú! Nhận ${reward} linh thạch.`;
      } else {
        const xpLost = Math.floor(Math.random() * 40) + 10;
        user.xp = Math.max(0, user.xp - xpLost);
        result += `☠️ Thất bại... Mất ${xpLost} XP.`;
      }
      break;
    }

    case "gặp cường giả": {
      const xpGain = getRandomXP(50, 100);
      await addXP(userId, guildId, xpGain, interaction);
      result += `🧙 Cường giả chỉ điểm, nhận ${xpGain} XP.`;
      break;
    }

    case "trúng mỏ linh thạch": {
      const stones = Math.floor(Math.random() * 80) + 30;
      user.stone += stones;
      result += `⛏️ Khai thác mỏ linh thạch, nhận ${stones} linh thạch.`;
      break;
    }

    case "mở được kho báu bí cảnh": {
      const xp = getRandomXP(30, 80);
      const stones = Math.floor(Math.random() * 40) + 20;
      user.stone += stones;
      await addXP(userId, guildId, xp, interaction);
      result += `🎁 Kho báu chứa ${xp} XP và ${stones} linh thạch!`;
      break;
    }
  }

  await user.save();
  return result;
}

module.exports = { handleSecretRealm };
