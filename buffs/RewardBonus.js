const BuffBase = require('./BuffBase');

class RewardBonus extends BuffBase {
  constructor(data) {
    super(data);
    this.name = 'Thiên Mệnh Chi Tử';
  }

  onRewardCalculated(state) {
    state.stoneBonus += this.value;
    state.xpBonus += this.value;
  }
}

module.exports = RewardBonus;
