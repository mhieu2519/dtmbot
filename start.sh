#!/bin/bash

# Kiểm tra ffmpeg
ffmpeg -version || {
  echo "❌ FFmpeg chưa cài đúng!";
  exit 1;
}

# Chạy bot
echo "🚀 Bắt đầu bot Discord!"
node index.js
