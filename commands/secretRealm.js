const UserXP = require("../models/UserXP");
const { getRandom, addXP } = require("../utils/xpSystem");
const { addItemToInventory } = require("../utils/inventory");
 const hiddenItem = require("../shops/hiddenItems");
//const BuffClasses = require('./buffs'); // ánh xạ effect -> class


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
// Buffs
function runBuffHook(user, hookName, stateOrData) {
  if (!user.activeBuffs) return;

  for (let i = 0; i < user.activeBuffs.length; i++) {
    const buffData = user.activeBuffs[i];
    const BuffClass = BuffClasses[buffData.effect];
    if (!BuffClass) continue;

    const buff = new BuffClass(buffData);

    if (typeof buff[hookName] === 'function') {
      buff[hookName](stateOrData);
    }

    // Giảm thời lượng nếu cần
    buff.tickDuration();
    buffData.duration = buff.duration;
  }

  // Xóa buff đã hết hạn
  user.activeBuffs = user.activeBuffs.filter(b => b.duration > 0);
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
      { text: "gặp yêu thú", weight: 65 },
      { text: "gặp cường giả", weight: 48 },
      { text: "kích hoạt trận pháp ẩn", weight: 1 },
      { text: "cuốc trúng mỏ linh thạch", weight: 40 },
      { text: "mở được kho báu bí cảnh", weight: 20 },
      { text: "gặp đỉnh cấp yêu thú", weight: 20 },
      { text: "tìm thấy vật phẩm ẩn giấu", weight: 2}, 
      { text: "gặp được truyền thừa ẩn giấu", weight: 4 }, 
  ];
  // Thêm buff hook
 // runBuffHook(user, 'onScenarioWeightModify', scenarios);
  // Chọn ngẫu nhiên một kịch bản dựa trên trọng số
  const chosen = chonKichBanNgauNhien(scenarios);
 // console.log("Kết quả:", chosen);

  let result = `🔮 Đạo hữu tiến vào bí cảnh và ${chosen}...\n`;
/*
  const buffState = {
    winChance: 0,
    stoneBonus: 0,
    xpBonus: 0,
    preventXPLoss: false,
    encounter: chosen
  };
  runBuffHook(user, 'onBattleCheck', buffState);
*/
  switch (chosen) {
 
    case "gặp yêu thú": {
      const win = Math.random() <  (0.5 /*+ buffState.winChance*/);
      if (win) {
        const reward = getRandom(40,150);//+buffState.stoneBonus; //
        user.stone += reward;
        result += `🗡️ Chiến thắng yêu thú! Nhận ${reward} linh thạch.`;
      } else {
        const xpLost = getRandom(40,100) ;//+  buffState.xpBonus;
              //if (!buffState.preventXPLoss) {
          user.xp = Math.max(0, user.xp - xpLost);
       // }
        result += `🛡️ Thất bại... Mất ${xpLost} XP.`;
      }
      break;
    }
    case "gặp cường giả": {
      const xpGain = getRandom(50, 150); //+ buffState.xpBonus;
      await addXP(userId, guildId, xpGain, interaction);
      result += `🧙 Cường giả chỉ điểm, nhận ${xpGain} XP.`;
      break;
    }
    case "cuốc trúng mỏ linh thạch": {
      const stones = getRandom(5, 150); //+ buffState.stoneBonus;
      user.stone += stones;
      result += `⛏️ Khai thác mỏ linh thạch, nhận ${stones} linh thạch.`;
      break;
    }
    case "mở được kho báu bí cảnh": {
      const xp = getRandom(100, 150) ;// + buffState.xpBonus;
      const stones = getRandom(100, 150); //+ buffState.stoneBonus;
      user.stone += stones;
      await addXP(userId, guildId, xp, interaction);
      result += `🎁 Kho báu chứa ${xp} XP và ${stones} linh thạch!`;
      break;
    }
    case "gặp đỉnh cấp yêu thú": {
      const win = Math.random() < (0.35 /* + buffState.winChance*/); 
      if (win) {
        const xpGain = getRandom(300, 500) ;//+buffState.xpBonus;
        const stones = getRandom(100, 300);//+buffState.stoneBonus;
         user.stone += stones;
        await addXP(userId, guildId, xpGain, interaction);
        result += `🐉 Chiến thắng đỉnh cấp yêu thú! Nhận ${xpGain} XP và ${stones}💎.`;
      } else {
        const xpLost = getRandom(150, 400) ; // + buffState.xpBonus;
        user.xp = Math.max(0, user.xp - xpLost); // đảm bảo không âm XP 
        result += `🪫 Đạo hữu đã thua... Mất ${xpLost} XP.`;
      }
      break;
    }
    case "kích hoạt trận pháp ẩn": {
         const win = Math.random() < 0.3; 
      if (win) {
        const stones = getRandom(300, 500);
         user.stone += stones;
        result += `🧭 May mắn thoát khỏi trận pháp ẩn! Nhận ${stones}💎.`;
      } else {
        const xpLost = getRandom(500, 1000);
        user.xp = Math.max(0, user.xp - xpLost); // đảm bảo không âm XP 
        result += `🧮 Đạo hữu không thể thoát ra... Tự động trừ ${xpLost} XP.`;
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
    case "tìm thấy vật phẩm ẩn giấu": {
      const chosen = chooseWeighted(hiddenItem);
      const item = {
        itemId: chosen.id,
        name: chosen.name,
        rarity: chosen.rarity,
        quantity: 1,
        description: chosen.description
      };
      await addItemToInventory(user, item);
      
      result += `⚡ Tìm thấy vật phẩm ẩn giấu: **${item.name}**. \n ${item.description}`;

      break;
    }

  }
 // runBuffHook(user, 'onRewardCalculated', buffState);
  await user.save();
  return result;
}

module.exports = { handleSecretRealm };
