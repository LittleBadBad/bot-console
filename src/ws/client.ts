import {Socket} from "socket.io";
import {IBotData, IConfig, IPlugin, ISocketMessage} from "../types";
import Buffer from "buffer";
import {DefaultEventsMap} from "@socket.io/component-emitter";

export interface IBotInfo extends IBotData {
    plugins: IPlugin[]
    online: boolean
}

/**
 * socket.emit allows you to emit custom events emit the server and client
 *
 * socket.send sends messages which are received with the 'message' event
 *
 */
export interface ClientSocket extends Socket<DefaultEventsMap, DefaultEventsMap> {
    emit(event: string, ...args: any[]): boolean

    /**
     * CRUD
     * @param event
     * @param config
     */
    emit(event: "BOT_CREATE", config: IBotData): boolean

    emit(event: "BOT_READ", uin?: number): boolean

    emit(event: "BOT_UPDATE", config: IBotData): boolean

    emit(event: "BOT_DELETE", uin: number): boolean


    /**
     * 登录事件监听，账密登录、二维码登录、设备登陆
     * 接收 uin:number
     * @param event
     * @param uin
     */
    emit(event: "BOT_LOGIN", uin: number): boolean

    /**
     * 滑动登录事件监听
     * 接收 uin:number
     * @param event
     * @param uin
     * @param ticket
     */
    emit(event: "BOT_LOGIN_SLIDER", uin: number, ticket: string): boolean

    /**
     * 登出事件监听
     * 接收 uin:number
     * @param event
     * @param uin
     */
    emit(event: "BOT_LOGOUT", uin: number): boolean

    /**
     * 插件安装事件监听
     * 接收 uin: number, plugin: string
     * @param event
     * @param uin
     * @param plugin
     * @param config
     */
    emit(event: "PLUGIN_INSTALL", uin: number, plugin: string, config:IConfig): boolean

    /**
     * 插件卸载事件监听
     * @param event
     * @param uin
     * @param plugin
     */
    emit(event: "PLUGIN_UNINSTALL", uin: number, plugin: string): boolean

    /**
     * 插件启动事件监听
     * 接收 uin: number, plugin: string
     * @param event
     * @param uin
     * @param plugin
     */
    emit(event: "PLUGIN_ACTIVATE", uin: number, plugin: string): boolean

    /**
     * 插件关闭事件监听
     * @param event
     * @param uin
     * @param plugin
     */
    emit(event: "PLUGIN_DEACTIVATE", uin: number, plugin: string): boolean

    /**
     * socket.io指定断连事件
     * @param event
     */
    emit(event: "disconnect"): boolean

    /**
     * 客户端获取socket事件接收和发送的权限
     * @param event
     * @param username
     * @param password
     */
    emit(event: "ACCOUNT_LOGIN", username: string, password: string): boolean


    /**
     * 机器人状态
     * 发送 bots: IBotInfo[]
     * @param event
     * @param listener
     */
    on(event: "BOT_STATUS", listener: (bots:IBotInfo[]) => void): boolean

    /**
     * 设备锁验证
     * 发送 uin: number, url: string, phone: string
     * @param event
     * @param listener
     */
    on(event: "BOT_LOGIN_DEVICE", listener: (uin: number, url: string, phone: string) => void): boolean

    /**
     * 登录出错
     * 发送 uin: number, code: number, message: string
     * @param event
     * @param listener
     */
    on(event: "BOT_LOGIN_ERROR", listener: (uin: number, code: number, message: string) => void): boolean

    /**
     * 二维码登录
     * 发送 image: Buffer
     * @param event
     * @param listener
     */
    on(event: "BOT_LOGIN_QRCODE", listener: (image: Buffer) => void)

    /**
     * 滑动解锁
     * 发送 url: string
     * @param event
     * @param listener
     */
    on(event: "BOT_LOGIN_SLIDER", listener: (url: string) => void)

    /**
     * 离线响应
     * 发送 message: string
     * @param event
     * @param listener
     */
    on(event: "BOT_OFFLINE", listener: (message: string) => void)

    /**
     * 踢下线响应
     * 发送 message: string
     * @param event
     * @param listener
     */
    on(event: "BOT_OFFLINE_KICKOFF", listener: (message: string) => void)

    /**
     * 上线响应
     * 发送 message: string
     * @param event
     * @param listener
     */
    on(event: "BOT_ONLINE", listener: () => void)

    on(event: "message", listener: (m: ISocketMessage) => void)
}

