//./commands/petInventory
/*
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const UserXP = require("../models/UserXP");
const { createCanvas, loadImage, registerFont } = require("canvas");
const { PassThrough } = require("stream");
const { addPettoInventory, addPetToInventory } = require("../utils/petInventory");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
registerFont(path.join(__dirname, "../assets/fonts/Pacifico-Regular.ttf"), { family: "Pacifico" });

async function createPetInventoryImage(displayName, inventoryPet, page = 1, itemsPerPage = 3) {
    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext('2d');

    // Nền
    const bg = await loadImage('./assets/backgrounds/inventory_pet.png');
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // Tiêu đề
    ctx.font = '28px Pacifico';
    ctx.fillStyle = '#1A2A4F';
    ctx.fillText(`Túi 🪅 – Trang ${page}`, 40, 50);
    ctx.font = '20px Pacifico';
    ctx.fillText(`🔒 Túi hiện đang khóa.!`, 300, 150);

    // Hiển thị linh thú
    const startIndex = (page - 1) * itemsPerPage;
    const pageItems = inventoryPet.slice(startIndex, startIndex + itemsPerPage);

    const itemHeight = 70;
    pageItems.forEach((item, index) => {
        const y = 100 + index * itemHeight;
        ctx.fillStyle = getColorByRarity(item.rarity);

        ctx.fillText(`${item.name} x${item.quantity}`, 60, y);
        ctx.font = '20px Updock';
        ctx.fillStyle = '#666666';
        ctx.fillText(`${item.description}`, 70, y + 25);
        ctx.font = '28px Pacifico';
    });

    // Hiển thị tên
    ctx.font = '24px Pacifico';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(displayName, 600, 40);


    return canvas.toBuffer('image/png');
}

function createInventoryPetButtons(currentPage, totalPages) {
    const row = new ActionRowBuilder();

    if (currentPage > 1) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`prev_petinventory_${currentPage - 1}`)
                .setLabel('⬅ Trang trước')
                .setStyle(ButtonStyle.Primary)
        );
    }

    if (currentPage < totalPages) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`next_petinventory_${currentPage + 1}`)
                .setLabel('Trang sau ➡')
                .setStyle(ButtonStyle.Primary)
        );
    }

    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`back_to_profile`)
            .setLabel('💧 Profile')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row];
}


// Hàm tạo nền có text bằng Canvas
async function createPetGridBackground(displayName, pets) {
    const canvas = createCanvas(1536, 1024);
    const ctx = canvas.getContext("2d");

    // nền
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Header ---
    ctx.font = "48px Pacifico";
    ctx.fillStyle = "#1A2A4F";
    ctx.fillText(`🪅 Túi Linh Thú`, 40, 120);

    ctx.font = "36px Pacifico";
    ctx.fillStyle = "#1A2A4F";
    ctx.fillText(displayName, 1200, 120);

    // --- Grid ---
    const gridTop = 200;
    const colWidth = 768;
    const rowHeight = (canvas.height - gridTop) / 4; // 824 / 4 = 206
    const gifSize = 180;

    ctx.font = "36px Pacifico";
    ctx.fillStyle = "#1A2A4F";

    pets.forEach((pet, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);

        const cellX = col * colWidth;
        const cellY = gridTop + row * rowHeight;

        // Tâm ô
        const centerX = cellX + colWidth / 2;
        const centerY = cellY + rowHeight / 2;

        // Kích thước text tạm tính
        const textWidth = ctx.measureText(pet.name).width;
        const spacing = 20; // khoảng cách text và gif
        const totalWidth = textWidth + spacing + gifSize;

        // Tính vị trí text và gif để căn giữa cụm
        const textX = centerX - totalWidth / 2;
        const textY = centerY + 10; // để text nằm giữa dọc

        ctx.fillText(pet.name, textX, textY);

        // Gif sẽ ghép bằng ffmpeg -> chỉ vẽ khung gợi ý
        // ctx.strokeStyle = "rgba(0,0,0,0.2)";
        // ctx.strokeRect(textX + textWidth + spacing, centerY - gifSize / 2, gifSize, gifSize);
    });

    const tempPath = path.join(__dirname, "../temp/bg_with_text.png");
    fs.writeFileSync(tempPath, canvas.toBuffer("image/png"));
    return tempPath;
}

// Hàm render gif vào nền
function renderInventoryWithGif(backgroundPath, pets) {
    return new Promise((resolve, reject) => {
        const buffers = [];
        const stream = new PassThrough();

        const ff = ffmpeg().input(backgroundPath).inputOptions("-loop 1");

        pets.forEach(pet => {
            ff.input(pet.gif).inputOptions("-ignore_loop 0");
        });

        const gifSize = 180;
        const colWidth = 768;
        const rowHeight = 206;
        const gridTop = 200;

        const filters = [];
        let lastLabel = "0:v";

        pets.forEach((pet, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);

            const cellX = col * colWidth;
            const cellY = gridTop + row * rowHeight;

            // Tâm ô
            const centerX = cellX + colWidth / 2;
            const centerY = cellY + rowHeight / 2;

            // Text đã vẽ ở canvas -> giờ chỉ ghép gif
            const textWidth = 200; // giả định max text 200px (có thể tính chính xác hơn)
            const spacing = 20;
            const totalWidth = textWidth + spacing + gifSize;

            const gifX = centerX - totalWidth / 2 + textWidth + spacing;
            const gifY = centerY - gifSize / 2;

            filters.push(`[${i + 1}:v]scale=${gifSize}:${gifSize}[gif${i}]`);

            const outLabel = i === pets.length - 1 ? "vout" : `tmp${i}`;
            filters.push(`[${lastLabel}][gif${i}]overlay=${gifX}:${gifY}:shortest=1[${outLabel}]`);
            lastLabel = outLabel;
        });

        ff.complexFilter(filters, "vout")
            .outputOptions("-t 5").format("gif")
            .on("error", reject)
            .on("end", () => resolve(Buffer.concat(buffers)))
            .pipe(stream);

        stream.on("data", chunk => buffers.push(chunk));
    });
}
const pets = require("../shops/spiritBeast");

// Hàm gọi trong bot
async function showPetInventoryEffectTest(interaction, displayName, pets) {
    /*
     const backgroundPath = await createPetGridBackground(displayName, pets);
     const buffer = await renderInventoryWithGif(backgroundPath, pets);
 
     const file = new AttachmentBuilder(buffer, { name: "pet_grid.gif" });
     const embed = new EmbedBuilder()
         .setTitle("🪅 Túi Linh Thú")
         .setImage("attachment://pet_grid.gif")
         .setColor("#ffe4ec");
 
     await interaction.followUp({ embeds: [embed], files: [file] });
 *

    const user = await UserXP.findOne({ guildId: interaction.guildId, userId: interaction.user.id });

    // Lấy pet từ dataset
    const phoenix = pets.find(p => p.petId === "phoenix");
    //console.log(phoenix);

    console.log("Pet tìm được:", pets);
    const newPet = {
        petId: phoenix.petId,
        name: phoenix.name,
        type: phoenix.type,
        level: phoenix.level,
        rarity: phoenix.rarity,
        description: phoenix.description,
        imageUrl: phoenix.imageUrl,
        quantity: 1,
    };

    // console.log("Thêm pet:", phoenix);
    // check type pet
    //console.log("Kiểu dữ liệu:", typeof phoenix);
    // Add pet
    await addPetToInventory(user, newPet);
    user.save();
    console.log("Pet đã thêm vào inventoryPet:", user.inventoryPet);
}


module.exports = { showPetInventoryEffectTest, createPetInventoryImage, createInventoryPetButtons };

*/
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, EmbedBuilder } = require("discord.js");

