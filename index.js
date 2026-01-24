const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,

} = require("discord.js");

const keepAlive = require("./server");
require("dotenv").config(); // Đảm bảo bạn đã cài dotenv để lấy token từ .env
//require("dotenv").config({ path: "/etc/secrets/.env" }); // Render lưu file ở đây
const { processData, drawTable, drawChart, drawRatioChart } = require("./utils/readSheet");

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates, // Để xử lý âm thanh
  ],
});

const PREFIX = "d?";

// Lấy giá trị từ biến môi trường\
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const REPORT_CHANNEL_ID = process.env.REPORT_CHANNEL_ID;
const LEVEL_UP_CHANNEL_ID = process.env.LEVEL_UP_CHANNEL_ID;
const ANNOUNCE_CHANNEL_ID = process.env.ANNOUNCE_CHANNEL_ID;
const greetings = ["hi", "hello", "heloo", "halo", "hey", "Bonjour"];
const cooldowns = new Map();

const conversationHistory = new Map(); // Lưu hội thoại theo ID tin nhắn gốc
const lastRequestTime = new Map(); // Lưu thời gian gửi request gần nhất

const UserXP = require("./models/UserXP");

const geminiApiKey = process.env["gemini_api_key"];
const { loadQuestions, findMatches } = require('./utils/questions');
const { chatWithGemini, sendMessageInChunks, handleReplyToBot } = require('./utils/chat');
const { loadScheduledMessages, excelTimeToISO, scheduleMessages } = require('./utils/schedule');
const { canUseCommand } = require('./utils/cooldown');
const { createCanvas, loadImage } = require("canvas");
const { addXP, getRandom, handleDailyAutoXP } = require("./utils/xpSystem");
const { showRank, createInventoryImage, createInventoryButtons } = require("./commands/rank");
const { renderPetInventoryGif, showPetInventory } = require("./commands/petInventory");
const { showLeaderboard } = require("./commands/leaderboard");
const { handleSecretRealm } = require("./commands/secretRealm");
const { handleBuffCheck } = require("./utils/buttonActiveBuffs");
const pets = require("./shops/spiritBeast");
const { handleGiftCode,
  handleGiftCodeSelect,
  handleSetupGiftCode,
  handleGiftcodeAdminMenu,
  handleGiftcodeAdminLogin,
  handleGiftcodeAdminAdd,
  handleGiftcodeDeleteSelect,
} = require("./commands/giftcode");


const {
  handleShopCommand,
  handleConfirmSell,
  handleShopBuy,
  handleShopSell,
  handleBuyItemSelection,
  handleBuyQuantitySelection,
  handleConfirmPurchase,
  handleSellQuantitySelection
} = require("./commands/shop");
const {
  handleUseItem,
  handleUseItemSelection,
  handleUseItemConfirm
} = require("./utils/useInventory");
const path = require("path");
// Load các event
//const shopInteraction = require('./shops/interactionCreate');

const mongoose = require("mongoose");
const { addPetToInventory } = require("./utils/petInventory");

// Kết nối đến MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));



