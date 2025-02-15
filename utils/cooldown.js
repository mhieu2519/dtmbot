const moment = require("moment-timezone"); // Thêm thư viện này nếu chưa có

function canUseCommand(userId) {
    const now = Date.now();
    if (cooldowns.get(userId) && now - cooldowns.get(userId) < 5000) return false;
    cooldowns.set(userId, now);
    return true;
  }

module.exports={canUseCommand};
