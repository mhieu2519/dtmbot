#!/bin/bash

# Tải ffmpeg bản tĩnh về
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz

# Giải nén
tar -xf ffmpeg.tar.xz
cd ffmpeg-*-amd64-static

# Copy ffmpeg và ffprobe vào đường dẫn thực thi
cp ffmpeg /usr/local/bin
cp ffprobe /usr/local/bin

# Clean up
cd ..
rm -rf ffmpeg-*-amd64-static ffmpeg.tar.xz

echo "✅ FFmpeg đã được cài đặt!"