// Command "/" schedule
bot.on("interactionCreate", async (interaction) => {

  if (interaction.isCommand()) {
    switch (interaction.commandName) {
      case "schedule": {
        try {
          // Trả lời ngay lập tức để tránh lỗi timeout
          await interaction.deferReply();

          const messages = loadScheduledMessages(); // Lấy danh sách lịch trình
          let response = "📅 **Danh sách lịch trình đã thiết kế:**\n";

          messages.forEach((msg, index) => {
            const timeValue = msg["Thời gian"];
            const time = new Date((timeValue - 25569) * 86400 * 1000)
              .toISOString()
              .substring(11, 16);

            response += `\n**${index + 1}.** 🕒 ${time}\n✉️ ${msg["Nội dung"]}\n`;
          });

          // Cập nhật phản hồi sau khi xử lý xong
          await interaction.editReply(response);
        } catch (error) {
          console.error("Lỗi khi xử lý lệnh schedule:", error);
          await interaction.followUp("❌ Lão phu không thể xử lý yêu cầu này!");
        }
        break;
      }
      case "profile": {
        try {
          await interaction.deferReply(); // defer trả lời trước (tránh timeout)

          const buffer = await showRank(interaction); // lấy buffer ảnh từ hàm

          const buttons = [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("open_inventory")
                .setLabel("📦 Túi trữ vật")
                .setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("open_petinventory")
                .setLabel("🪅 Túi linh thú")
                .setStyle(ButtonStyle.Secondary)
            ),
            /*
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("open_bicanh")
                .setLabel("🗝️ Bí cảnh")
                .setStyle(ButtonStyle.Secondary)
            ),*/
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("open_shop")
                .setLabel("🛒 Cửa hàng")
                .setStyle(ButtonStyle.Success)
            )
          ];

          await interaction.editReply({
            files: [{ attachment: buffer, name: "profile.png" }],
            components: buttons,
          });
        } catch (error) {
          console.error("Lỗi khi hiển thị profile:", error);
          if (!interaction.replied) {
            await interaction.followUp("❌ Không thể hiển thị profile.");
          }
        }
        break;
      }
      case "leaderboard": {
        await showLeaderboard(interaction);
        break;
      }
      case "bicanh": {
        try {
          await interaction.deferReply(); // Đảm bảo bot có thêm thời gian

          const result = await handleSecretRealm(interaction);

          await interaction.editReply(result); // Trả kết quả sau khi xử lý xong
        } catch (error) {
          console.error("❌ Lỗi khi xử lý bí cảnh:", error);
          await interaction.editReply("😢 Đã xảy ra lỗi khi khám phá bí cảnh. Hãy thử lại sau.");
        }
        break;
      }
      case "transfer": {
        const senderId = interaction.user.id;
        const guildId = interaction.guild.id;
        const member = await interaction.guild.members.fetch(senderId);
        const displayName = member.displayName;
        const receiver = interaction.options.getUser('nguoinhan');
        const amount = interaction.options.getInteger('soluong');


        const senderMember = await interaction.guild.members.fetch(interaction.user.id);
        const senderDisplayName = senderMember.displayName;
        const receiverMember = await interaction.guild.members.fetch(receiver.id);

        const now = Date.now();
        const cooldownMs = 1 * 60 * 1000; // 10 phút

        if (receiver.bot) {
          return await interaction.reply({
            content: "❌ Không thể chuyển cho bot.",
            flags: MessageFlags.Ephemeral,
          });
        }

        if (receiver.id === senderId) {
          return await interaction.reply({
            content: "❌ Không thể tự chuyển cho chính mình.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const senderData = await UserXP.findOne({ guildId, userId: senderId });
        const receiverData = await UserXP.findOneAndUpdate(
          { guildId, userId: receiver.id },
          { $setOnInsert: { xp: 0, level: 0, stone: 0, inventory: [] } },
          { upsert: true, new: true }
        );

        if (!senderData || senderData.stone < amount) {
          return await interaction.reply({
            content: "❌ Bạn không đủ linh thạch để chuyển.",
            flags: MessageFlags.Ephemeral,
          });
        }


        if (senderData.lastTransfer && now - senderData.lastTransfer.getTime() < cooldownMs) {
          const remaining = Math.ceil((cooldownMs - (now - senderData.lastTransfer.getTime())) / 60000);
          return await interaction.reply({
            content: `❌ Đạo hữu cần chờ **${remaining} phút** nữa mới có thể chuyển tiếp.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        // Trừ và cộng
        senderData.stone -= amount;
        receiverData.stone += amount;
        senderData.lastTransfer = new Date();

        await senderData.save();
        await receiverData.save();


        // const logChannel = interaction.guild.channels.cache.get('LOG_CHANNEL_ID');
        const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send({
            content: `📜 **Log chuyển linh thạch**\n` +
              `Người gửi: ${senderDisplayName} - ${interaction.user.tag} (${interaction.user.id})\n` +
              `Người nhận: ${receiverMember.displayName} - ${receiver.tag} (${receiver.id})\n` +
              `Số lượng: ${amount}\n` +
              `Thời gian: <t:${Math.floor(Date.now() / 1000)}:F>`,
          });
        } else {
          console.warn("⚠️ Không thể gửi log – không tìm thấy kênh hoặc không phải kênh text.");
        }

        await interaction.reply({
          content: `✅ Đạo hữu đã chuyển **${amount}** linh thạch cho ${receiverMember.displayName}.`,
        });


        break;
      }
      case "shop": {
        try {
          await handleShopCommand(interaction);
        } catch (error) {
          console.error("Lỗi khi xử lý shop:", error);
          await interaction.reply("❌ Lỗi khi mở cửa hàng.");
        }
        break;
      }
      case "random": {
        const randomNumber = Math.floor(Math.random() * 10); // số ngẫu nhiên từ 0 đến 9
        await interaction.reply(`🎲 Số mà lão phu quay ra là: ${randomNumber}`);
        break;
      }
      case "giftcode": {
        await handleGiftCode(interaction);
        break;
      }
      /*
      case "setupgiftcode": {
        await handleSetupGiftCode(interaction);
        break;
      }*/


    }
  }

  // Xử lý các lệnh tương tác khác
  if (interaction.isStringSelectMenu()) {
    const id = interaction.customId;
    const values = interaction.values;

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const userData = await UserXP.findOne({ guildId, userId });
    //giftcode

    // 🎁 Người chơi chọn giftcode
    if (id === "select_giftcode") {
      return handleGiftCodeSelect(interaction);
    }

    // ⚙️ Menu quản trị giftcode
    if (id === "giftcode_admin_menu") {
      return handleGiftcodeAdminMenu(interaction);
    }

    // 🗑️ Xóa giftcode
    if (id === "giftcode_admin_delete_select") {
      return handleGiftcodeDeleteSelect(interaction);
    }

    // 🛒 Các menu cửa hàng
    if (id === 'select_buy_item') {
      return handleBuyItemSelection(interaction);
    }

    // ✅ Xử lý chọn số lượng (hiển thị nút xác nhận)
    if (id === 'select_quantity_item') {
      return handleBuyQuantitySelection(interaction, userData);
    }

    //bán 
    if (id === "select_sell_item") {
      // Người chơi chọn vật phẩm → tạo menu chọn số lượng
      const selectedValue = interaction.values[0]; // ví dụ: "sell_pharmaBamboo"
      const itemId = selectedValue.replace('sell::', '');

      const userData = await UserXP.findOne({
        userId: interaction.user.id,
        guildId: interaction.guild.id
      });

      const inventoryItem = userData.inventory.find(i => i.itemId === itemId);
      if (!inventoryItem) {
        return interaction.reply({
          content: '❌ Vật phẩm không còn trong túi.',
          ephemeral: true
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select::sell::quantity::${itemId}`)
          .setPlaceholder('🧮 Chọn số lượng muốn bán')
          .addOptions(
            Array.from({ length: inventoryItem.quantity }, (_, i) => ({
              label: `${i + 1}`,
              value: `sell::${itemId}::${i + 1}`
            }))
          )
      );

      await interaction.update({
        content: `💰 Đạo hữu muốn bán bao nhiêu **${inventoryItem.name}**?`,
        components: [row]
      });

      return;

    }

    if (id.startsWith("select::sell::quantity::")) {
      const user = await UserXP.findOne({
        userId: interaction.user.id,
        guildId: interaction.guild.id,
      });
      return handleSellQuantitySelection(interaction, user); // chọn số lượng
    }

    // Chọn vật phẩm để dùng
    if (id === "select_use_item") {
      await handleUseItemSelection(interaction);
    }
    // Chọn số lượng vật phẩm sử dụng
    if (id === "confirm_use_quantity") {
      const [_, itemId, quantityStr] = interaction.values[0].split("::");
      const quantity = parseInt(quantityStr);
      await handleUseItemConfirm(interaction, itemId, quantity);

    }
    // ⛔ Nếu menu không có định dạng "::" (ví dụ giftcode admin), bỏ qua
    if (!values[0] || !values[0].includes("::")) return;

    const [action, itemId, quantityStr] = values[0]?.split('::') || [];

    if (!action || !itemId) {
      console.warn('⚠️ Không thể phân tích giá trị từ SelectMenu:', values[0]);
      return;
    }

    switch (action) {
      case 'buy':
        if (quantityStr) {
          await handleConfirmPurchase(interaction, itemId, parseInt(quantityStr));
        }
        break;

      case 'sell':
        await handleConfirmSell(interaction, itemId);
        break;
    }
  }

  // Xử lý các nút bấm
  if (interaction.isButton()) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const userData = await UserXP.findOne({ guildId, userId });
    const member = await interaction.guild.members.fetch(userId);
    const displayName = member.displayName;
    if (!userData) return;
    const id = interaction.customId;

    //const inventory = userData ? userData.inventory || [] : []; // Lấy túi đồ người chơi từ DB hoặc cache
    const inventory = Array.isArray(userData.inventory) ? userData.inventory : []; // Đảm bảo inventory là mảng
    const inventoryPet = Array.isArray(userData.inventoryPet) ? userData.inventoryPet : []; // Đảm bảo inventory là mảng

    if (id === 'open_inventory') {
      //await interaction.deferUpdate(); // tránh lỗi Unknown interaction
      const page = 1;
      const buffer = await createInventoryImage(displayName, userData.stone, inventory, page);
      const buttons = createInventoryButtons(page, Math.ceil(inventory.length / 3));

      await interaction.update({
        files: [{ attachment: buffer, name: 'inventory.png' }],
        components: buttons
      });
    }
    if (id === 'open_petinventory') {

      const pet = {
        petId: "phoenix",
        name: "🔥 Phượng Hoàng",
        description: "Thần thú phượng hoàng, có thể hồi sinh sau khi chết.",
        rarity: "Epic",
        level: 1,
        type: "pet",
        quantity: 1,
        imageUrl: "./assets/animal/phonix.gif"
      };

      await interaction.deferReply(); // giữ cho interaction không hết hạn
      const inventoryPet = Array.isArray(userData.inventoryPet) ? userData.inventoryPet : []; // Đảm bảo inventory là mảng
      await showPetInventory(interaction, displayName, inventoryPet);

    }
    if (id === 'upgrade_petinventory') {
      await interaction.reply(` Tính năng nâng cấp linh thú đang được thử nghiệm.\n ${displayName} đạo hữu vui lòng chờ phiên bản sau nhé!`);

    }
    if (id === 'open_shop') {
      await handleShopCommand(interaction);
    }

    if (id.startsWith('prev_inventory_') || id.startsWith('next_inventory_')) {
      const page = parseInt(interaction.customId.split('_').pop());
      const buffer = await createInventoryImage(displayName, userData.stone, inventory, page);
      const buttons = createInventoryButtons(page, Math.ceil(inventory.length / 3));

      await interaction.update({
        files: [{ attachment: buffer, name: 'inventory.png' }],
        components: buttons
      });
    }
    if (id.startsWith('prev_petinventory_') || id.startsWith('next_petinventory_')) {
      const page = parseInt(interaction.customId.split('_').pop());
      const buffer = await createPetInventoryImage(displayName, inventoryPet, page);
      const buttons = createInventoryPetButtons(page, Math.ceil(inventoryPet.length / 3));
      await interaction.update({
        files: [{ attachment: buffer, name: 'pet_inventory.png' }],
        components: buttons
      });
    }
    if (id === "back_to_profile") {
      await interaction.deferUpdate();
      const buffer = await showRank(interaction); // Ảnh profile

      const buttons = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('open_inventory')
            .setLabel('📦 Túi trữ vật')
            .setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("open_petinventory")
            .setLabel("🪅 Túi linh thú")
            .setStyle(ButtonStyle.Secondary)
        ),
        /*
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('open_bicanh')
            .setLabel('🗝️ Bí cảnh')
            .setStyle(ButtonStyle.Secondary)
        ),*/
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('open_shop')
            .setLabel('🛒 Cửa hàng')
            .setStyle(ButtonStyle.Success)
        )
      ];
      await interaction.editReply({
        files: [{ attachment: buffer, name: 'profile.png' }],
        components: buttons
      });

    }

    if (id === 'shop_buy') {
      await handleShopBuy(interaction);
    }

    if (id.startsWith('confirm::buy::')) {

      const parts = id.split('::'); // ['confirm', 'buy', 'pharmaBamboo', '2']
      const quantity = parseInt(parts.pop(), 10);
      const itemId = parts.slice(2).join('::');
      await handleConfirmPurchase(interaction, itemId, quantity);

    }
    if (id === 'select_quantity_item') {
      await handleBuyQuantitySelection(interaction, userData);
    }
    if (id === 'shop_sell') {
      await handleShopSell(interaction);
    }
    // Xử lý sau khi chọn số lượng
    if (id.startsWith("confirm::sell::")) {
      const parts = id.split("::");
      const itemId = parts[2];
      const quantity = parseInt(parts[3]);

      const user = await UserXP.findOne({
        userId: interaction.user.id,
        guildId: interaction.guild.id,
      });
      return handleConfirmSell(interaction, itemId, quantity);

    }
    // Dùng vật phẩm
    if (id === 'use_item') {
      await handleUseItem(interaction);

    }
    //check buff active
    if (id === 'check_buffs') {
      await handleBuffCheck(interaction);
    }

  }
  // 🧩 Khi dùng lệnh chat input
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "setupgiftcode") {
      await handleSetupGiftCode(interaction);
    }
  }

  // 🧩 Khi submit modal
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "giftcode_admin_login")
      await handleGiftcodeAdminLogin(interaction);

    else if (interaction.customId === "giftcode_admin_add")
      await handleGiftcodeAdminAdd(interaction);
  }


});

