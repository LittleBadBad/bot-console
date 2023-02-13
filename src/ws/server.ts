import {BroadcastOperator, Server, Socket} from "socket.io";
import Buffer from "buffer";
import {BOT_LOGGED, BOT_LOGGED_OUT, CONNECTED, DISCONNECTED} from "../errors";
import login from "./login";
import {IBotData, IConfig, IJWTPayload, IPluginData, IPluginInfo, ISocketMessage} from "../types";
import {botServices, oicqServices} from "../services";
import db from "../db";
import _ from "lodash";
import {DefaultEventsMap} from "@socket.io/component-emitter";

import jwt from "jsonwebtoken";

export const wsServer = new Server()


const ONLINE = "ONLINE"

const onError = (socket: Socket) => ({message, type}) => {
    console.error(message)
    socket.send({message, type: type || "error"})
}

export function socketListener(errHandle?) {
    return function <T extends (...args: any[]) => any>(func: T): T {
        return <T>async function (...args) {
            try {
                await func(...args)
            } catch (err) {
                errHandle && typeof errHandle === "function" ?
                    errHandle(err) : wsServer.send(err)
            }
        }
    }
}

/**
 * socket.emit allows you to emit custom events on the server and client
 *
 * socket.send sends messages which are received with the 'message' event
 *
 */
export interface BotSocket extends Socket {
    send(data: ISocketMessage)

    /**
     * CRUD
     * @param event
     * @param listener
     */
    on(event: "BOT_CREATE", listener: (config: IBotData) => void): this

    on(event: "BOT_READ", listener: (uin?: number) => void): this

    on(event: "BOT_UPDATE", listener: (config: IBotData) => void): this

    on(event: "BOT_DELETE", listener: (uin: number) => void): this


    /**
     * 登录事件监听，账密登录、二维码登录、设备登陆
     * 接收 uin:number
     * @param event
     * @param listener
     */
    on(event: "BOT_LOGIN", listener: (uin: number) => void): this

    /**
     * 滑动登录事件监听
     * 接收 uin:number
     * @param event
     * @param listener
     */
    on(event: "BOT_LOGIN_SLIDER", listener: (uin: number, ticket: string) => void): this

    /**
     * 登出事件监听
     * 接收 uin:number
     * @param event
     * @param listener
     */
    on(event: "BOT_LOGOUT", listener: (uin: number) => void): this

    /**
     * 插件安装事件监听
     * 接收 uin: number, plugin: string
     * @param event
     * @param listener
     */
    on(event: "PLUGIN_INSTALL", listener: (uin: number, plugin: string, config: IConfig<any>) => void): this

    /**
     * 插件卸载事件监听
     * @param event
     * @param listener
     */
    on(event: "PLUGIN_UNINSTALL", listener: (uin: number, plugin: string) => void): this

    /**
     * 插件启动事件监听
     * 接收 uin: number, plugin: string
     * @param event
     * @param listener
     */
    on(event: "PLUGIN_ACTIVATE", listener: (uin: number, plugin: string) => void): this

    /**
     * 插件关闭事件监听
     * @param event
     * @param listener
     */
    on(event: "PLUGIN_DEACTIVATE", listener: (uin: number, plugin: string) => void): this

    /**
     * socket.io指定断连事件
     * @param event
     * @param listener
     */
    on(event: "disconnect", listener: () => void): this

    /**
     * 客户端获取socket事件接收和发送的权限
     * @param event
     * @param listener
     */
    on(event: "ACCOUNT_LOGIN", listener: (username: string, password: string) => void): this
}

export interface RoomBroadcaster extends BroadcastOperator<DefaultEventsMap, any> {

    /**
     * 机器人状态
     * 发送 bots: IBotInfo[]
     * @param event
     * @param bots
     */
    emit(event: "BOT_STATUS", bots: (IBotData & { plugins: Omit<IPluginData & IPluginInfo, "code">[] })[]): boolean

    /**
     * 设备锁验证
     * 发送 uin: number, url: string, phone: string
     * @param event
     * @param uin
     * @param url
     * @param phone
     */
    emit(event: "BOT_LOGIN_DEVICE", uin: number, url: string, phone: string): boolean

    /**
     * 登录出错
     * 发送 uin: number, code: number, message: string
     * @param event
     * @param uin
     * @param code
     * @param message
     */
    emit(event: "BOT_LOGIN_ERROR", uin: number, code: number, message: string): boolean

    /**
     * 二维码登录
     * 发送 image: Buffer
     * @param event
     * @param image
     */
    emit(event: "BOT_LOGIN_QRCODE", image: Buffer)

    /**
     * 滑动解锁
     * 发送 url: string
     * @param event
     * @param url
     */
    emit(event: "BOT_LOGIN_SLIDER", url: string)

    /**
     * 离线响应
     * 发送 message: string
     * @param event
     * @param message
     */
    emit(event: "BOT_OFFLINE", message: string)

    /**
     * 踢下线响应
     * 发送 message: string
     * @param event
     * @param message
     */
    emit(event: "BOT_OFFLINE_KICKOFF", message: string)

    /**
     * 上线响应
     * 发送 message: string
     * @param event
     */
    emit(event: "BOT_ONLINE")

    /**
     * 指定房间
     * @param room
     */
    to(room): this
}

/**
 * 定时获取当前机器人状态
 * 可接收登录机器人消息
 * 可接收登出机器人消息
 * 可接收
 * @param socket
 * @param listener
 */
