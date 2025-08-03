class BuffBase {
  constructor(data) {
    this.effect = data.effect;
    this.value = data.value;
    this.duration = data.duration || 1;
    this.name = data.name || 'Unknown Buff';
  }

  tickDuration() {
    this.duration = Math.max(0, this.duration - 1);
  }

  isExpired() {
    return this.duration <= 0;
  }

  onBattleCheck(state) { }
  onRewardCalculated(state) { }
  onScenarioWeightModify(scenarios) { }
}

module.exports = BuffBase;
