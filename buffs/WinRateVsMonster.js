const BuffBase = require('./BuffBase');

class WinRateVsMonster extends BuffBase {
  constructor(data) {
    super(data);
    this.name = 'Chiến Ý Bừng Cháy';
  }

  onBattleCheck(state) {
    if (state.encounter === 'yêu thú' || state.encounter === 'đỉnh cấp yêu thú') {
      state.winChance += this.value;
    }
  }
}

module.exports = WinRateVsMonster;