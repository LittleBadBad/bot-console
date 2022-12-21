/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    swcMinify: true,
    rewrites() {
        return [{
            source: "/template/wireless_mqq_captcha.html",
            destination: "https://ssl.captcha.qq.com/template/wireless_mqq_captcha.html",
            
        },{
            source: "/template/drag_ele.html",
            destination: "https://t.captcha.qq.com/template/wireless_mqq_captcha.html",
        }]
    }
}

module.exports = nextConfig