// Chào bạn mới
bot.on("guildMemberAdd", async (member) => {
  const channel = member.guild.channels.cache.get(ANNOUNCE_CHANNEL_ID);
  if (channel) {
    channel.send(
      `🎉 Chào mừng đạo hữu ${member.displayName} đến với tông môn!`,
    );
  }
});

// Lệnh
bot.on("messageCreate", async (message) => {

  if (message.author.bot) return; // Bỏ qua tin nhắn từ bot khác

  // Thưởng XP cho tin nhắn đầu tiên trong ngày
  await handleDailyAutoXP(message.author.id, message.guild.id, message)
  // Nếu trong kênh bí mật -> cộng nhiều XP hơn
  const isPrivateChannel = message.channel.id === process.env.PRIVATE_CHANNEL_ID;
  const xpToAdd = isPrivateChannel ? getRandom(40, 80) : getRandom(10, 30);

  await addXP(message.author.id, message.guild.id, xpToAdd, message);

  const nickname = message.member?.displayName || message.author.globalName || message.author.username;
  const content = message.content.trim(); // Lấy nội dung tin nhắn
  const lowerContent = content.toLowerCase(); // Chuyển về chữ thường để kiểm tra PREFIX

  //console.dir(lowerContent);
  // Cắt bỏ phần PREFIX mà không phân biệt hoa/thường
  const commandBody = content.slice(PREFIX.length).trim();
  const args = commandBody.split(/ +/);
  const command = args.shift()?.toLowerCase() || ""; // Lấy lệnh và chuyển về chữ thường

  // 📌 Kiểm tra lời chào (nếu tin nhắn không phải lệnh)
  if (greetings.includes(content)) {
    message.channel.send(`Xin chào ${nickname} đạo hữu!`);
    return;
  }

  // 📌 Nếu là tin nhắn reply của bot, tương tác lại với bot
  if (message.reference) {
    await handleReplyToBot(message, lastRequestTime, conversationHistory);
    return; // Tránh xử lý tiếp
  }

  // 📌 Chỉ xử lý các lệnh bắt đầu bằng PREFIX

  if (!lowerContent.startsWith(PREFIX.toLowerCase())) return; // Kiểm tra tiền tố bất kể hoa/thường

  switch (command) {
    // 📌 Lệnh hiển thị danh sách lệnh
    case "help": {
      const helpMessage = `
      **📜 Danh sách lệnh của lão phu:**
      🔹 \`d?a [Từ khóa]\` → Tìm câu trả lời theo dữ liệu đã học.
      🔹 \`d?r [Từ khóa]\` → Tra cứu cùng Thái Ất Chân Nhân.
      🔹 \`/profile\` → Thông tin cá nhân.
      🔹 \`/bicanh\` → Tham gia thí luyện bí cảnh.
      🔹 \`/shop\` → Cửa hàng trao đổi sản phẩm.
      🔹 \`/leaderboard\` →  Bảng xếp hạng tông môn.
      🔹 \`d?t\` → Xem bảng dữ liệu đặt đá gần đây( tạm ngừng update).
      🔹 \`d?c\` → Xem biểu đồ kết quả dữ liệu gần đây( tạm ngừng update).
      🔹 \`d?cr\` → Xem biểu đồ kết quả dữ liệu gần đây( tạm ngừng update).
      🔹 \`/schedule\` → Lịch trình lão Mạnh đã lên.
      🔹 \`d?help\` → Hiển thị danh sách lệnh.

      🚀 **Ví dụ:**
      - \`d?a man hoang\`
      - \`d?c\`
      `;
      message.channel.send(helpMessage);
      break;
    }

    // 📌 Lệnh hỏi đáp theo Excel
    case "a": {
      const query = args.join(" ").trim();
      if (!query)
        return message.channel.send(
          "⚠️ Vui lòng nhập từ khóa. Ví dụ: `d?a tần mục`",
        );

      const matches = findMatches(query, loadQuestions());
      if (matches.length > 0) {
        let response = `🔍 **Các kết quả cho "${query}":**\n`;
        matches.forEach((q, index) => {
          response += `\n**${index + 1}.** ❓ ${q["Câu hỏi"]}\n➡️ ${q["Câu trả lời"]}\n`;
        });
        message.channel.send(response);
      } else {
        message.channel.send(
          `❌ Không tìm thấy câu trả lời phù hợp, ${nickname} đạo hữu vui lòng kiểm tra lại`,
        );
      }
      break;
    }

    // 📌 Lệnh hỏi AI
    case "r": {
      if (!canUseCommand(message.author.id)) {
        return message.reply("⏳ Đạo hữu đang gửi quá nhanh! Hãy chờ 5 giây.");
      }

      const query = args.join(" ");
      if (!query)
        return message.reply("⚠️ Đạo hữu vui lòng nhập nội dung câu hỏi!");

      // Phản hồi ngay lập tức để tránh bot có vẻ bị lag
      const sentMessage = await message.reply("Lão phu đang suy ngẫm...");

      const reply = await chatWithGemini(query);
      // Gọi hàm để gửi tin nhắn
      await sendMessageInChunks(sentMessage, reply);
      break;
    }

    // 📌 Lệnh xem bảng dữ liệu 
    case "t": {
      message.channel.send(
        `⏳ Tính năng đã tạm dừng cập nhật dữ liệu, ${nickname} đạo hữu vui lòng dùng các lựa chọn khác...`
      );
      /*
      message.channel.send(
        `⏳ Đang tải dữ liệu biểu đồ, ${nickname} đạo hữu vui lòng chờ...`
      );
      processData().then((data) => {
        if (data.length === 0) {
          message.channel.send("❌ Không có dữ liệu trong Google Sheet.");
          return;
        }
        const recentData = data.slice(-30); // Lấy 30 dòng cuối cùng
        // Gọi hàm để vẽ biểu đồ
        const buffer = drawTable(recentData);

        if (!Buffer.isBuffer(buffer)) {
          console.error("Lỗi: drawScatterPlot không trả về Buffer!");
          message.channel.send("❌ Lỗi khi tạo biểu đồ!");
          return;
        }

        // Tạo attachment từ buffer
        const attachment = new AttachmentBuilder(buffer, { name: "table.png" });

        // Gửi ảnh vào kênh Discord
        message.channel.send({ files: [attachment] });

      }).catch((error) => {
        console.error("Lỗi khi đọc Google Sheets:", error);
        message.channel.send("❌ Đã xảy ra lỗi khi tải dữ liệu!");
      });
*/
      break;
    }

    // 📌 Lệnh xem biểu đồ kết quả
    case "c": {
      message.channel.send(
        `⏳ Tính năng đã tạm dừng cập nhật dữ liệu, ${nickname} đạo hữu vui lòng dùng các lựa chọn khác...`
      );
      /*
      message.channel.send(
        `⏳ Đang tải dữ liệu biểu đồ, ${nickname} đạo hữu vui lòng chờ...`
      );
      processData().then((data) => {
        if (data.length === 0) {
          message.channel.send("❌ Không có dữ liệu trong Google Sheet.");
          return;
        }

        // Gọi hàm để vẽ biểu đồ
        const buffer = drawChart(data);

        if (!Buffer.isBuffer(buffer)) {
          console.error("Lỗi: drawScatterPlot không trả về Buffer!");
          message.channel.send("❌ Lỗi khi tạo biểu đồ!");
          return;
        }

        // Tạo attachment từ buffer
        const attachment = new AttachmentBuilder(buffer, { name: "chart.png" });

        // Gửi ảnh vào kênh Discord
        message.channel.send({ files: [attachment] });

      }).catch((error) => {
        console.error("Lỗi khi đọc Google Sheets:", error);
        message.channel.send("❌ Đã xảy ra lỗi khi tải dữ liệu!");
      });
*/
      break;
    }
    // 📌 Lệnh xem biểu đồ kết quả 2
    case "cr": {
      message.channel.send(
        `⏳ Tính năng đã tạm dừng cập nhật dữ liệu, ${nickname} đạo hữu vui lòng dùng các lựa chọn khác...`
      );
      /*
      message.channel.send(
        `⏳ Đang tải dữ liệu biểu đồ, ${nickname} đạo hữu vui lòng chờ...`
      );
      processData().then((data) => {
        if (data.length === 0) {
          message.channel.send("❌ Không có dữ liệu trong Google Sheet.");
          return;
        }

        // Gọi hàm để vẽ biểu đồ

        const recentData = data.slice(-50);
        const buffer = drawRatioChart(recentData);

        if (!Buffer.isBuffer(buffer)) {
          console.error("Lỗi: drawScatterPlot không trả về Buffer!");
          message.channel.send("❌ Lỗi khi tạo biểu đồ!");
          return;
        }

        // Tạo attachment từ buffer
        const attachment = new AttachmentBuilder(buffer, { name: "chart.png" });

        // Gửi ảnh vào kênh Discord
        message.channel.send({ files: [attachment] });

      }).catch((error) => {
        console.error("Lỗi khi đọc Google Sheets:", error);
        message.channel.send("❌ Đã xảy ra lỗi khi tải dữ liệu!");
      });
*/
      break;
    }
    default:
      message.channel.send("⚠️ Lệnh không hợp lệ! Hãy thử `d?help` để xem danh sách lệnh.");
  }

});


bot.on('error', (err) => {
  console.error('❌ Discord bot error:', err);
});

bot.login(process.env.DISCORD_TOKEN) // Sử dụng token từ biến môi trường
  .catch((err) => console.error("❌ Login failed:", err));

bot.once("ready", async () => {
  console.log("✅ Bot is now online!");
  keepAlive()
  scheduleMessages(bot);

});
bot.on("error", console.error);
bot.on("shardError", console.error);

process.on("unhandledRejection", err => {
  console.error("UNHANDLED:", err);
});

