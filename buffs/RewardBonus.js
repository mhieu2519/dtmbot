const BuffBase = require('./BuffBase');

class RewardBonus extends BuffBase {
  constructor(data) {
    super(data);
    this.name = 'Thiên Mệnh Chi Tử';
    this.description = 'Tăng phần thưởng nhận được từ các sự kiện trong bí cảnh.';
  }

  onRewardCalculated(state) {
    state.stoneBonus += this.value;
    state.xpBonus += this.value;
    return true; // Buff đã được sử dụng
  }
}

module.exports = RewardBonus;
