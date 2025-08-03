const BuffBase = require('./BuffBase');

class WinRateVsMonster extends BuffBase {
  constructor(data) {
    super(data);
    this.name = 'Chiến Ý Bừng Cháy';
    this.description = 'Tăng tỉ lệ thắng khi gặp yêu thú hoặc đỉnh cấp yêu thú.';
  }

  onBattleCheck(state) {
    //console.log(`⚔️ Buff WinRateVsMonster đang chạy. Gặp: ${state.encounter}`);
    if (state.encounter === 'gặp yêu thú' || state.encounter === 'gặp đỉnh cấp yêu thú') {
      state.winChance += this.value;
      return true; // Buff đã được sử dụng
    }
    return false; // Buff chưa được sử dụng
  }
}

module.exports = WinRateVsMonster;