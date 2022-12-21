export function getAvatarUrl(qq, size: 0 | 40 | 100 | 140 = 100) {
    return `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=` + qq;
}