const { createCanvas, loadImage, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");
const { PassThrough, Readable } = require("stream");
const ffmpeg = require("fluent-ffmpeg");

// Đăng ký font tùy chọn (nếu có file font riêng)
try {
    registerFont(path.join(__dirname, "../assets/fonts/Pacifico-Regular.ttf"), { family: "Pacifico" });
} catch { }

/**
 * 🪅 Tạo nền có chữ cho mỗi trang (Canvas)
 */
async function createPetGridBackground(displayName, pets, pageIndex = 0) {
    const canvas = createCanvas(1536, 1024);
    const ctx = canvas.getContext("2d");

    // nền
    ctx.fillStyle = "#f7f6f4";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.font = "bold 56px Pacifico";
    ctx.fillStyle = "#1A2A4F";
    ctx.fillText(`🪅 Túi Linh Thú`, 50, 110);

    ctx.font = "42px Pacifico";
    ctx.fillStyle = "#2a3f6e";
    ctx.fillText(displayName, 1200, 110);

    ctx.font = "32px Pacifico";
    ctx.fillStyle = "#2a3f6e";
    ctx.fillText(`Trang ${pageIndex + 1}`, 1300, 180);

    // Grid setup
    const gridTop = 220;
    const colWidth = 768;
    const rowHeight = (canvas.height - gridTop) / 3;
    const gifSize = 180;

    ctx.font = "36px Pacifico";
    ctx.fillStyle = "#1A2A4F";

    pets.forEach((pet, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);

        const cellX = col * colWidth;
        const cellY = gridTop + row * rowHeight;

        // Vẽ khung mỗi ô
        ctx.strokeStyle = "rgba(0, 0, 0, 1)";
        ctx.strokeRect(cellX + 60, cellY + 20, colWidth - 120, rowHeight - 40);

        const centerX = cellX + colWidth / 2;
        const centerY = cellY + rowHeight / 2;

        const textWidth = ctx.measureText(pet.name).width;
        const spacing = 20;
        const totalWidth = textWidth + spacing + gifSize;

        const textX = centerX - totalWidth / 2;
        const textY = centerY + 10;

        ctx.fillText(pet.name, textX, textY);
        ctx.font = "24px Pacifico";
        ctx.fillText(`Cấp. ${pet.level}`, textX + 40, textY + 40);
    });
    /*
        const tempPath = path.join(__dirname, `../temp/bg_page_${pageIndex}.png`);
        fs.writeFileSync(tempPath, canvas.toBuffer("image/png"));
        return tempPath;
        */
    return canvas.toBuffer("image/png");
}

