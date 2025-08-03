
// buffs/utils/buffEngine.js

const BuffClasses = require('../index');

function runBuffHook(user, hookName, stateOrData) {
    if (!user.activeBuffs) return;

    const updatedBuffs = [];

    for (let i = 0; i < user.activeBuffs.length; i++) {
        const buffData = user.activeBuffs[i];
        const BuffClass = BuffClasses[buffData.effect];
        if (!BuffClass) continue;

        const buff = new BuffClass(buffData);

        let used = false;
        if (typeof buff[hookName] === 'function') {
            // Nếu hook trả về true thì xem là "buff đã dùng"
            used = buff[hookName](stateOrData) === true;
        }

        // Nếu được dùng -> trừ duration
        if (used) {
            buff.tickDuration();
            // console.log(`[BUFF] ${buff.name} (${buff.effect}) used - còn lại ${buff.duration} lượt.`);
        }

        buffData.duration = buff.duration;

        if (buff.duration > 0) {
            updatedBuffs.push(buffData);
        }
    }

    user.activeBuffs = updatedBuffs;
}

module.exports = {
    runBuffHook
};
