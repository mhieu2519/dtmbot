//./commands/petInventory
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const UserXP = require("../models/UserXP");
const { createCanvas, loadImage, registerFont } = require("canvas");

const path = require("path");
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
    ctx.fillText(`🪅 – Trang ${page}`, 40, 50);
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

module.exports = { createPetInventoryImage, createInventoryPetButtons };