const BuffBase = require('./BuffBase');

class EventBoostTreasure extends BuffBase {
  constructor(data) {
    super(data);
    this.name = 'Khứu Giác Tham Lam';
  }

  onScenarioWeightModify(scenarios) {
    for (const s of scenarios) {
      if (s.text.includes('kho báu')) {
        s.weight += this.value;
      }
    }
  }
}

module.exports = EventBoostTreasure;
