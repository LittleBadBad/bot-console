import {createClient} from "oicq";
import {Socket} from "socket.io";
import {CP, IBotData, IOICQBot, IPlugin, IPluginData, LowWithLodash} from "../types";
import {BOT_EXISTED, BOT_NOT_EXIST, PLUGIN_INSTALLED, PLUGIN_NOT_INSTALLED} from "../errors";
import {RoomBroadcaster, wsServer} from "../ws";
import {pluginServices} from ".";
import {JSONFileSync} from "../vendor/lowdb/adapters/JSONFileSync";
import {IDb} from "../db";
import path from "path";
import fs from "fs";

const DATA_DIR_ROOT = "D:\\workspace\\IdeaProjects\\zcy\\bot-console\\pluginData"

export const oicqBots: IOICQBot[] = []

export function reRequire(module) {
    delete require.cache?.[require.resolve(module)]
    return require(module)
}

/**
 * @deprecated
 * @param module
 */
export async function reImport(module) {
    const oldKeys = new Set(Object.keys(require.cache));
    await import(module)
    const newKeys = Object.keys(require.cache);
    const filesToWatch = newKeys.filter(x => !oldKeys.has(x));
    for (const file of filesToWatch) {
        delete require.cache[file];
    }
    return await import(module)
}

export async function resolveModule({path, ...args}: IPluginData): Promise<CP> {
    try {
        const m = reRequire(path)// 此处已删除缓存
        if (typeof m === "function") return m
        if (typeof m !== "function" && typeof m.default === "function")
            return m.default
        throw 1
    } catch (e) {
        // try {
        //     return import(path).then(r=>r.default) // todo ？import 多次多个路径只返回最后一次import的
        // } catch (e) {
        return _ => ({
            ...args,
            path,
            broken: true,
            activated: false,
            managers: [],
            orders: []
        })
        // }
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
        bot.plugins = await Promise.all(botInfo.plugins?.map(v => loadPlugin(v, bot)) || [])
        getOicqBots().push(bot)
        attachSocket(botInfo.uin, wsServer as unknown as RoomBroadcaster)
        console.log(bot.uin, "已加载")
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
 * 若存在，机器人下线，插件重装，修改信息
 * 若不存在，抛出错误
 * @param botInfo
 */
async function updateOicqBot(botInfo: IBotData) {
    const oicqBot = getOicqBot(botInfo.uin)
    await logoutBot(botInfo.uin)
    const i = getOicqBots().findIndex(v => v.uin === botInfo.uin)
    getOicqBots()[i] = {
        ...oicqBot,
        ...botInfo,
        plugins: await Promise.all(oicqBot.plugins.map(v => loadPlugin(v, oicqBot)))
    }
}

function attachSocket(uin: number, roomBroadcaster: RoomBroadcaster, socket?: Socket) {
    const bot = getOicqBot(uin)
    const {client} = bot
    // login
    client.on("system.login.device", ({url, phone}) => {
        roomBroadcaster.emit("BOT_LOGIN_DEVICE", uin, url, phone)
    }).on("system.login.error", ({code, message}) => {
        roomBroadcaster.emit("BOT_LOGIN_ERROR", uin, code, message)
    }).on("system.login.qrcode", ({image}) => {
        roomBroadcaster.emit("BOT_LOGIN_QRCODE", image)
    }).on("system.login.slider", ({url}) => {
        roomBroadcaster.emit("BOT_LOGIN_SLIDER", url)
    }).on("system.offline", ({message}) => {
        logoutBot(uin)
        roomBroadcaster.emit("BOT_OFFLINE", message)
    }).on("system.offline.kickoff", ({message}) => {
        logoutBot(uin)
        roomBroadcaster.emit("BOT_OFFLINE_KICKOFF", message)
    }).on("system.online", event => {
        bot.online = true
        roomBroadcaster.emit("BOT_ONLINE")
    }).on("message", event => {
        const {plugins} = bot
        for (const plugin of plugins.filter(v => v.activated)) {
            for (const order of plugin.orders) {
                const {trigger, auth} = order
                if (
                    (
                        trigger &&
                        ((typeof trigger === "string" && event.raw_message.includes(trigger)) ||
                            (Array.isArray(trigger) && trigger.find(v => event.raw_message.includes(v))) ||
                            (trigger instanceof RegExp && trigger.test(event.raw_message)) ||
                            (typeof trigger === "function" && trigger(event)))
                    ) && (
                        (typeof auth === "number" && auth === event.user_id) ||
                        (Array.isArray(auth) && auth.includes?.(event.user_id)) ||
                        (typeof auth === "function" && auth(event)) ||
                        (!auth && bot.managers.includes(event.user_id))
                    )
                ) {
                    order.action?.(event)
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

async function loadPlugin(plugin: IPluginData, bot: IOICQBot, managers: number[] = []): Promise<IPlugin> {
    const dbPath = path.join(DATA_DIR_ROOT, bot.uin.toString())
    if (!fs.existsSync(dbPath))
        await fs.promises.mkdir(dbPath, {recursive: true})
    /**
     * todo todo todo
     */
    const db = new LowWithLodash<IDb>(new JSONFileSync<IDb>(path.join(dbPath, plugin.name + ".json")))
    const pluginDetail = (await resolveModule(plugin))(bot, managers, db)
    return {
        ...pluginDetail,
        ...plugin
    }
}

async function installPlugin(uin: number, name: string, managers: number[]) {
    const oicqBot = getOicqBot(uin)
    const plugin = oicqBot.plugins.find(v => v.name === name)
    if (plugin) throw PLUGIN_INSTALLED
    oicqBot.plugins.push(await loadPlugin(await pluginServices.getPlugin(name), oicqBot, managers))
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
}

function deactivatePlugin(uin: number, name: string) {
    const oicqBot = getOicqBot(uin)
    const plugin = oicqBot.plugins.find(v => v.name === name)
    if (!plugin) throw PLUGIN_NOT_INSTALLED
    if (plugin.activated) {
        plugin.activated = false
        plugin.onDeactivate?.(oicqBot)
    }
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
