const { google } = require("googleapis");
const fs = require("fs");
require("dotenv").config();
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

// Xuất hàm để dùng trong bot
module.exports = { getSheetData };
