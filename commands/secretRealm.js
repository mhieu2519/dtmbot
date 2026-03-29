const UserXP = require("../models/UserXP");
const { getRandom, addXP } = require("../utils/xpSystem");
const { addItemToInventory } = require("../utils/inventory");
const hiddenItem = require("../shops/hiddenItems");
const BuffClasses = require('../buffs'); // ánh xạ effect -> class
const { runBuffHook } = require('../buffs/utils/buffEngine');
const { handleAncientRuin } = require("../utils/ancientRuin");
const COOLDOWN = 15 * 1000; //giảm= 20S

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
    { text: "gặp cường giả", weight: 25 },
    { text: "kích hoạt trận pháp ẩn", weight: 5 },
    { text: "cuốc trúng mỏ linh thạch", weight: 40 },
    { text: "mở được kho báu bí cảnh", weight: 25 },
    { text: "gặp đỉnh cấp yêu thú", weight: 25 },
    { text: "tìm thấy vật phẩm ẩn giấu", weight: 25 },
    { text: "gặp được truyền thừa ẩn giấu", weight: 5 },
    { text: "gặp cường giả Hắc Ảnh Môn", weight: 5 },
    { text: "bị cuốn vào không gian loạn lưu", weight: 1 },
    { text: "phát hiện di tích cổ bị phong ấn", weight: 10 },
    { text: "bị đánh lén bởi đệ tử Hắc Ảnh Môn ", weight: 5 },
    { text: "phát hiện di tích chiến trường thượng cổ", weight: 7 },
    { text: "gặp phải cạm bẫy linh lực", weight: 8 },
    { text: "gặp cơ duyên ngộ đạo", weight: 1 },

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
        result += `🛡️ Thất bại... Mất ${xpLost} Tuvi.`;
      }
      break;
    }
    case "gặp cường giả": {
      const xpGain = getRandom(60, 250) + Math.floor(buffState.xpBonus);
      await addXP(userId, guildId, xpGain, interaction);
      result += `🧙 Cường giả chỉ điểm, tăng ${xpGain} Tuvi.`;
      break;
    }
    case "cuốc trúng mỏ linh thạch": {
      const stones = getRandom(5, 1000) + Math.floor(buffState.stoneBonus);
      user.stone += stones;
      result += `⛏️ Khai thác mỏ linh thạch, nhận ${stones} linh thạch.`;
      break;
    }
    case "mở được kho báu bí cảnh": {
      const xp = getRandom(200, 550) + Math.floor(buffState.xpBonus);
      const stones = getRandom(200, 550) + Math.floor(buffState.stoneBonus);
      user.stone += stones;
      await addXP(userId, guildId, xp, interaction);
      result += `🎁 Kho báu chứa ${stones} linh thạch và kích hoạt tăng ${xp} Tuvi!`;
      break;
    }
    case "gặp đỉnh cấp yêu thú": {
      const win = Math.random() < (0.25 + buffState.winChance);
      if (win) {
        const xpGain = getRandom(300, 650) + Math.floor(buffState.xpBonus);
        const stones = getRandom(100, 500) + Math.floor(buffState.stoneBonus);
        user.stone += stones;
        await addXP(userId, guildId, xpGain, interaction);
        result += `🐉 Chiến thắng đỉnh cấp yêu thú! Tăng ${xpGain} Tuvi và ${stones}💎.`;
      } else {
        const xpLost = getRandom(150, 600) - Math.floor(buffState.xpBonus);
        if (!buffState.preventXPLoss) {
          user.xp = Math.max(0, user.xp - xpLost);
        }
        result += `🪫 Đạo hữu đã thua... Mất ${xpLost} Tuvi.`;
      }

      break;
    }
    case "kích hoạt trận pháp ẩn": {
      const win = Math.random() < 0.35;
      if (win) {
        const stones = getRandom(300, 800) + Math.floor(buffState.stoneBonus);
        user.stone += stones;
        result += `🧭 May mắn thoát khỏi trận pháp ẩn! Nhận ${stones}💎.`;
      } else {
        const xpLost = getRandom(800, 2000) - Math.floor(buffState.xpBonus);
        user.xp = Math.max(0, user.xp - xpLost);
        result += `🧮 Đạo hữu không thể thoát ra... Tự động trừ ${xpLost} Tuvi.`;
      }
      break;
    }
    case "gặp cường giả Hắc Ảnh Môn": {
      const win = Math.random() < 0.3;
      if (win) {
        const xpGain = getRandom(300, 700) + Math.floor(buffState.xpBonus);
        await addXP(userId, guildId, xpGain, interaction);
        result += `⚔️ Chiến thắng cường giả Hắc Ảnh Môn! Tăng ${xpGain} Tuvi.`;
      } else {
        const xpLost = getRandom(200, 700) - Math.floor(buffState.xpBonus);
        const stones = getRandom(500, 900) - Math.floor(buffState.stoneBonus);
        user.stone = Math.max(0, user.stone - stones);
        user.xp = Math.max(0, user.xp - xpLost);
        result += `🎭 Thất bại trước cường giả Hắc Ảnh Môn... Mất ${xpLost} Tuvi và ${stones}💎 để chạy thoát...`;
      }
      break;
    }
    case "gặp được truyền thừa ẩn giấu": {
      const xpGain = getRandom(250, 800) + Math.floor(buffState.xpBonus);
      const stones = getRandom(300, 1000) + Math.floor(buffState.stoneBonus);
      user.stone += stones;
      await addXP(userId, guildId, xpGain, interaction);
      result += `📜 Nhận được truyền thừa ẩn giấu, tăng ${xpGain} Tuvi và ${stones} linh thạch.`;
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
    case "bị cuốn vào không gian loạn lưu": {
      const win = Math.random() < 0.12;
      if (win) {
        const stones = getRandom(600, 1700) + Math.floor(buffState.stoneBonus);
        user.stone += stones;
        result += `🌪️ Vượt qua không gian loạn lưu! Nhận ${stones} linh thạch.`;
      } else {
        const xpLost = getRandom(500, 2200) - Math.floor(buffState.xpBonus);
        user.xp = Math.max(0, user.xp - xpLost);
        result += `🌀 Bị lạc trong không gian loạn lưu... Mất ${xpLost} Tuvi.`;
      }
      break;
    }
    case "phát hiện di tích cổ bị phong ấn": {
      // result += '🏦 Di tích cổ đã bị phong ấn, chưa đến thời gian khai mở...';
      const ruinResult = await handleAncientRuin(user, guildId);
      result += ruinResult;
      break;

    }
    case "phát hiện di tích chiến trường thượng cổ": {
      result += '⚔️ Đạo hữu phát hiện di tích chiến trường thượng cổ... ';
      break;
    }
    case "bị đánh lén bởi đệ tử Hắc Ảnh Môn ": {

      const xpLost = getRandom(100, 800) - Math.floor(buffState.xpBonus);
      user.xp = Math.max(0, user.xp - xpLost);
      result += `🥷 Đạo hữu... Mất ${xpLost} Tuvi.`;

      break;
    }
    case "gặp phải cạm bẫy linh lực": {
      const win = Math.random() < 0.4;
      if (win) {
        const stones = getRandom(150, 600) + Math.floor(buffState.stoneBonus)
        user.stone += stones

        result += `🪤 Thoát khỏi cạm bẫy linh lực! Nhận ${stones} linh thạch`
      } else {
        const xpLost = getRandom(100, 500) - Math.floor(buffState.xpBonus);
        user.xp = Math.max(0, user.xp - xpLost);
        result += `⚡ Bị thương bởi cạm bẫy linh lực... Mất ${xpLost} Tuvi.`;
      }
      break;
    }
    case "gặp cơ duyên ngộ đạo": {
      const xpGain = getRandom(1000, 3600);
      await addXP(userId, guildId, xpGain, interaction);
      result += `🪷 Ngộ đạo thành công! Tăng ${xpGain} Tuvi.`;
      break;
    }
  }

  runBuffHook(user, 'onRewardCalculated', buffState);


  await user.save();
  return result;
}

module.exports = { handleSecretRealm };
