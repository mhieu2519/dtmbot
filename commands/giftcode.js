// commands/giftcode.js
const GiftCode = require("../models/GiftCode");
const UserXP = require("../models/UserXP");
const { isAdminSession, createAdminSession } = require("../utils/adminSessionManager");

const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} = require("discord.js");

// 🔧 Các hàm tiện ích sẵn có
const { addXP } = require("../utils/xpSystem");
const { addItemToInventory } = require("../utils/inventory");
const { addPetToInventory } = require("../utils/petInventory");
const { getById } = require("../utils/itemRegistry"); // để tra cứu item/pet trong items/gift.js


// ⚙️ Hàm xử lý phần thưởng chính
//
// ⚙️ Hàm xử lý phần thưởng chính
//
async function redeemGift(interaction, gift) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const displayName = interaction.member.displayName;
    // Tìm hoặc tạo UserXP
    const userData = await UserXP.findOneAndUpdate(
        { userId, guildId },
        { $setOnInsert: { xp: 0, stone: 0, level: 0, inventory: [], inventoryPet: [] } },
        { upsert: true, new: true }
    );

    // 🧠 XP
    if (gift.rewards.xp && gift.rewards.xp > 0) {
        await addXP(userId, guildId, gift.rewards.xp, interaction);
    }

    // 💎 Stone
    if (gift.rewards.stone && gift.rewards.stone > 0) {
        userData.stone = (userData.stone || 0) + gift.rewards.stone;
    }

    // 🎒 Items
    if (Array.isArray(gift.rewards.items)) {
        for (const i of gift.rewards.items) {
            if (!i.itemId) continue;
            const meta = getById(i.itemId);
            if (!meta) {
                console.warn(`⚠️ Item ${i.itemId} không tồn tại trong registry.`);
                continue;
            }

            if (meta.type === "item") {
                await addItemToInventory(userData, {
                    itemId: meta.id || meta.itemId,
                    name: meta.name,
                    rarity: meta.rarity,
                    description: meta.description || "",
                    quantity: i.quantity || 1
                });
            }
        }
    }

    // 🐉 Pets
    if (Array.isArray(gift.rewards.pets)) {
        for (const p of gift.rewards.pets) {
            if (!p.petId) continue;
            const meta = getById(p.petId);
            if (!meta) {
                console.warn(`⚠️ Pet ${p.petId} không tồn tại trong registry.`);
                continue;
            }

            if (meta.type === "pet") {
                await addPetToInventory(userData, {
                    petId: meta.petId || meta.id,
                    name: meta.name,
                    rarity: meta.rarity,
                    level: meta.level || 1,
                    description: meta.description || "",
                    imageUrl: meta.imageUrl || "",
                    quantity: p.quantity || 1
                });
            }
        }
    }

    gift.usedBy.push(userId);
    await gift.save();
    await userData.save();

    // 📝 Nội dung phản hồi
    let rewardsText = [];
    if (gift.rewards.xp) rewardsText.push(`🧠 +${gift.rewards.xp} tuvi`);
    if (gift.rewards.stone) rewardsText.push(`💎 +${gift.rewards.stone} linh thạch`);
    if (gift.rewards.items?.length) rewardsText.push(`🎒 +${gift.rewards.items.length} vật phẩm`);
    if (gift.rewards.pets?.length) rewardsText.push(`🐉 +${gift.rewards.pets.length} linh thú`);

    return {
        text: `🎁 Đạo hữu **${displayName}** đã nhận quà thành công từ mã \`${gift.code}\`!\n${rewardsText.join("\n") || "✨ Không có phần thưởng."}`
    };
}