/**
 * 🧩 Ghép các GIF pet vào nền bằng FFmpeg
 */
function renderInventoryWithGif(backgroundBuffer, pets) {
    return new Promise((resolve, reject) => {
        const buffers = [];
        const stream = new PassThrough();
        // const ff = ffmpeg().input(backgroundPath).inputOptions("-loop 1");
        // 🟢 Chuyển buffer nền thành input stream
        const bgStream = Readable.from(backgroundBuffer);

        // 🧩 Tạo ffmpeg pipeline
        const ff = ffmpeg()
            .input(bgStream)
            .inputFormat("image2pipe") // chỉ định định dạng
            .inputOptions("-loop 1");

        pets.forEach(pet => {
            ff.input(pet.imageUrl).inputOptions("-ignore_loop 0");
        });


        const gifSize = 180;
        const colWidth = 768;
        const rowHeight = 268;
        const gridTop = 220;

        const filters = [];
        let lastLabel = "0:v";

        pets.forEach((pet, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const cellX = col * colWidth;
            const cellY = gridTop + row * rowHeight;

            const textWidth = 200;
            const spacing = 20;
            const totalWidth = textWidth + spacing + gifSize;

            const centerX = cellX + colWidth / 2;
            const centerY = cellY + rowHeight / 2;
            const gifX = centerX - totalWidth / 2 + textWidth + spacing;
            const gifY = centerY - gifSize / 2;

            filters.push(`[${i + 1}:v]scale=${gifSize}:${gifSize}[gif${i}]`);

            const outLabel = i === pets.length - 1 ? "vout" : `tmp${i}`;
            filters.push(`[${lastLabel}][gif${i}]overlay=${gifX}:${gifY}:shortest=1[${outLabel}]`);
            lastLabel = outLabel;
        });

        ff.complexFilter(filters, "vout")
            .outputOptions(["-t 5", "-f gif"])
            .on("error", reject)
            .on("end", () => resolve(Buffer.concat(buffers)))
            .pipe(stream);

        stream.on("data", chunk => buffers.push(chunk));
    });
}

/**
 * 🎬 Hàm chính – render toàn bộ inventory pet ra GIF (tự chia trang)
 */
async function renderPetInventoryGif(displayName, allPets) {
    const pages = [];
    const pageSize = 6;
    const totalPages = Math.ceil(allPets.length / pageSize);

    for (let i = 0; i < totalPages; i++) {
        const pets = allPets.slice(i * pageSize, (i + 1) * pageSize);
        const bg = await createPetGridBackground(displayName, pets, i);
        const buffer = await renderInventoryWithGif(bg, pets);
        pages.push({ buffer, page: i + 1 });
    }

    return pages; // Trả mảng Buffer cho từng trang
}

async function showPetInventory(interaction, displayName, pets = []) {
    // 🧩 1️⃣ Kiểm tra nếu người chơi chưa có linh thú nào
    if (!pets || pets.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle(`🪅 Túi Linh Thú của ${displayName}`)
            .setDescription("Đạo hữu chưa sở hữu linh thú nào cả 🌱")
            .setColor("#ffb6c1");

        await interaction.editReply({ embeds: [embed], files: [] });
        return;
    }

    try {
        // 🧩 2️⃣ Sinh ảnh động (GIF) hiển thị linh thú
        const pages = await renderPetInventoryGif(displayName, pets);

        // Nếu vì lý do gì render lỗi hoặc rỗng
        if (!pages || pages.length === 0 || !pages[0].buffer) {
            const embed = new EmbedBuilder()
                .setTitle(`🪅 Túi Linh Thú của ${displayName}`)
                .setDescription("Không thể hiển thị linh thú của đạo hữu lúc này 😢")
                .setColor("#ff8c94");

            await interaction.editReply({ embeds: [embed], files: [] });
            return;
        }

        // 🧩 3️⃣ Hiển thị trang đầu tiên (có thể mở rộng sang phân trang sau)
        const { buffer } = pages[0];
        const file = new AttachmentBuilder(buffer, { name: "pet_inventory.gif" });
        // nâng cấp
        const buttons = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('upgrade_petinventory')
                    .setLabel('🆙 Upgrade linh thú')
                    .setStyle(ButtonStyle.Success)
            )

        ];
        const embed = new EmbedBuilder()
            .setTitle(`🪅 Túi Linh Thú của ${displayName}`)
            .setImage("attachment://pet_inventory.gif")
            .setColor("#ffe4ec");

        await interaction.editReply({ embeds: [embed], files: [file], components: buttons });
    } catch (err) {
        console.error("❌ Lỗi khi hiển thị pet inventory:", err);
        const embed = new EmbedBuilder()
            .setTitle(`🪅 Túi Linh Thú của ${displayName}`)
            .setDescription("Đã xảy ra lỗi khi tải linh thú của đạo hữu. Vui lòng thử lại sau ⚙️")
            .setColor("#ff6961");

        await interaction.editReply({ embeds: [embed], files: [] });
    }
}



module.exports = { renderPetInventoryGif, showPetInventory };
