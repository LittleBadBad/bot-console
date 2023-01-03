import {CP, IOrder} from "../types";
import {GroupMessageEvent} from "oicq";
import {generate} from 'text-to-image';

async function convertTextToImage(text: string, fontSize: number = 20, maxWidth: number = 500): Promise<Buffer> {
    const dataUri = await generate(text, {
        bgColor: "#ffffff",
        fontSize,
        maxWidth,
        margin: 10,
        fontFamily: "Microsoft YaHei",
    });
    const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
}

const chatGPT: CP<{
    email: string,
    password: string,
    availableGroups: number[]
}, { sessions: string[] }> = async (bot, {availableGroups, email, password}, db) => {
    process.env.PUPPETEER_EXECUTABLE_PATH = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "false"

    function getSessions() {
        db.read()
        return db.data.sessions
    }

    const {ChatGPTAPIBrowser, getOpenAIAuth} = await import('chatgpt')
    const api = new ChatGPTAPIBrowser({
        email,
        password,
        debug: false,
        minimize: true
    })

    let logged = false, res, session

    const login: IOrder = {
        desc: "登录chatgpt",
        trigger: /^登录$/g,
        auth: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id),
        async action(e) {
            await api.initSession()
            logged = await api.getIsAuthenticated().catch(e => false)
            return e.reply(logged ? "登录成功" : "登录失败", true)
        }
    }

    const closeSession: IOrder = {
        trigger: /^关闭会话$/g,
        auth: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id),
        async action(e) {
            await api.closeSession()
            logged = false
            return e.reply("关闭成功", true)
        }
    }

    const resetSession: IOrder = {
        trigger: /^重置会话$/g,
        auth: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id),
        async action(e) {
            await api.resetSession()
            logged = false
            return e.reply("重置成功", true)
        }
    }

    const refreshSession: IOrder = {
        trigger: /^刷新会话$/g,
        auth: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id),
        async action(e) {
            await api.refreshSession()
            logged = false
            return e.reply("刷新成功", true)
        }
    }

    const checkSession: IOrder = {
        trigger: /^查看会话$/g,
        auth: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id),
        action(e) {
            e.reply(getSessions().map((v, i) => `${i + 1}. ${v}`).join("\n"))
        }
    }
    const selectSession: IOrder = {
        trigger: /^选择会话\s+.+$/g,
        auth: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id),
        action(e) {
            const [_, s] = e.raw_message.trim().split(/\s+/g)
            session = s
        }
    }

    const chatWithGpt: IOrder = {
        desc: "和chatgpt聊天，@群聊中的机器人+要说的话即可，返回消息暂时为图片，因为过长文本会被标记为风控消息",
        trigger: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id) && e.atme,
        auth: _ => true,
        async action(e: GroupMessageEvent) {
            if (logged) {
                e.message = e.message.filter(v => v.type !== "at")
                res = await api.sendMessage(e.message.filter(v => v.type === "text")
                    .map(v => v.type === "text" && v.text).join(" "), session ? {
                    conversationId: session,
                    parentMessageId: res.messageId
                } : undefined)
                const msg = res.response.trim()
                console.log(msg);
                return e.reply({
                    type: "image",
                    file: await // 使用示例
                        convertTextToImage(msg)
                }, true)
                    .catch(e => console.error("发送失败"))
            } else {
                return e.reply("尚未登陆", true)
            }
        }
    }

    const changeGroup: IOrder = {
        trigger: /^群聊\s+\d+$/g,
        auth: _ => true,
        action(e) {
            const g = parseInt(e.raw_message.match(/\d+/g)[0])
            !availableGroups.includes(g) && availableGroups.push(g)
            e.reply("更改成功，现在机器人现在可在群" + g + "中使用", true)
        }
    }

    const resetThread: IOrder = {
        trigger: /^重置线程$/g,
        auth: _ => true,
        async action(e) {
            await api.resetThread()
            return e.reply("重置成功", true)
        }
    }

    const test: IOrder = {
        trigger: /^图片$/g,
        auth: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id),
        async action(e) {
            e.reply({
                type: "image",
                file: await // 使用示例
                    convertTextToImage(`猫的叫声通常是哈喇（meow）。这是猫常用的一种叫声，意思是它在叫唤人或者在表达自己的情绪。猫也会用其他声音来表达自己，比如打呵欠（yawn）、喵喵叫
（purr）等。

要学会猫叫，你可以尝试模仿它的叫声。你也可以通过观察猫的行为来学习它们的叫声，比如它们叫的时候的眼神、身体语言等。经过一段时间的练习，你就可以
学会猫叫了。

注意，猫的叫声有时候也会受到它们的健康状况的影响。如果你的猫叫声异常，建议你带它去看兽医。
`)
            })
        }
    }

    return {
        onDeactivate() {
            api.closeSession()
        },
        orders: [
            login,
            closeSession,
            checkSession,
            selectSession,
            chatWithGpt,
            resetSession,
            refreshSession,
            changeGroup,
            resetThread,
            test
        ]
    }
}

export default chatGPT
