import fs from "fs";

export function getAvatarUrl(qq, size: 0 | 40 | 100 | 140 = 100) {
    return `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=` + qq;
}

export function isFile(path) {
    try {
        const stats = fs.statSync(path);
        return stats.isFile() && !stats.isDirectory()
    } catch (err) {
        return false;
    }
}

export function isDirectory(path) {
    try {
        const stats = fs.statSync(path);
        return stats.isDirectory()
    } catch (err) {
        return false;
    }
}
