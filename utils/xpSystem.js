const UserXP = require("../models/UserXP");
const moment = require("moment-timezone");


function getXPForNextLevel(level) {
  return 5 * level * level + 50 * level + 100;
}

async function addXP(userId, guildId, xpAmount, context = null) {
    // Kiểm tra xpAmount hợp lệ
  if (typeof xpAmount !== 'number' || isNaN(xpAmount)) {
    console.error(`❌ Giá trị xp không hợp lệ:`, xpAmount);
    return;
  }

  let user = await UserXP.findOne({ userId, guildId });
  if (!user) user = new UserXP({ userId, guildId, lastMessage: new Date(0) });

  const now = new Date();
  const cooldown = 15 * 1000; // 15s cooldown

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

  // Nếu có context thì gửi thông báo
  if (leveledUp && context) {
    let guild, member, channel;
    if (context.member && context.guild) {
      // context là interaction hoặc message
      guild = context.guild;
      member = context.member;
    } else if (context.guilds && typeof context.guilds.fetch === "function") {
      // context là client
      guild = await context.guilds.fetch(guildId);
      member = await guild.members.fetch(userId);
    }

    if (guild && member) {
      const nickname = member.displayName;
      channel = guild.channels.cache.get(process.env.LEVELUP_CHANNEL_ID);
      if (channel) {
        channel.send(`🌟 Chúc mừng ${nickname} đạo hữu đã đột phá lên cấp! 🎉`);
      }


      // Vai trò Level 50
      if (user.level >= 50 && guild.roles.cache.has(process.env.LEVEL_50_ROLE_ID)) {
        const role = guild.roles.cache.get(process.env.LEVEL_50_ROLE_ID);
        if (!member.roles.cache.has(role.id)) {
          await member.roles.add(role).catch(console.error);
          channel?.send(`🎖️ ${nickname} đạo hữu được nâng vai trò <@&${role.id}>!`);
        }
      }

      // Kênh bí mật Level 100
      if (user.level >= 100) {
        const secret = guild.channels.cache.get(process.env.PRIVATE_CHANNEL_ID);
        if (secret) {
          await secret.permissionOverwrites.edit(member.id, {
            ViewChannel: true,
            SendMessages: true,
          });
          channel?.send(`🔓 ${nickname} đã mở khóa <#${secret.id}>!`);
        }
        }
    }

  // 🏆 CẤP ROLE KHI ĐẠT LEVEL 200


  }

  return leveledUp ? user.level : null;
}

async function getUserRank(userId, guildId) {
  const users = await UserXP.find({ guildId }).sort({ level: -1, xp: -1 });
  return users.findIndex(u => u.userId === userId) + 1;
}

function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}



async function handleDailyAutoXP(userId, guildId, message) {
  const DAILY_XP_REWARD = getRandom(100, 200); // XP ngẫu nhiên từ 100 đến 200
  const daily_stone_reward = getRandom(150, 300); // Phần thưởng linh thạch ngẫu nhiên từ 150 đến 300
  let user = await UserXP.findOne({ userId, guildId });
  if (!user) user = new UserXP({ userId, guildId });

  // const now = new Date();
  //const last = user.lastDaily;
  //const isNewDay = !last || now.toDateString() !== new Date(last).toDateString();

  const now = moment().tz("Asia/Ho_Chi_Minh");
  // Lần cuối nhận daily (chuyển sang múi giờ VN luôn)
  const last = moment(user.lastDaily).tz("Asia/Ho_Chi_Minh");
  
  const isNewDay = !last || !now.isSame(last, 'day');
  const nickname = message.member?.displayName ||message.author.globalName|| message.author.username;

  if (isNewDay) {
    user.xp += DAILY_XP_REWARD;
    user.stone += daily_stone_reward; // Thêm phần thưởng linh thạch
    user.lastDaily = new Date(); // vẫn lưu UTC

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
        channel.send(`📅Chúc mừng ${nickname} đạo hữu đã nhận ${DAILY_XP_REWARD} XP và ${daily_stone_reward} 💎 cho lần hoạt động đầu tiên hôm nay!`);
      }
    } catch (e) {
      console.warn("Không tìm thấy kênh để gửi thông báo daily.");
    }
  }
}



module.exports = { getRandom, getXPForNextLevel, addXP, getUserRank, handleDailyAutoXP };
