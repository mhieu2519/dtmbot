const { google } =  require("googleapis");
require("dotenv").config();
const { createCanvas } = require("canvas");
const fs = require("fs");


const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const spreadsheetId = process.env.SPREADSHEET_ID; // ID của Google Sheets

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

async function getSheetData(range) {
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range, 
    });

    return response.data.values;
}

async function processData() {
    try {
        const data = await getSheetData("Đặt đá!A22:I100"); // Đọc dữ liệu

        let result = [];
        const startIndex = data[0][0].toLowerCase().includes("ngày") ? 1 : 0;

        for (let i = startIndex; i < data.length; i += 2) { // Lấy từng cặp dòng
            let row1 = data[i]; // Hàng chứa vật liệu
            let row2 = data[i + 1] || []; // Hàng chứa tỉ lệ tương ứng

            let date = row1[0] || (result.length > 0 ? result[result.length - 1].date : "");
            let time = row1[1] || "";
            if (!date || !time) continue; // Bỏ qua hàng không có đủ thông tin

            let materials = [];
            for (let j = 2; j <= 7; j++) { // Cột C đến H
                if (row1[j] && row2[j]) {
                    materials.push({
                        name: row1[j].trim(),
                        ratio: row2[j].trim(),
                    });
                }
            }

            let finalResult = row1[8] || "N/A"; // Cột I là kết quả

            result.push({ date, time, materials, result: finalResult });
        }

       // console.dir(result, { depth: null }); // Hiển thị đầy đủ
        return result;
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
    }
}

// Gọi hàm để kiểm tra

// hàm để vẽ
function drawChart(data){
    // Dữ liệu mẫu

    // Cấu hình canvas
    const width = 2000;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Danh sách vật liệu (trục Y)
    const materials = [
        "Huyết Viêm Thạch",
        "Tử Huyễn Thạch",
        "Bích Tinh Thạch",
        "Địa Tinh Thạch",
        "Hoàng Kim Thạch",
        "Lam Thủy Thạch",
        "Tử Tinh Thạch",
        "Hồng Nhưỡng Thạch",
        "Lục Lân Thạch"
    ];

    // Danh sách thời gian (trục X)
    const timeSlots = [...new Set(data.map(d => d.time))]; // ["13h00", "21h00"]
    const dates = [...new Set(data.map(d => d.date))]; // ["25/02/2025", "26/02/2025", "27/02/2025"]

    const numXPoints = dates.length * timeSlots.length; // Tổng số điểm X
    const xStep = (width - 150) / numXPoints; // Khoảng cách giữa các điểm X

    // Vẽ nền trắng
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    // Vẽ trục tọa độ
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 50);
    ctx.lineTo(80, height - 50);
    ctx.lineTo(width - 50, height - 50);
    ctx.stroke();

    // Vẽ nhãn trục Y (vật liệu)
    ctx.font = "14px Arial";
    ctx.fillStyle = "black";
    materials.forEach((mat, i) => {
        let y = (height - 100) / (materials.length - 1) * i + 50;
        ctx.fillText(mat, 10, y);
    });

    // Vẽ nhãn trục X (ngày + thời gian)
    dates.forEach((date, i) => {
        timeSlots.forEach((time, j) => {
            let x = 100 + (i * timeSlots.length + j) * xStep;

          // Hiển thị nhãn mỗi 5 ngày một lần (để tránh chồng chéo)
            if (i % 5 === 0 && j === 0) {
                ctx.fillText(date, x, height - 10);
            }  
            ctx.fillText(time, x, height - 30);
        });
    });

    // Vẽ dữ liệu lên biểu đồ
    ctx.fillStyle = "red";
    ctx.font = "16px Arial";
    data.forEach((item) => {
        let xIndex = dates.indexOf(item.date) * timeSlots.length + timeSlots.indexOf(item.time);
        let materialIndex = item.materials.findIndex(m => m.ratio === item.result);
        
        if (xIndex !== -1 && materialIndex !== -1) {
            let materialName = item.materials[materialIndex].name;
            let yIndex = materials.indexOf(materialName);

            if (yIndex !== -1) {
                let x = 100 + xIndex * xStep;
                let y = (height - 100) / (materials.length - 1) * yIndex + 50;
                ctx.fillText(item.result, x, y);
            }
        }
    });

    // Tạo đường nối 
    
    // Nhóm dữ liệu theo từng vật liệu
    materials.forEach((material) => {
    let points = [];

    // Lấy các điểm dữ liệu của vật liệu này
    data.forEach((item) => {
        let xIndex = dates.indexOf(item.date) * timeSlots.length + timeSlots.indexOf(item.time);
        let materialIndex = item.materials.findIndex(m => m.ratio === item.result);

        if (xIndex !== -1 && materialIndex !== -1) {
            let materialName = item.materials[materialIndex].name;
            let yIndex = materials.indexOf(materialName);

            if (yIndex !== -1 && materialName === material) {
                let x = 100 + xIndex * xStep;
                let y = (height - 100) / (materials.length - 1) * yIndex + 50;
                points.push({ x, y });
            }
        }
    });

    // Vẽ đường nối các điểm của vật liệu này
    if (points.length > 1) {
        ctx.strokeStyle = "blue";  // Màu đường
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        ctx.stroke();
    }
    });
   
    ctx.stroke(); // Vẽ đường nối


    // Xuất hình ảnh ra file
    return canvas.toBuffer("image/png");
   
}


module.exports = {getSheetData,processData, drawChart};