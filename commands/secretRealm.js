const UserXP = require("../models/UserXP");
const { getRandom, addXP } = require("../utils/xpSystem");
const { addItemToInventory } = require("../utils/inventory");
const hiddenItem = require("../shops/hiddenItems");
const BuffClasses = require('../buffs'); // ánh xạ effect -> class
const { runBuffHook } = require('../buffs/utils/buffEngine');
const COOLDOWN = 30 * 1000; //giảm= 30S

function chooseWeighted(scenarios) {
  const totalWeight = scenarios.reduce((sum, item) => sum + item.weight, 0);
  const rand = Math.random() * totalWeight;
  let cumulative = 0;

  for (const item of scenarios) {
    cumulative += item.weight;
    if (rand < cumulative) {
      return item;
    }
  }
}

function chonKichBanNgauNhien(scenarios) {
  const totalWeight = scenarios.reduce((sum, item) => sum + item.weight, 0);
  const random = Math.random() * totalWeight;
  let cumulativeWeight = 0;

  for (const scenario of scenarios) {
    cumulativeWeight += scenario.weight;
    if (random <= cumulativeWeight) {
      return scenario.text;
    }
  }
}



async function handleSecretRealm(interaction) {
  const userId = interaction.user.id;
  const guildId = interaction.guild.id;
  const now = new Date();

  let user = await UserXP.findOne({ userId, guildId });
  if (!user) user = new UserXP({ userId, guildId });

  if (user.lastSecretRealmTime && now - user.lastSecretRealmTime < COOLDOWN) {
    const remaining = Math.ceil((COOLDOWN - (now - user.lastSecretRealmTime)) / 1000);
    return `⏳ Đạo hữu cần nghỉ ngơi. Quay lại sau ${remaining} giây nữa.`;
  }

  const ENTRY_FEE = getRandom(50, 100);
  if (user.stone < ENTRY_FEE) {
    return `💎 Đạo hữu không đủ ${ENTRY_FEE} linh thạch để vào bí cảnh!`;
  }

  user.stone -= ENTRY_FEE;
  user.lastSecretRealmTime = now;

  const scenarios = [
    { text: "gặp yêu thú", weight: 20 },
    { text: "gặp cường giả", weight: 20 },
    { text: "kích hoạt trận pháp ẩn", weight: 5 },
    { text: "cuốc trúng mỏ linh thạch", weight: 50 },
    { text: "mở được kho báu bí cảnh", weight: 25 },
    { text: "gặp đỉnh cấp yêu thú", weight: 25 },
    { text: "tìm thấy vật phẩm ẩn giấu", weight: 2 },
    { text: "gặp được truyền thừa ẩn giấu", weight: 5 },
    { text: "gặp cường giả Hắc Ảnh Môn", weight: 5 }
  ];

  // 👉 Buff ảnh hưởng trọng số kịch bản
  runBuffHook(user, 'onScenarioWeightModify', scenarios);

  const chosen = chonKichBanNgauNhien(scenarios);
  let result = `🔮 Đạo hữu tiến vào bí cảnh và ${chosen}...\n`;

  // 👉 Tạo state cho Buff ảnh hưởng chiến đấu & phần thưởng
  const buffState = {
    winChance: 0,
    stoneBonus: 0,
    xpBonus: 0,
    preventXPLoss: false,
    encounter: chosen
  };

  runBuffHook(user, 'onBattleCheck', buffState);

  switch (chosen) {
    case "gặp yêu thú": {
      const win = Math.random() < (0.5 + buffState.winChance);
      if (win) {
        const reward = getRandom(60, 150) + Math.floor(buffState.stoneBonus);
        user.stone += reward;
        result += `🗡️ Chiến thắng yêu thú! Nhận ${reward} linh thạch.`;
      } else {
        const xpLost = getRandom(80, 160) - Math.floor(buffState.xpBonus);
        if (!buffState.preventXPLoss) {
          user.xp = Math.max(0, user.xp - xpLost);
        }
        result += `🛡️ Thất bại... Mất ${xpLost} XP.`;
      }
      break;
    }
    case "gặp cường giả": {
      const xpGain = getRandom(50, 250) + Math.floor(buffState.xpBonus);
      await addXP(userId, guildId, xpGain, interaction);
      result += `🧙 Cường giả chỉ điểm, nhận ${xpGain} XP.`;
      break;
    }
    case "cuốc trúng mỏ linh thạch": {
      const stones = getRandom(5, 250) + Math.floor(buffState.stoneBonus);
      user.stone += stones;
      result += `⛏️ Khai thác mỏ linh thạch, nhận ${stones} linh thạch.`;
      break;
    }
    case "mở được kho báu bí cảnh": {
      const xp = getRandom(100, 250) + Math.floor(buffState.xpBonus);
      const stones = getRandom(100, 250) + Math.floor(buffState.stoneBonus);
      user.stone += stones;
      await addXP(userId, guildId, xp, interaction);
      result += `🎁 Kho báu chứa ${xp} XP và ${stones} linh thạch!`;
      break;
    }
    case "gặp đỉnh cấp yêu thú": {
      const win = Math.random() < (0.15 + buffState.winChance);
      if (win) {
        const xpGain = getRandom(300, 550) + Math.floor(buffState.xpBonus);
        const stones = getRandom(100, 400) + Math.floor(buffState.stoneBonus);
        user.stone += stones;
        await addXP(userId, guildId, xpGain, interaction);
        result += `🐉 Chiến thắng đỉnh cấp yêu thú! Nhận ${xpGain} XP và ${stones}💎.`;
      } else {
        const xpLost = getRandom(150, 400) - Math.floor(buffState.xpBonus);
        if (!buffState.preventXPLoss) {
          user.xp = Math.max(0, user.xp - xpLost);
        }
        result += `🪫 Đạo hữu đã thua... Mất ${xpLost} XP.`;
      }
      break;
    }
    case "kích hoạt trận pháp ẩn": {
      const win = Math.random() < 0.25;
      if (win) {
        const stones = getRandom(300, 500) + Math.floor(buffState.stoneBonus);
        user.stone += stones;
        result += `🧭 May mắn thoát khỏi trận pháp ẩn! Nhận ${stones}💎.`;
      } else {
        const xpLost = getRandom(800, 1200) - Math.floor(buffState.xpBonus);
        user.xp = Math.max(0, user.xp - xpLost);
        result += `🧮 Đạo hữu không thể thoát ra... Tự động trừ ${xpLost} XP.`;
      }
      break;
    }
    case "gặp cường giả Hắc Ảnh Môn": {
      const win = Math.random() < 0.2;
      if (win) {
        const xpGain = getRandom(300, 500) + Math.floor(buffState.xpBonus);
        await addXP(userId, guildId, xpGain, interaction);
        result += `⚔️ Chiến thắng cường giả Hắc Ảnh Môn! Nhận ${xpGain} XP.`;
      } else {
        const xpLost = getRandom(200, 300) - Math.floor(buffState.xpBonus);
        const stones = getRandom(500, 700) - Math.floor(buffState.stoneBonus);
        user.stone = Math.max(0, user.stone - stones);
        user.xp = Math.max(0, user.xp - xpLost);
        result += `🎭 Thất bại trước cường giả Hắc Ảnh Môn... Mất ${xpLost} XP và ${stones}💎 để chạy thoát...`;
      }
      break;
    }
    case "gặp được truyền thừa ẩn giấu": {
      const xpGain = getRandom(250, 500) + Math.floor(buffState.xpBonus);
      const stones = getRandom(300, 500) + Math.floor(buffState.stoneBonus);
      user.stone += stones;
      await addXP(userId, guildId, xpGain, interaction);
      result += `📜 Nhận được truyền thừa ẩn giấu, tăng ${xpGain} XP và ${stones} linh thạch.`;
      break;
    }
    case "tìm thấy vật phẩm ẩn giấu": {
      const chosenItem = chooseWeighted(hiddenItem);
      const item = {
        itemId: chosenItem.id,
        name: chosenItem.name,
        rarity: chosenItem.rarity,
        quantity: 1,
        description: chosenItem.description
      };
      await addItemToInventory(user, item);
      result += `⚡ Tìm thấy vật phẩm ẩn giấu: **${item.name}**.\n${item.description}`;
      break;
    }
  }

  runBuffHook(user, 'onRewardCalculated', buffState);


  await user.save();
  return result;
}

module.exports = { handleSecretRealm };
