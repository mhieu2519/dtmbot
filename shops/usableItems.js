// usableItems.js
module.exports = [
  {
    id: 'pharmaBamboo',
    name: 'Trúc Cơ Đan 🎍',
    effect: 'gainExp',
    amount: 200,
    description: '+200 tuvi'
  },
  {
    id: 'pharmaEra',
    name: 'Tẩy Tủy Đan 🫐',
    effect: 'gainExp',
    amount: 500,
    description: '+500 tuvi'
  },
  {
    id: 'pharmaPure',
    name: 'Thanh Tâm Đan 🥑',
    effect: 'gainExp',
    amount: 1000,
    description: '+1000 tuvi',
  },
  {
    id: 'grassSorrow',
    name: 'Đoạn Trường Thảo 🌿',
    effect: 'gainExp',
    amount: 500,
    description: '+500 tuvi'
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
      duration: 8
    },
    description: 'Tăng 50% tỉ lệ chiến thắng khi gặp yêu thú các loại trong 8 lượt.'

  },
  {
    id: 'ancientSword',
    name: 'Cổ Kiếm Linh 🗡️',
    effect: {
      type: 'winRateVsMonster',
      value: 0.62,
      duration: 5
    },
    description: 'Tăng 62% tỉ lệ chiến thắng khi gặp yêu thú các loại trong 5 lượt.'

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
  },
  {
    id: 'spiritGatheringPill',
    name: 'Tụ Linh Đan 🔮',
    effect: 'gainExp',
    amount: 1500,
    description: '+1500 tuvi'
  },

  {
    id: 'iceHeartPill',
    name: 'Băng Tâm Đan ❄️',
    effect: 'gainExp',
    amount: 1800,
    description: '+1800 tuvi'
  },
  {
    id: 'fireSoulPill',
    name: 'Hỏa Hồn Đan 🔥',
    effect: 'gainExp',
    amount: 2800,
    description: '+2800 tuvi'
  },
  // Bổ Nguyên Đan
  {
    id: 'nourishingElixirPill',
    name: 'Bổ Nguyên Đan 🍃',
    effect: 'gainExp',
    amount: 4200,
    description: '+4200 tuvi'
  },
  // Thần Nguyên Đan
  {
    id: 'primordialElixirPill',
    name: 'Thần Nguyên Đan 🌌',
    effect: 'gainExp',
    amount: 6300,
    description: '+6300 tuvi'
  }

];
