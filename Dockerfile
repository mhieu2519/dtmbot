# Sử dụng image Node chính thức
FROM node:22-slim

# Cài các thư viện cần cho canvas + emoji
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2 \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Đặt thư mục làm việc
WORKDIR /usr/src/app

# Copy package.json trước để cài dependencies
COPY package*.json ./

RUN npm install

# Copy toàn bộ code
COPY . .

# Port (nếu bạn dùng express)
EXPOSE 3000

# Lệnh chạy bot
CMD ["node", "index.js"]
