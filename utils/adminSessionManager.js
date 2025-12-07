// utils/adminSessionManager.js
const adminSession = new Map();

// 🧩 Xác thực quyền
function isAdminSession(userId) {
    const last = adminSession.get(userId);
    if (!last) return false;

    const valid = Date.now() - last < 10 * 60 * 1000; // 10 phút
    if (!valid) adminSession.delete(userId);
    return valid;
}

// 🧩 Tạo phiên quản trị
function createAdminSession(userId) {
    adminSession.set(userId, Date.now());
    setTimeout(() => adminSession.delete(userId), 10 * 60 * 1000);
}

module.exports = { isAdminSession, createAdminSession };
