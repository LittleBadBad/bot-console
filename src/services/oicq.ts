import {createClient} from "../vendor/oicq";
import {CP, IBotData, IConfig, IOICQBot, IPlugin, IPluginData, IPluginDetail, LowWithLodash} from "../types";
import {BOT_EXISTED, BOT_NOT_EXIST, PLUGIN_INSTALLED, PLUGIN_NOT_INSTALLED} from "../errors";
import {ONLINE, RoomBroadcaster, wsServer} from "../ws";
import {pluginServices} from ".";
import {JSONFileSync} from "../vendor/lowdb/adapters/JSONFileSync";
import path from "path";
import fs from "fs";
import {uuid} from "../vendor/oicq/lib/common";
import {pluginPath} from "./plugin";
import puppeteer from "puppeteer";

const DATA_DIR_ROOT = process.env.DATA_DIR_ROOT || "D:\\workspace\\IdeaProjects\\zcy\\bot-console\\pluginData"

export const oicqBots: IOICQBot[] = []


const pluginBroken = {
    broken: true,
    activated: false,
    orders: []
}

export function reRequire(module) {
    delete require.cache?.[require.resolve(module)]
    return require(module)
}

export async function resolveModule(p: IPluginData): Promise<CP> {
    const [_js, _ts, modulePath] = pluginPath(p)
    try {
        const m = reRequire(`${modulePath}`)// 此处已删除缓存
        return m.default || m
    } catch (e) {
        try {
            return await import(`${modulePath}`).then(r => r.default) // todo ？import 多次多个路径只返回最后一次import的
        } catch (e) {
            return _ => ({
                ...p,
                path,
                ...pluginBroken
            })
        }
    }
}

function getOicqBots() {
    return oicqBots
}

function getOicqBot(uin: number) {
    const bot = getOicqBots().find(v => v.uin === uin)
    if (!bot)
        throw BOT_NOT_EXIST
    return bot
}

/**
 * 若不存在，添加新的机器人
 * 若存在，抛出错误
 * 状态：下线
 * 插件：空
 * @param botInfo
 */
async function addOicqBot(botInfo: IBotData) {
    const bot = getOicqBots().find(v => v.uin === botInfo.uin)
    if (!bot) {
        const client = createClient(botInfo.uin, botInfo.config)
        const bot: IOICQBot = {
            ...botInfo,
            plugins: [],// todo support add plugin(in addition add managers when add a plugin) when add a bot
            online: false,
            client
        }
        bot.plugins = await Promise.all(botInfo.plugins?.map(v => loadPlugin(pluginServices.getPlugin(v.name), bot, v.config)) || [])
        getOicqBots().push(bot)
        attachSocket(botInfo.uin, (wsServer as unknown as RoomBroadcaster).to(ONLINE))
        console.info(bot.uin, "已加载")
        return bot
    } else {
        throw BOT_EXISTED
    }
}

/**
 * 下线+删除
 * @param uin
 */
async function removeOicqBot(uin: number) {
    let i = getOicqBots().findIndex(v => v.uin === uin)
    if (i > -1) {
        await logoutBot(uin)
        getOicqBots().splice(i, 1)
        return i
    } else {
        throw BOT_NOT_EXIST
    }
}

/**
 * 若存在，修改信息
 * 若不存在，抛出错误
 * @param botInfo
 */
async function updateOicqBot(botInfo: IBotData) {
    const oicqBot = getOicqBot(botInfo.uin)
    const i = getOicqBots().findIndex(v => v.uin === botInfo.uin)
    if (i === -1) throw BOT_NOT_EXIST
    getOicqBots()[i] = {
        ...oicqBot,
        ...botInfo,// todo 此处理论上应先关闭并卸载全部旧插件再重装新插件
        plugins: oicqBot.plugins
    }
}

async function ticketLogin(ticketUrl) {

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: "D:\\workspace\\IdeaProjects\\zcy\\bot-console\\chrome-win\\chrome.exe",
        args:  [ '--disable-gpu', '--disable-setuid-sandbox', '--no-sandbox', '--no-zygote' ] ,
        timeout: 3000
    });

    const page = await browser.newPage();
    await page.goto(ticketUrl);
    await page.setViewport({width: 1080, height: 1024});
    page.on('response', async response => {
        const url = response.url();
        const headers = response.headers();
        const contentType = headers['content-type'];
        if (contentType && contentType.startsWith('text/html')) {
            const body = await response.text();
            console.log(`Received HTML from ${url}: ${body}`);
            // 在这里处理 body 数据
        }

    });


    // 在这里关闭浏览器
    // 在处理完数据后再关闭浏览器
    await browser.close();
}

