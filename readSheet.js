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

    const spreadsheetId = process.env.SPREADSHEET_ID;
    const range = "Đặt đá!A2:I100"; // Dữ liệu từ A đến I (bao gồm ngày, giờ và dữ liệu)

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

        let data = [];
        for (let row of rows) {
            const date = row[0]; // Cột A: Ngày
            const time = row[1]; // Cột B: Thời gian (13h, 21h)
            
            // Cột C đến G: Danh sách vật liệu + số lượng
            for (let i = 2; i < row.length; i++) {
                if (row[i] && row[i].includes("x")) {
                    const parts = row[i].split("x");
                    const material = parts[0].trim();
                    const value = parseInt(parts[1].trim(), 10);
                    
                    data.push({ date, time, material, result: value });
                }
            }
        }

        return data;
    } catch (error) {
        console.error("Lỗi đọc dữ liệu:", error);
        return [];
    }
}
function drawScatterPlot(data) {
    if (!data || data.length === 0) {
        console.error("❌ Không có dữ liệu để vẽ biểu đồ!");
        return null;
    }

    const width = 800;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Danh sách loại đá (tự động lấy từ dữ liệu)
    const materials = [...new Set(data.map(d => d.material))];

    // Danh sách ngày (để làm trục X)
    const days = [...new Set(data.map(d => d.date))];

    const xStep = width / (days.length * 2 + 1); // *2 vì mỗi ngày có 2 mốc giờ
    const yStep = height / (materials.length + 1);

    // Vẽ trục X, Y
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 20);
    ctx.lineTo(50, height - 50);
    ctx.lineTo(width - 50, height - 50);
    ctx.stroke();

    // Vẽ nhãn trục Y (tên loại đá)
    ctx.font = "14px Arial";
    ctx.textAlign = "right";
    ctx.fillStyle = "black";
    materials.forEach((material, index) => {
        ctx.fillText(material, 45, height - 50 - yStep * (index + 1));
    });

    // Vẽ nhãn trục X (ngày + giờ)
    ctx.textAlign = "center";
    days.forEach((day, index) => {
        ctx.fillText(`${day} 13h`, 50 + xStep * (index * 2 + 1), height - 30);
        ctx.fillText(`${day} 21h`, 50 + xStep * (index * 2 + 2), height - 30);
    });

    // Vẽ điểm dữ liệu
    ctx.fillStyle = "red";
    data.forEach(row => {
        const x = 50 + xStep * (days.indexOf(row.date) * 2 + (row.time === "13h" ? 1 : 2));
        const y = height - 50 - yStep * (materials.indexOf(row.material) + 1);

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Vẽ số lượng
        ctx.fillText(`x${row.result}`, x, y - 10);
    });

    return canvas.toBuffer("image/png");
}


// Xuất hàm để dùng trong bot
module.exports = { getSheetData, drawScatterPlot };
