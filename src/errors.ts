import {IError, ITip} from "./types";

// 4xx
export const BOT_EXISTED: IError = {message: "机器人已存在", status: 400}
export const PLUGIN_EXISTED: IError = {message: "插件已存在", status: 400}
export const BAD_REQUEST: IError = {message: "参数出错", status: 400}
export const REJECT: IError = {message: "没登陆", status: 401}
export const FORBIDDEN: IError = {message: "没权限", status: 403}
export const BOT_NOT_EXIST: IError = {message: "机器人不存在", status: 404}
export const PLUGIN_NOT_EXIST: IError = {message: "插件不存在", status: 404}
export const METHOD_NOT_ALLOWED: IError = {message: "请求方法不允许", status: 405}

// 5xx
export const INTERNAL_ERROR: IError = {message: "服务器出错", status: 500}

// ws
export const CONNECTED: ITip = {type: "success", message: "已连接服务器"}
export const DISCONNECTED: ITip = {type: "error", message: "已断开服务器"}
export const LOG_ERROR: ITip = {type: "error", message: "登陆失败"}
export const BOT_LOGGED: ITip = {type: "info", message: "机器人已登录"}
export const BOT_LOGGED_OUT: ITip = {type: "info", message: "机器人已登出"}
export const BOT_LOGGED_SUCCESS: ITip = {type: "success", message: "机器人登录成功"}
export const BOT_NOT_EXIST_WS: ITip = {message: "机器人不存在", type: "error"}
export const PLUGIN_NOT_INSTALLED: ITip = {message: "插件未安装", type: "error"}
export const PLUGIN_INSTALLED: ITip = {message: "插件已安装", type: "error"}


