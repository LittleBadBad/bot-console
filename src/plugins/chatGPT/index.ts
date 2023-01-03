import {CP, IOrder} from "../../types";
import {GroupMessageEvent, MessageRet} from "oicq";
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

const index: CP<{
    email: string,
    password: string,
    availableGroups: number[]
}, { sessions: Record<string, [string, MessageRet][]> }> = async (bot, {availableGroups, email, password}, db) => {
    process.env.PUPPETEER_EXECUTABLE_PATH = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "false"
    db.read()
    db.data ||= {sessions: {}}
    db.write()

    function getSessions() {
        db.read()
        return db.data.sessions
    }

    function addSession({messageId, conversationId}, e: MessageRet) {
        db.read()
        db.data.sessions[conversationId] ?
            db.data.sessions[conversationId].push([messageId, e]) :
            db.data.sessions[conversationId] = [[messageId, e]]
        db.write()
    }

    const {ChatGPTAPIBrowser, getOpenAIAuth} = await import('chatgpt')
    const api = new ChatGPTAPIBrowser({
        email,
        password,
        debug: false,
        minimize: true,
        markdown: false
    })

    let logged = false,
        session,
        r,
        opt: {
            parentMessageId: string,
            conversationId: string
        }

    const login: IOrder = {
        desc: "登录——登录chatgpt",
        trigger: /^登录$/g,
        auth: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id),
        async action(e) {
            await api.initSession()
            logged = await api.getIsAuthenticated().catch(e => false)
            return e.reply(logged ? "登录成功" : "登录失败", true)
        }
    }

    const closeSession: IOrder = {
        desc: "关闭网页——退出登录+关闭网页",
        trigger: /^关闭网页$/g,
        auth: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id),
        async action(e) {
            await api.closeSession()
            logged = false
            return e.reply("关闭成功", true)
        }
    }

    const resetSession: IOrder = {
        desc: "刷新页面——刷新页面，防止掉线",
        trigger: /^刷新页面$/g,
        auth: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id),
        async action(e) {
            await api.resetSession()
            logged = false
            return e.reply("刷新页面成功", true)
        }
    }

    const refreshSession: IOrder = {
        desc: "重新登录——重新登录",
        trigger: /^重新登录$/g,
        auth: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id),
        async action(e) {
            await api.refreshSession()
            return e.reply("重新登录成功", true)
        }
    }

    const checkSession: IOrder = {
        desc: "查看会话——查看所有已开始的对话",
        trigger: /^查看会话$/g,
        auth: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id),
        action(e) {
            const sessions = getSessions();
            e.reply(Object.keys(sessions).map((v, i) => `${i + 1}. ${v}: ${sessions[v].map(([mid]) => mid).join(",")}`).join("\n"))
        }
    }

    const selectSession: IOrder = {
        desc: "选择会话+会话id+消息id——选择进入制定的对话，例如：选择会话 qwert yuiop",
        trigger: /^选择会话\s+.+\s+.+$/g,
        auth: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id),
        action(e) {
            const [_, s, m] = e.raw_message.trim().split(/\s+/g)
            opt = {
                conversationId: s,
                parentMessageId: m
            }
            return e.reply("更新会话成功")
        }
    }

    const chatWithGpt: IOrder = {
        desc: "@群聊中的机器人或回复机器人对应的话+对话——和chatgpt聊天，@群聊中的机器人+要说的话即可，返回消息暂时为图片，因为过长文本会被标记为风控消息",
        trigger: (e: GroupMessageEvent) => availableGroups.includes(e.group.group_id) && e.atme,
        auth: _ => true,
        async action(e: GroupMessageEvent) {
            if (e.source) {
                const sessions = getSessions()
                const s = e.source
                Object.keys(sessions).find(v => sessions[v].find(([msgId, q]) => {
                    if (s.rand === q.rand && s.time === q.time && s.seq === q.seq) {
                        opt = {
                            conversationId: v,
                            parentMessageId: msgId
                        }
                        return true
                    }
                }))
            }
            if (logged) {
                e.message = e.message.filter(v => v.type !== "at")
                const res = await api.sendMessage(e.message.filter(v => v.type === "text")
                    .map(v => v.type === "text" && v.text).join(" "), opt)
                const msg = res.response.trim();
                opt = {
                    parentMessageId: res.messageId,
                    conversationId: res.conversationId
                }
                console.log(res);
                return e.reply({
                    type: "image",
                    file: await // 使用示例
                        convertTextToImage(msg)
                }, true)
                    .then(ret => addSession(res, ret))
                    .catch(_ => e.reply("发送失败", true))
            } else {
                return e.reply("尚未登陆", true)
            }
        }
    }

    const changeGroup: IOrder = {
        desc: "群聊+群号——加入可使用此机器人的群聊，格式：群聊 1234567",
        trigger: /^群聊\s+\d+$/g,
        auth: _ => true,
        action(e) {
            const g = parseInt(e.raw_message.match(/\d+/g)[0])
            !availableGroups.includes(g) && availableGroups.push(g)
            e.reply("更改成功，现在机器人现在可在群" + g + "中使用", true)
        }
    }

    const resetThread: IOrder = {
        desc: "测试命令",
        trigger: /^重置线程$/g,
        auth: _ => true,
        async action(e) {
            await api.resetThread()
            return e.reply("重置成功", true)
        }
    }

    const test: IOrder = {
        desc: "测试命令",
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

    const help: IOrder = {
        desc: "chatgpt帮助——获取chatgpt插件的帮助",
        trigger: /^chatgpt帮助$/g,
        auth: _ => true,
    }


    const orders = [
        login,
        closeSession,
        checkSession,
        selectSession,
        chatWithGpt,
        resetSession,
        refreshSession,
        changeGroup,
        resetThread,
        test,
        help
    ]

    help.action = async e => e.reply({
        type: "image",
        file: await // 使用示例
            convertTextToImage(orders.map(v => v.desc).join("\n"))
    })

    return {
        onDeactivate() {
            api.closeSession()
        },
        orders
    }
}

export default index