function attachSocket(uin: number, roomBroadcaster: RoomBroadcaster) {
    const bot = getOicqBot(uin)
    const {client} = bot

    client.on("system.login.device", ({url, phone}) => {
        roomBroadcaster.emit("BOT_LOGIN_DEVICE", uin, url, phone)
    }).on("system.login.error", ({code, message}) => {
        roomBroadcaster.emit("BOT_LOGIN_ERROR", uin, code, message)
    }).on("system.login.qrcode", ({image}) => {
        roomBroadcaster.emit("BOT_LOGIN_QRCODE", image)
    }).on("system.login.slider", ({url}) => {
        // ticketLogin(url)
        roomBroadcaster.emit("BOT_LOGIN_SLIDER", url)
    }).on("system.offline", ({message}) => {
        logoutBot(uin)
        roomBroadcaster.emit("BOT_OFFLINE", message)
    }).on("system.offline.kickoff", ({message}) => {
        logoutBot(uin)
        roomBroadcaster.emit("BOT_OFFLINE_KICKOFF", message)
    }).on("system.offline.network", event => {
        // todo 在此发出下线警报或立即重启系统重新登录
        console.warn(`warning, ${uin} 即将掉线`)
    }).on("system.online", event => {
        bot.online = true
        roomBroadcaster.emit("BOT_ONLINE")
    }).on("message", event => {
        const {plugins} = bot
        const raw_message = event.raw_message.trim()
        for (const plugin of plugins.filter(v => v.activated)) {
            for (const order of plugin.orders || []) {
                const {trigger, auth} = order
                if (
                    (
                        trigger &&
                        ((typeof trigger === "string" && raw_message.includes(trigger)) ||
                            (Array.isArray(trigger) && trigger.find(v => raw_message.includes(v))) ||
                            (trigger instanceof RegExp && trigger.test(raw_message)) ||
                            (typeof trigger === "function" && trigger(event, bot)))
                    ) && (
                        (typeof auth === "number" && auth === event.user_id) ||
                        (Array.isArray(auth) && auth.includes?.(event.user_id)) ||
                        (typeof auth === "function" && auth(event, bot)) ||
                        (!auth && bot.managers.includes(event.user_id))
                    )
                ) {
                    try {
                        order.action?.(event, bot)
                    } catch (e) {
                        console.error(bot.uin, event, " Error ", e)
                    }
                }
            }
        }
    })
}

async function loginBot(uin: number) {
    const oicqBot = getOicqBot(uin)
    if (!oicqBot.online)
        await oicqBot.client.login(oicqBot.password || undefined)
}

async function loginBotSlider(uin: number, ticket: string) {
    const oicqBot = getOicqBot(uin)
    if (!oicqBot.online)
        oicqBot.client.submitSlider(String(ticket).trim())
}

/**
 * 下线不删除
 * @param uin
 */
async function logoutBot(uin: number) {
    const oicqBot = getOicqBot(uin)
    if (oicqBot.online) {
        await oicqBot.client.logout()
        oicqBot.online = false
    }
}

async function loadPlugin(plugin: IPluginData, bot: IOICQBot, config: IConfig = {managers: []}): Promise<IPlugin> {
    config.managers ||= []
    const dbPath = path.join(DATA_DIR_ROOT, bot.uin.toString())
    if (!fs.existsSync(dbPath))
        await fs.promises.mkdir(dbPath, {recursive: true})
    const db = new LowWithLodash(new JSONFileSync(path.join(dbPath, plugin.name + ".json")))
    const pluginModule = await resolveModule(plugin) as CP | IPluginDetail
    const p = (typeof pluginModule === "function" && pluginModule(bot, config, db)) || false
    const pluginDetail = ((p instanceof Promise && await p) || p ||
        (typeof pluginModule === "object" && pluginModule) ||
        pluginBroken) as IPluginDetail
    console.info(bot.uin, plugin.name, "已加载")
    return {
        ...pluginDetail,
        ...plugin,
        config,
        id: uuid()
    }
}

async function installPlugin(uin: number, name: string, config: IConfig): Promise<IPlugin> {
    const oicqBot = getOicqBot(uin)
    const plugin = oicqBot.plugins.find(v => v.name === name)
    if (plugin) throw PLUGIN_INSTALLED
    const p = await loadPlugin(await pluginServices.getPlugin(name), oicqBot, config)
    oicqBot.plugins.push(p)
    return p
}

/**
 * deactivate + 删除
 * @param uin
 * @param name
 */
async function uninstallPlugin(uin: number, name: string) {
    const oicqBot = getOicqBot(uin)
    const i = oicqBot.plugins.findIndex(v => v.name === name)
    if (i === -1) throw  PLUGIN_NOT_INSTALLED
    deactivatePlugin(uin, name)
    oicqBot.plugins.splice(i, 1)
}

function activatePlugin(uin: number, name: string) {
    const oicqBot = getOicqBot(uin)
    const plugin = oicqBot.plugins.find(v => v.name === name)
    if (!plugin) throw PLUGIN_NOT_INSTALLED
    if (!plugin.activated) {
        plugin.activated = true
        plugin.onActivate?.(oicqBot)
    }
    console.info(uin, name, "已启动")
}

function deactivatePlugin(uin: number, name: string) {
    const oicqBot = getOicqBot(uin)
    const plugin = oicqBot.plugins.find(v => v.name === name)
    if (!plugin) throw PLUGIN_NOT_INSTALLED
    if (plugin.activated) {
        plugin.activated = false
        plugin.onDeactivate?.(oicqBot)
    }
    console.info(uin, name, "已关闭")
}

export {
    addOicqBot,
    removeOicqBot,
    getOicqBots,
    getOicqBot,
    updateOicqBot,
    attachSocket,
    loginBot,
    loginBotSlider,
    installPlugin,
    uninstallPlugin,
    activatePlugin,
    deactivatePlugin,
    logoutBot
}


// const client = createClient(123456)
