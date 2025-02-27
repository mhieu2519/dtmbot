const { google } = require("googleapis");
const fs = require("fs");
require("dotenv").config();
const { createCanvas } = require("canvas");
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

async function getSheetData() {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SPREADSHEET_ID; // ID của Google Sheets
    const range = "Đặt đá!A22:I100"; // Lấy dữ liệu từ tab "Đặt đá"

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rows = res.data.values;
        if (!rows || rows.length === 0) {
            console.log("Không có dữ liệu.");
            return [];
        }

        return rows;
    } catch (error) {
        console.error("Lỗi đọc dữ liệu:", error);
        return [];
    }
}



function drawScatterPlot(rawData) {
    if (!rawData || rawData.length === 0) {
        console.error("❌ Không có dữ liệu để vẽ biểu đồ!");
        return null;
    }

    // Chuyển đổi dữ liệu từ dạng ["Ngày", "Giờ", "Loại đá", "Kết quả"]
    const data = rawData.map(row => ({
        date: row[0],        // Cột A: Ngày
        time: row[1],        // Cột B: Thời gian (13h, 18h)
        material: row[2],    // Cột C: Loại đá
        result: row[3] || 0  // Cột D: Giá trị (mặc định 0 nếu rỗng)
    }));

    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Danh sách loại đá
    const materials = [
        "Huyết Viêm Thạch", "Tử Huyễn Thạch",
        "Bích Tinh Thạch", "Địa Tinh Thạch",
        "Hoàng Kim Thạch", "Lam Thủy Thạch",
        "Tử Tinh Thạch", "Hồng Nhưỡng Thạch",
        "Lục Lân Thạch"
    ];

    // Lấy danh sách ngày
    const days = [...new Set(data.map(row => row.date))];
    const xStep = width / (days.length * 2);
    const yStep = height / (materials.length + 1);

    // Vẽ trục
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(50, height - 50);
    ctx.lineTo(width - 50, height - 50);
    ctx.stroke();

    // Vẽ nhãn trục tung (loại đá)
    ctx.font = "14px Arial";
    ctx.textAlign = "right";
    ctx.fillStyle = "black";
    materials.forEach((material, index) => {
        ctx.fillText(material, 45, height - 50 - yStep * (index + 1));
    });

    // Vẽ nhãn trục hoành (ngày)
    ctx.textAlign = "center";
    days.forEach((day, index) => {
        ctx.fillText(day, 50 + xStep * (index * 2 + 1), height - 30);
    });

    // Vẽ điểm dữ liệu
    ctx.fillStyle = "red";
    data.forEach(row => {
        const x = 50 + xStep * (days.indexOf(row.date) * 2 + (row.time === "13h" ? 0 : 1));
        const y = height - 50 - yStep * (materials.indexOf(row.material) + 1);
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(row.result, x, y - 10);
    });

    return canvas.toBuffer("image/png");
}


// Xuất hàm để dùng trong bot
module.exports = { getSheetData, drawScatterPlot };
