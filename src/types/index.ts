import {StatusCodes} from "http-status-codes";
import {Config} from "oicq/lib/client";
import {Client, DiscussMessageEvent, GroupMessageEvent, PrivateMessageEvent} from "oicq";
import {LowSync} from "../vendor/lowdb";
import {chain, ExpChain} from "lodash";

export type IError = {
    status: StatusCodes,
    message: string
}

export type ITip = {
    type: "warn" | "error" | "info" | "success"
    message: string
}

export type IReturn<T> = [
    data?: T,
    error?: IError
]

/**
 * 数据文件中存储的机器人关键数据
 */
export type IBotData = {
    uin: number
    password?: string
    config: Config
    managers: number[]
    plugins: (IPluginData & { managers?: number[] })[]
}

export interface IOICQBot extends IBotData {
    client: Client
    online?: boolean
    plugins: IPlugin[]
}

/**
 * 数据文件中存储的插件关键数据
 *
 * todo 设置插件数据的键值，使db中为空时可以扫描目录获取全部，同时db不为空时可合并两组插件数据，并决定code和path的优先级
 */
export type IPluginData = {
    /**
     * 唯一值，一个机器人中只允许安装一次
     */
    name: string

    /**
     * 脚本路径
     */
    path?: string

    /**
     * todo load 'code' when load 'file' failed
     * 'code' can accept:
     * - 'module.export=function(){}'
     * - 'export default function(){}'
     * - 'function(){}'
     * - 'function foo(){}'
     * - '{keys:"blabla",action:e=>blabla}'
     * - ...etc
     */
    code?: string
}

export interface IOrder {
    /**
     * 触发关键词/关键词列表/正则表达式/其他函数处理
     *
     * 注：触发指关键语句中包含该词，完全匹配请使用正则或函数手动处理
     *
     * 插件安全使用的原则，默认不触发
     *
     * 若需要默认全部触发，可设置为 "" 或 _=>true
     */
    trigger?: string | string[] | RegExp | ((e: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent) => boolean)

    /**
     * 有权限的成员选择
     *
     * 成员uin/有权限成员列表/返回成员列表的函数(消息对象)
     *
     * 插件小规模自用的原则，默认机器人管理员
     *
     * 若需要默认全部触发，可设置为 _=>true
     */
    auth?: number | number[] | ((e: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent) => boolean)

    /**
     * 处理命令
     * @param e 消息对象，client在插件安装时已传入，不重复传入
     */
    action?(e: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent)
}

export interface IPluginDetail {
    /**
     * 插件是否启动
     */
    activated?: boolean

    /**
     * 插件是否损坏
     */
    broken?: boolean

    /**
     * 命令集合
     */
    orders: IOrder[]

    /**
     * 插件管理员
     */
    managers?: number[]

    /**
     * 启动时的操作
     * @param bot
     */
    onActivate?(bot: IOICQBot): void

    /**
     * 关闭时操作
     * @param bot
     */
    onDeactivate?(bot: IOICQBot): void
}

export type IPlugin = IPluginData & IPluginDetail

export class LowWithLodash<T> extends LowSync<T> {
    chain: ExpChain<this['data']> = chain(this).get('data')
}

/**
 * creat plugin
 * @param bot oicq对象
 * @param managers 安装时设置的本插件管理员
 * @param db 安装时设置的lowdb对象，插件数据的路径为 __dirname/pluginData/[uin]/[plugin_name]
 * @return IPluginDetail 插件详细内容
 */
export type CP<D = any> = (bot: IOICQBot, managers: number[], db: LowWithLodash<D>) => IPluginDetail
