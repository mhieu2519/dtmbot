const UserXP = require("../models/UserXP");
const { getRandom, addXP } = require("../utils/xpSystem");

//const COOLDOWN = 60 * 60 * 1000; // 1 hour cooldown
const COOLDOWN =  30 * 1000; 
const ENTRY_FEE = 50;

function chooseWeighted(scenarios) {
  const totalWeight = scenarios.reduce((sum, item) => sum + item.weight, 0);
  const rand = Math.random() * totalWeight;
  let cumulative = 0;

  for (const item of scenarios) {
    cumulative += item.weight;
    if (rand < cumulative) {
      return item.text;
    }
  }
}

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
      { text: "gặp yêu thú", weight: 25 },
      { text: "gặp cường giả", weight: 15 },
      { text: "trúng mỏ linh thạch", weight: 20 },
      { text: "mở được kho báu bí cảnh", weight: 15 },
      { text: "gặp đỉnh cấp yêu thú", weight: 10 },
      { text: "gặp được truyền thừa ẩn giấu", weight: 5 }, // Tỉ lệ thấp hơn
  ];
  //const chosen = scenarios[Math.floor(Math.random() * scenarios.length)];

  // Chọn ngẫu nhiên một kịch bản dựa trên trọng số
  const chosen = chooseWeighted(scenarios);

  let result = `🔮 Đạo hữu tiến vào bí cảnh và ${chosen}...\n`;

  switch (chosen) {
 
    case "gặp yêu thú": {
      const win = Math.random() < 0.5;
      if (win) {
        const reward = getRandom(40,80); //
        user.stone += reward;
        result += `🗡️ Chiến thắng yêu thú! Nhận ${reward} linh thạch.`;
      } else {
        const xpLost = getRandom(10,50);
        user.xp = Math.max(0, user.xp - xpLost); // đảm bảo không âm XP 
        result += `☠️ Thất bại... Mất ${xpLost} XP.`;
      }
      break;
    }

    case "gặp cường giả": {
      const xpGain = getRandom(50, 120);
      await addXP(userId, guildId, xpGain, interaction);
      result += `🧙 Cường giả chỉ điểm, nhận ${xpGain} XP.`;
      break;
    }

    case "trúng mỏ linh thạch": {
      const stones = getRandom(30, 120);
      user.stone += stones;
      result += `⛏️ Khai thác mỏ linh thạch, nhận ${stones} linh thạch.`;
      break;
    }

    case "mở được kho báu bí cảnh": {
      const xp = getRandom(100, 150);
      const stones = getRandom(100, 150);
      user.stone += stones;
      await addXP(userId, guildId, xp, interaction);
      result += `🎁 Kho báu chứa ${xp} XP và ${stones} linh thạch!`;
      break;
    }

    case "gặp đỉnh cấp yêu thú": {
      const win = Math.random() < 0.3; 
      if (win) {
        const xpGain = getRandom(200, 500);
        await addXP(userId, guildId, xpGain, interaction);
        result += `🐉 Chiến thắng đỉnh cấp yêu thú! Nhận ${xpGain} XP.`;
      } else {
        const xpLost = getRandom(150, 350);
        user.xp = Math.max(0, user.xp - xpLost); // đảm bảo không âm XP 
        result += `☠️ Đạo hữu đã thua... Mất ${xpLost} XP.`;
      }
      break;
    }
   case "gặp được truyền thừa ẩn giấu": {
      const xpGain = getRandom(250, 500);
      const stones = getRandom(300, 500);
      user.stone += stones;
      await addXP(userId, guildId, xpGain, interaction);
      result += `📜 Nhận được truyền thừa ẩn giấu, tăng ${xpGain} XP và ${stones} linh thạch.`;
      break;
    }

  }

  await user.save();
  return result;
}

module.exports = { handleSecretRealm };
