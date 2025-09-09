// buffs/utils/buffEngine.js
const BuffClasses = require('../index');

// Những effect chỉ nên tiêu thụ 1 buff / lượt
const EXCLUSIVE_PER_HOOK = {
    onBattleCheck: new Set(['winRateVsMonster'])
};

function runBuffHook(user, hookName, stateOrData) {
    if (!user.activeBuffs) return;

    const exclusiveSet = EXCLUSIVE_PER_HOOK[hookName] || new Set();
    const updatedBuffs = [];
    const consumedOnce = new Set(); // đánh dấu effect nào đã tiêu thụ rồi

    // Sắp xếp để buff mạnh hơn xử lý trước
    const buffsSorted = [...user.activeBuffs].sort((a, b) => {
        if (exclusiveSet.has(a.effect) && a.effect === b.effect) {
            return b.value - a.value; // mạnh -> yếu
        }
        return 0;
    });

    for (const buffData of buffsSorted) {
        const BuffClass = BuffClasses[buffData.effect];
        if (!BuffClass) {
            if (buffData.duration > 0) updatedBuffs.push(buffData);
            continue;
        }

        const buff = new BuffClass(buffData);
        let used = false;
        const isExclusive = exclusiveSet.has(buffData.effect);

        if (typeof buff[hookName] === 'function') {
            if (isExclusive && consumedOnce.has(buffData.effect)) {
                // đã có 1 buff effect này dùng rồi => bỏ qua
            } else {
                used = buff[hookName](stateOrData) === true;
                if (used && isExclusive) consumedOnce.add(buffData.effect);
            }
        }

        if (used) {
            buff.tickDuration();
        }

        buffData.duration = buff.duration;
        if (buff.duration > 0) {
            updatedBuffs.push(buffData);
        }
    }

    user.activeBuffs = updatedBuffs;
}

module.exports = { runBuffHook };