//
// 🧩 /giftcode lệnh chính
//
async function handleGiftCode(interaction) {
    const code = interaction.options.getString("code");
    const userId = interaction.user.id;

    // Nếu không nhập code → hiển thị menu chọn (ẩn)
    if (!code) {
        const now = new Date();
        const allCodes = await GiftCode.find({
            $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
        });

        const available = allCodes.filter(
            g => !g.usedBy.includes(userId) && g.usedBy.length < g.maxUses
        );

        if (!available.length) {
            return interaction.reply({
                content: "😢 Hiện tại không có giftcode nào khả dụng cho đạo hữu.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId("select_giftcode")
            .setPlaceholder("🎁 Chọn giftcode muốn nhận")
            .addOptions(
                available.map(g => ({
                    label: g.code,
                    description: `+${g.rewards.xp || 0} tuvi, +${g.rewards.stone || 0} linh thạch, +${g.rewards.items?.length || 0} vật phẩm, +${g.rewards.pets?.length || 0} linh thú`,
                    value: g.code,
                }))
            );

        const row = new ActionRowBuilder().addComponents(menu);

        return interaction.reply({
            content: "🎁 Hãy chọn một mã quà tặng bên dưới để nhận thưởng:",
            components: [row],
            flags: MessageFlags.Ephemeral, // vẫn ẩn
        });
    }

    // Người chơi nhập code trực tiếp
    const gift = await GiftCode.findOne({ code });
    if (!gift) {
        return interaction.reply({ content: "❌ Mã giftcode không tồn tại!", flags: MessageFlags.Ephemeral });
    }
    if (gift.expiresAt && new Date() > gift.expiresAt) {
        return interaction.reply({ content: "⏰ Mã này đã hết hạn sử dụng.", flags: MessageFlags.Ephemeral });
    }
    if (gift.usedBy.includes(userId)) {
        return interaction.reply({ content: "⚠️ Đạo hữu đã sử dụng mã này rồi.", flags: MessageFlags.Ephemeral });
    }
    if (gift.usedBy.length >= gift.maxUses) {
        return interaction.reply({ content: "😢 Mã này đã đạt giới hạn sử dụng.", flags: MessageFlags.Ephemeral });
    }

    const result = await redeemGift(interaction, gift);

    // 🟢 Đổi từ reply -> followUp public (thay vì ephemeral)
    await interaction.reply({ content: "✅ Nhận quà thành công! (đang công bố...)", flags: MessageFlags.Ephemeral });
    await interaction.channel.send({ content: result.text, flags: 0 }); // public
}

//
// 🧩 Khi người dùng chọn giftcode trong menu
//
async function handleGiftCodeSelect(interaction) {
    const code = interaction.values[0];
    const gift = await GiftCode.findOne({ code });
    if (!gift) {
        return interaction.update({ content: "❌ Mã giftcode không tồn tại hoặc đã bị xóa.", components: [] });
    }
    if (gift.expiresAt && new Date() > gift.expiresAt) {
        return interaction.update({ content: "⏰ Mã này đã hết hạn sử dụng.", components: [] });
    }

    const userId = interaction.user.id;
    if (gift.usedBy.includes(userId)) {
        return interaction.update({ content: "⚠️ Đạo hữu đã sử dụng mã này rồi.", components: [] });
    }
    if (gift.usedBy.length >= gift.maxUses) {
        return interaction.update({ content: "😢 Mã này đã được sử dụng tối đa.", components: [] });
    }

    // 🟢 Trước tiên ẩn tin gốc
    await interaction.update({ content: "🔄 Đang xử lý nhận thưởng...", components: [] });

    const result = await redeemGift(interaction, gift);

    // 🟢 Gửi tin mới (public)
    await interaction.channel.send({
        content: result.text,
        flags: 0, // public
    });
}

// admin

// 🕒 Hàm chuyển đổi thời hạn (7d, 12h, 1m)
function parseExpireString(str) {
    if (!str) return null;
    const match = /^(\d+)\s*(d|h|m)?$/i.exec(str.trim());
    if (!match) return null;

    const num = parseInt(match[1]);
    const unit = match[2]?.toLowerCase() || "d";

    const now = new Date();
    switch (unit) {
        case "h": return new Date(now.getTime() + num * 60 * 60 * 1000);
        case "m": return new Date(now.getTime() + num * 60 * 1000);
        default: return new Date(now.getTime() + num * 24 * 60 * 60 * 1000);
    }
}

// 🧭 Slash command chính: /setupgiftcode
async function handleSetupGiftCode(interaction) {
    const userId = interaction.user.id;
    const logged = isAdminSession(userId);

    const menu = new StringSelectMenuBuilder()
        .setCustomId("giftcode_admin_menu")
        .setPlaceholder(
            logged
                ? "🧩 Chọn hành động quản lý giftcode"
                : "🔐 Đạo hữu cần đăng nhập quyền admin trước"
        )
        .addOptions(
            logged
                ? [
                    { label: "➕ Thêm giftcode mới", value: "add", description: "Tạo mã quà tặng mới" },
                    { label: "🗑️ Xóa giftcode", value: "delete", description: "Xóa một mã đã tồn tại" },
                    { label: "📜 Danh sách giftcode", value: "list", description: "Xem toàn bộ giftcode" },
                ]
                : [
                    { label: "🔐 Đăng nhập quyền admin", value: "login", description: "Nhập mật khẩu quản trị để truy cập" },
                ]
        );

    const row = new ActionRowBuilder().addComponents(menu);

    // ⚡ Chỉ dùng editReply nếu tin nhắn đã được gửi trước
    if (interaction.replied || interaction.deferred) {
        return interaction.editReply({
            content: logged
                ? "🧭 Đạo hữu đang ở trong phiên quản trị. Hãy chọn hành động bên dưới:"
                : "🧩 Hãy đăng nhập quyền admin trước khi thực hiện thao tác:",
            components: [row],
            flags: MessageFlags.Ephemeral,
        });
    }

    return interaction.reply({
        content: logged
            ? "🧭 Đạo hữu đang ở trong phiên quản trị. Hãy chọn hành động bên dưới:"
            : "🧩 Hãy đăng nhập quyền admin trước khi thực hiện thao tác:",
        components: [row],
        flags: MessageFlags.Ephemeral,
    });
}

// 🧩 Khi admin chọn hành động trong menu
async function handleGiftcodeAdminMenu(interaction) {
    const choice = interaction.values[0];
    const userId = interaction.user.id;

    switch (choice) {
        // 🔐 Đăng nhập
        case "login": {
            const modal = new ModalBuilder()
                .setCustomId("giftcode_admin_login")
                .setTitle("🔐 Đăng nhập quyền admin");

            const pass = new TextInputBuilder()
                .setCustomId("admin_password")
                .setLabel("Nhập mật khẩu quản trị:")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(pass));
            return interaction.showModal(modal);
        }

        // ➕ Thêm giftcode
        case "add": {
            if (!isAdminSession(userId))
                return interaction.update({
                    content: "❌ Đạo hữu chưa đăng nhập quyền admin.",
                    components: [],
                    flags: MessageFlags.Ephemeral,
                });

            const modal = new ModalBuilder()
                .setCustomId("giftcode_admin_add")
                .setTitle("➕ Tạo giftcode mới");

            const fields = [
                { id: "code", label: "Mã giftcode (duy nhất)", req: true },
                { id: "type", label: "Loại quà (tuvi | stone | item | pet)", req: true },
                { id: "value", label: "Giá trị / idItem / idPet (vd: 500, phoenix)", req: true },
                { id: "maxUses", label: "Số lần sử dụng tối đa (mặc định 1)", req: false },
                { id: "expire", label: "Thời hạn (vd: 7d, 12h, 1m)", req: false },
            ];

            modal.addComponents(
                fields.map(f =>
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId(f.id)
                            .setLabel(f.label)
                            .setStyle(TextInputStyle.Short)
                            .setRequired(f.req)
                    )
                )
            );

            return interaction.showModal(modal);
        }

        // 🗑️ Xóa giftcode
        case "delete": {
            if (!isAdminSession(userId))
                return interaction.update({
                    content: "❌ Đạo hữu chưa đăng nhập quyền admin.",
                    components: [],
                    flags: MessageFlags.Ephemeral,
                });

            const codes = await GiftCode.find({}, "code");
            if (!codes.length)
                return interaction.update({
                    content: "📭 Không có giftcode nào để xóa.",
                    components: [],
                    flags: MessageFlags.Ephemeral,
                });

            const delMenu = new StringSelectMenuBuilder()
                .setCustomId("giftcode_admin_delete_select")
                .setPlaceholder("🗑️ Chọn giftcode để xóa")
                .addOptions(codes.map(c => ({ label: c.code, value: c.code })));

            return interaction.update({
                content: "🗑️ Hãy chọn giftcode muốn xóa:",
                components: [new ActionRowBuilder().addComponents(delMenu)],
                flags: MessageFlags.Ephemeral,
            });
        }

        // 📜 Danh sách giftcode
        case "list": {
            if (!isAdminSession(userId))
                return interaction.update({
                    content: "❌ Đạo hữu chưa đăng nhập quyền admin.",
                    components: [],
                    flags: MessageFlags.Ephemeral,
                });

            const codes = await GiftCode.find().sort({ createdAt: -1 });
            if (!codes.length)
                return interaction.update({
                    content: "📭 Hiện chưa có giftcode nào.",
                    components: [],
                    flags: MessageFlags.Ephemeral,
                });

            const formatRemain = (t) => {
                if (!t) return "♾️ Không hết hạn";
                const diff = t - Date.now();
                if (diff <= 0) return "⏰ Hết hạn";
                const d = Math.floor(diff / 86400000);
                const h = Math.floor((diff % 86400000) / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                return d > 0 ? `Còn ${d} ngày ${h} giờ ${m} phút` : h > 0 ? `Còn ${h} giờ ${m} phút` : `Còn ${m} phút`;
            };

            let msg = "📜 **Danh sách giftcode hiện có:**\n";
            for (const g of codes) {
                msg += `\n🔹 \`${g.code}\``;
                msg += `\n   Tuvi: ${g.rewards.xp || 0}, 💎: ${g.rewards.stone || 0}`;
                msg += `\n   🎒 ${g.rewards.items?.length || 0} vật phẩm, 🐉 ${g.rewards.pets?.length || 0} linh thú`;
                msg += `\n   🔢 Dùng: ${g.usedBy.length}/${g.maxUses}`;
                msg += `\n   🕒 ${formatRemain(g.expiresAt)}\n`;
            }

            return interaction.update({ content: msg, components: [], flags: MessageFlags.Ephemeral });
        }
    }
}

// 🧩 Modal — xử lý đăng nhập admin (có log + tạm khóa + reset 24h)


const failedAttempts = new Map(); // { userId: { count, lastAttempt } }
const MAX_FAILS = 3;
const LOCK_TIME = 5 * 60 * 1000; // 5 phút
const RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 giờ

// 🕐 Reset toàn bộ bộ đếm mỗi 24 giờ
setInterval(() => {
    failedAttempts.clear();
    console.log("🧹 Reset danh sách thất bại đăng nhập admin sau 24h");
}, RESET_INTERVAL);

async function handleGiftcodeAdminLogin(interaction) {
    const userId = interaction.user.id;
    const password = interaction.fields.getTextInputValue("admin_password");
    const now = Date.now();

    const attempt = failedAttempts.get(userId);

    // ⛔ Nếu đang bị khóa
    if (attempt && attempt.count >= MAX_FAILS && now - attempt.lastAttempt < LOCK_TIME) {
        const remaining = Math.ceil((LOCK_TIME - (now - attempt.lastAttempt)) / 60000);
        return interaction.update({
            content: `⛔ Đạo hữu đã nhập sai quá ${MAX_FAILS} lần. Hãy thử lại sau ${remaining} phút.`,
            components: [],
            flags: MessageFlags.Ephemeral,
        });
    }

    // ✅ Đúng mật khẩu
    if (password === process.env.ADMIN_PASSWORD) {
        createAdminSession(userId);
        failedAttempts.delete(userId);

        // 📘 Gửi log vào kênh LOG_CHANNEL_ID
        const logEmbed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ ADMIN LOGIN SUCCESS")
            .setDescription(`👤 <@${userId}> đã đăng nhập quyền admin thành công.`)
            .setTimestamp();

        const logChannel = interaction.client.channels.cache.get(process.env.LOG_CHANNEL_ID);
        if (logChannel) logChannel.send({ embeds: [logEmbed] });

        return interaction.update({ content: "✅ Đăng nhập quyền admin thành công!", components: [], flags: MessageFlags.Ephemeral });
    }

    // ❌ Sai mật khẩu
    const newCount = attempt ? attempt.count + 1 : 1;
    failedAttempts.set(userId, { count: newCount, lastAttempt: now });

    const remainingTries = Math.max(0, MAX_FAILS - newCount);

    // ⚠️ Gửi log vào kênh quản trị
    const logEmbed = new EmbedBuilder()
        .setColor(remainingTries > 0 ? "Yellow" : "Red")
        .setTitle(remainingTries > 0 ? "⚠️ ADMIN LOGIN FAIL" : "🚨 ADMIN LOGIN LOCKED")
        .setDescription(
            `👤 **Người dùng:** <@${userId}> (${userId})\n` +
            `❌ **Mật khẩu sai:** \`${password}\`\n` +
            `🔢 **Số lần sai:** ${newCount}/${MAX_FAILS}` +
            (remainingTries <= 0 ? `\n🔒 **Tài khoản bị tạm khóa 5 phút.**` : "")
        )
        .setTimestamp();

    const logChannel = interaction.client.channels.cache.get(process.env.LOG_CHANNEL_ID);
    if (logChannel) logChannel.send({ embeds: [logEmbed] });

    // 📩 Thông báo cho người dùng
    if (remainingTries > 0) {
        return interaction.update({
            content: `⚠️ Sai mật khẩu! Đạo hữu còn ${remainingTries} lần thử trước khi bị khóa.`,
            components: [],
            flags: MessageFlags.Ephemeral,
        });
    } else {
        return interaction.update({
            content: `🚨 Đạo hữu đã nhập sai quá ${MAX_FAILS} lần. Đăng nhập bị khóa trong 5 phút.`,
            components: [],
            flags: MessageFlags.Ephemeral,
        });
    }
}

// 🧩 Modal — xử lý thêm giftcode
async function handleGiftcodeAdminAdd(interaction) {
    const userId = interaction.user.id;
    if (!isAdminSession(userId))
        return interaction.update({ content: "❌ Phiên admin đã hết hạn. Hãy đăng nhập lại.", components: [], flags: MessageFlags.Ephemeral });

    const code = interaction.fields.getTextInputValue("code").trim();
    const type = interaction.fields.getTextInputValue("type").trim().toLowerCase();
    const value = interaction.fields.getTextInputValue("value").trim();
    const maxRaw = interaction.fields.getTextInputValue("maxUses") || "";
    const expireRaw = interaction.fields.getTextInputValue("expire");

    if (await GiftCode.findOne({ code }))
        return interaction.update({ content: "⚠️ Giftcode này đã tồn tại.", components: [], flags: MessageFlags.Ephemeral });

    let maxUses = parseInt(maxRaw, 10);
    if (isNaN(maxUses) || maxUses < 1) maxUses = 1;

    const expiresAt = parseExpireString(expireRaw);
    const rewards = {};

    switch (type) {
        case "tuvi": rewards.xp = parseInt(value) || 0; break;
        case "stone": rewards.stone = parseInt(value) || 0; break;
        case "item": rewards.items = [{ itemId: value, quantity: 1 }]; break;
        case "pet": rewards.pets = [{ petId: value, quantity: 1 }]; break;
        default:
            return interaction.update({
                content: "⚠️ Loại quà không hợp lệ! Dùng tuvi | stone | item | pet.",
                components: [],
                flags: MessageFlags.Ephemeral,
            });
    }

    await GiftCode.create({ code, rewards, expiresAt, maxUses });

    return interaction.update({
        content: `✅ Đã tạo giftcode \`${code}\` thành công!\n🎁 Loại: ${type}\n💎 Giá trị: ${value}\n⏰ ${expiresAt ? expiresAt.toLocaleString("vi-VN") : "Không hết hạn"}`,
        components: [],
        flags: MessageFlags.Ephemeral,
    });
}

// 🧩 Khi chọn giftcode để xóa
async function handleGiftcodeDeleteSelect(interaction) {
    const code = interaction.values[0];
    const deleted = await GiftCode.findOneAndDelete({ code });
    if (!deleted)
        return interaction.update({ content: "❌ Không tìm thấy giftcode để xóa.", components: [] });

    return interaction.update({ content: `🗑️ Đã xóa giftcode \`${code}\` thành công.`, components: [] });
}

module.exports = {
    handleGiftCode,
    handleGiftCodeSelect,
    handleSetupGiftCode,
    handleGiftcodeAdminMenu,
    handleGiftcodeAdminLogin,
    handleGiftcodeAdminAdd,
    handleGiftcodeDeleteSelect,
};
