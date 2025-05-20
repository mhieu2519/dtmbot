const UserXP = require("../models/UserXP");



function getXPForNextLevel(level) {
  return 5 * level * level + 50 * level + 100;
}

async function addXP(userId, guildId, xpAmount, message) {
    // Kiểm tra xpAmount hợp lệ
  if (typeof xpAmount !== 'number' || isNaN(xpAmount)) {
    console.error(`❌ Giá trị xp không hợp lệ:`, xpAmount);
    return;
  }

  let user = await UserXP.findOne({ userId, guildId });
  if (!user) user = new UserXP({ userId, guildId, lastMessage: new Date(0) });

  const now = new Date();
  const cooldown = 15 * 1000; // 60s cooldown

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

  // Gửi thông báo lên cấp nếu có message và lên cấp
  if (leveledUp && message) {
    const nickname = message.member?.nickname || message.member?.user?.username || "Ẩn Danh";
    const levelUpChannel = message.guild.channels.cache.get(process.env.LEVELUP_CHANNEL_ID);
    if (levelUpChannel) {
      levelUpChannel.send(`🌟 Chúc mừng ${nickname} đạo hữu đã đột phá lên cấp! 🎉`);
    } else {
      console.warn("Không tìm thấy kênh thông báo level up!");
    }
  }

  return leveledUp ? user.level : null;
}

async function getUserRank(userId, guildId) {
  const users = await UserXP.find({ guildId }).sort({ level: -1, xp: -1 });
  return users.findIndex(u => u.userId === userId) + 1;
}

function getRandomXP(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}



async function handleDailyAutoXP(userId, guildId, message) {
  const DAILY_XP_REWARD = getRandomXP(100, 200); // XP ngẫu nhiên từ 100 đến 200
  let user = await UserXP.findOne({ userId, guildId });
  if (!user) user = new UserXP({ userId, guildId });

  const now = new Date();
  const last = user.lastDaily;

  const isNewDay = !last || now.toDateString() !== new Date(last).toDateString();
  const nickname = message.member?.displayName ||message.author.globalName|| message.author.username;

  if (isNewDay) {
    user.xp += DAILY_XP_REWARD;
    user.lastDaily = now;

    let leveledUp = false;
    while (user.xp >= getXPForNextLevel(user.level)) {
      user.xp -= getXPForNextLevel(user.level);
      user.level++;
      leveledUp = true;
    }

    await user.save();

    // Gửi thông báo lên cấp nếu muốn
    try {
      const channel = message.guild.channels.cache.get(process.env.LEVELUP_CHANNEL_ID); 
      if (leveledUp) {
        channel.send(`🎉 ${nickname} đã lên cấp nhờ chăm chỉ mỗi ngày!`);
      } else {
        channel.send(`📅Chúc mừng ${nickname} đạo hữu đã nhận ${DAILY_XP_REWARD} XP cho lần hoạt động đầu tiên hôm nay!`);
      }
    } catch (e) {
      console.warn("Không tìm thấy kênh để gửi thông báo daily.");
    }
  }
}



module.exports = { getRandomXP, getXPForNextLevel, addXP, getUserRank, handleDailyAutoXP };