function initSocket(socket: BotSocket, listener: <T extends (...args: any[]) => any>(func: T) => T) {

    socket.on("BOT_CREATE", listener(async (config: IBotData) => {
        await botServices.addBot(config)
        await oicqServices.addOicqBot(config)
        socket.send({message: "添加成功"})
    }))

    socket.on("BOT_READ", listener(async uin => {
        if (uin) socket.emit("BOT_READ", botServices.getBot(parseInt(String(uin))))
        else socket.emit("BOT_READ_BULK", botServices.getBots())
    }))

    socket.on("BOT_UPDATE", listener(async config => {
        await botServices.updateBot(config)
        await oicqServices.updateOicqBot(config)
        socket.send({message: "更新成功"})
    }))
    socket.on("BOT_DELETE", listener(async uin => {
        await botServices.removeBot(uin)
        await oicqServices.removeOicqBot(uin)
        socket.send({message: "删除成功"})
    }))

    socket.on("BOT_LOGIN", listener(async (uin: number) => {
        const bot = oicqServices.getOicqBot(uin)
        if (!bot.online) {
            await oicqServices.loginBot(uin)
        } else {
            throw BOT_LOGGED
        }
    }))

    socket.on("BOT_LOGOUT", listener(async uin => {
        const bot = oicqServices.getOicqBot(uin)
        if (bot.online) {
            await oicqServices.logoutBot(uin)
            socket.send({message: "登出成功"})
        } else {
            throw BOT_LOGGED_OUT
        }
    }))

    socket.on("BOT_LOGIN_SLIDER", listener(async (uin, ticket) => {
        const bot = oicqServices.getOicqBot(uin)
        if (!bot.online) {
            await oicqServices.loginBotSlider(uin, ticket)
        } else {
            throw BOT_LOGGED
        }
    }))
    socket.on("PLUGIN_INSTALL", listener(async (uin, name, config) => {
        // await oicqServices.installPlugin(uin, name, managers)
        const bot = botServices.getBot(uin)
        const {id} = await oicqServices.installPlugin(uin, name, config)//pluginServices.getPlugin(name)
        await botServices.updateBot({
            ...bot,
            plugins: [
                ...bot.plugins || [], {
                    id,
                    name,
                    config
                }]
        })
        socket.send({message: "安装成功"})
    }))

    socket.on("PLUGIN_UNINSTALL", listener(async (uin, name) => {
        await oicqServices.uninstallPlugin(uin, name)
        const bot = botServices.getBot(uin)
        const i = bot.plugins.findIndex(v => v.name === name)
        bot.plugins.splice(i, 1)
        await botServices.updateBot({...bot, plugins: [...bot.plugins]})
        socket.send({message: "卸载成功"})
    }))
    socket.on("PLUGIN_ACTIVATE", listener(async (uin, plugin) => {
        await oicqServices.activatePlugin(uin, plugin)
        socket.send({message: "启动成功"})
    }))

    socket.on("PLUGIN_DEACTIVATE", listener(async (uin, plugin) => {
        await oicqServices.deactivatePlugin(uin, plugin)
        socket.send({message: "关闭成功"})
    }))

}

/**
 * @deprecated
 */
async function syncData() {
    db.read()
    const bots = oicqServices.getOicqBots();
    for (let bot of db.data.bots) {
        const b = bots.find(v => v.uin === bot.uin)
        if (!b) {
            try {
                await oicqServices.addOicqBot(bot)
            } catch (e) {
                console.error(e)
            }
        } else if (_.isEqual(
            _.pick(bot, ["password", "plugins", "config"]),
            b)) {
            await oicqServices.updateOicqBot(bot)
        }
    }
    for (const {uin} of bots) {
        if (!db.data.bots.find(v => v.uin === uin)) {
            try {
                await oicqServices.removeOicqBot(uin)
            } catch (e) {
                console.error(e)
            }
        }
    }
}

export function initWSServer() {
    setInterval(async () => {
        const bots = oicqServices.getOicqBots();
        // await syncData();
        (wsServer as unknown as RoomBroadcaster).to(ONLINE)
            .emit("BOT_STATUS",
                bots.map(({
                              uin,
                              managers,
                              plugins,
                              config,
                              online
                          }) =>// todo 优化plugin数据的传输
                    ({
                        uin, managers,
                        plugins: plugins.map(({
                                                  name,
                                                  path,
                                                  id,
                                                  activated,
                                                  broken,
                                                  config
                                              }) => ({
                            name,
                            path,
                            id,
                            activated,
                            broken,
                            config
                        })),
                        config, online
                    })))
    }, 1000)

    wsServer.on("connection", (socket: BotSocket) => {
        socket.send({message: "已连接"})
        const listener = socketListener(onError(socket))
        socket.on("ACCOUNT_LOGIN", listener(async (username: string, password: string) => {
            await login(username, password)
            const secret = process.env.JWT_SECERET_KEY || "secret"
            const payload: IJWTPayload = {user: username}
            const token = jwt.sign(payload, secret, {expiresIn: "10h"})
            socket.send({...CONNECTED, data: token})
            if (!socket.rooms.has(ONLINE)) {
                socket.join(ONLINE);
                initSocket(socket, listener)
            }
        }))
        socket.on("disconnect", listener(() => {
            socket.send(DISCONNECTED)
            socket.leave(ONLINE)
            socket.removeAllListeners()
        }))
    });
}
