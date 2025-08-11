// usableItems.js
module.exports = [
  {
    id: 'pharmaBamboo',
    name: 'Trúc Cơ Đan 🎍',
    effect: 'gainExp',
    amount: 200,
    description: '+200 exp'
  },
  {
    id: 'pharmaEra',
    name: 'Tẩy Tủy Đan 🫐',
    effect: 'gainExp',
    amount: 500,
    description: '+500 exp'
  },
  {
    id: 'pharmaPure',
    name: 'Thanh Tâm Đan 🥑',
    effect: 'gainExp',
    amount: 1000,
    description: '+1000 exp',
  },
  {
    id: "grassSorrow",
    name: "Đoạn Trường Thảo 🌿",
    effect: 'gainExp',
    amount: 500,
    description: '+500 exp'
  },
  /*
  {
    id: 'mysticScroll',
    name: 'Cuộn Bí Pháp 📜',
    effect: 'buffExp',
    amount: 200,
    description: '+200 stone'
  },
  {
    id: 'phoenixFeather',
    name: 'Lông Phượng Hoàng 🪶',
    effect: 'buffTranphap',
    amount: 500,
    description: '+500 stone'
  },

  {
    id: 'fragMap',
    name: 'Mảnh Ghép Tàn Đồ 🗺️',
    effect: 'gainStone',
    amount: 200,
    description: '+200 stone'
  },
  {
    id: 'fragKey',
    name: 'Chìa khóa bảo tàng 🔑',
    effect: 'gainStone',
    amount: 500,
    description: '+500 stone'
  },
  */
  {
    id: 'shield',
    name: 'Khiên Bất Diệt 🛡️',
    effect: {
      type: 'winRateVsMonster',
      value: 0.5,
      duration: 5
    },
    description: 'Tăng 50% tỉ lệ chiến thắng khi gặp yêu thú các loại trong 5 lượt.'

  },
  {
    id: "ancientSword",
    name: "Cổ Kiếm Linh 🗡️",
    effect: {
      type: 'winRateVsMonster',
      value: 0.62,
      duration: 2
    },
    description: 'Tăng 62% tỉ lệ chiến thắng khi gặp yêu thú các loại trong 2 lượt.'

  },
  {
    id: 'luckyCharm',
    name: 'Bùa May Mắn 🍀',
    effect: {
      type: 'winRateVsMonster',
      value: 0.35,
      duration: 3
    },
    description: 'Tăng 35% tỉ lệ chiến thắng khi gặp yêu thú trong 3 lượt.'
  }


];
