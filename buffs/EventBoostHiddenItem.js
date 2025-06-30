const BuffBase = require('./BuffBase');

class EventBoostHiddenItem extends BuffBase {
  constructor(data) {
    super(data);
    this.name = 'Tầm Bảo Thuật';
  }

  onScenarioWeightModify(scenenarios) {
    for (const s of scenenarios) {
      if (s.text.includes('vật phẩm ẩn giấu')) {
        s.weight += this.value;
      }
    }
  }
}

module.exports = EventBoostHiddenItem;
