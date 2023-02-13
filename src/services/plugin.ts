import {PLUGIN_EXISTED, PLUGIN_NOT_EXIST} from "../errors";
import {IPluginData} from "../types";
import db from "../db";
import * as fs from "fs";
import path from "path";


/**
 * 根据插件数据获取插件模组引入路径
 * @param p
 */
export const pluginPath = (p: IPluginData) => {
    const CUSTOM_PLUGIN_PATH = process.env.CUSTOM_PLUGIN_PATH || "D:\\workspace\\IdeaProjects\\zcy\\bot-console\\plugins"
    const SYSTEM_PLUGIN_PATH = process.env.SYSTEM_PLUGIN_PATH || "D:\\workspace\\IdeaProjects\\zcy\\bot-console\\src\\plugins"
    return path.join(p.custom ? CUSTOM_PLUGIN_PATH : SYSTEM_PLUGIN_PATH, p.path)
}

/**
 * 通过网页管理端开发的插件路径名，目前仅支持js语法的插件自定义开发
 * @param p
 */
function customPluginPath(p: string) {
    return p + ".js"
}

function loadCode(p: IPluginData) {
    try {
        return fs.readFileSync(pluginPath(p)).toString()
    } catch (e) {
        return ""
    }
}

function getPlugins() {
    db.read()
    return db.data.plugins.map(v => ({...v, code: loadCode(v)}))
}

function getPlugin(name: string) {
    db.read()
    const plugin = db.data.plugins.find(v => v.name === name)
    if (!plugin) {
        throw PLUGIN_NOT_EXIST
    }
    plugin.code = loadCode(plugin)
    return plugin
}

/**
 * 通过网页添加的插件，路径一律走pluginPath
 * @see customPluginPath
 * @param pluginInfo
 */
function addPlugin(pluginInfo: IPluginData) {
    const p = getPlugins().find(v => v.name === pluginInfo.name)
    if (!p) {
        db.data.plugins.push({...pluginInfo, path: customPluginPath(pluginInfo.name)})
        fs.writeFileSync(customPluginPath(pluginInfo.name), pluginInfo.code)
        db.write()
        return pluginInfo
    } else {
        throw PLUGIN_EXISTED
    }
}

async function removePlugin(name: string) {
    let i = getPlugins().findIndex(v => v.name === name)
    if (i > -1) {
        const plugin = db.data.plugins.splice(i, 1)[0]
        db.write()
        return plugin
    } else {
        throw PLUGIN_NOT_EXIST
    }
}

/**
 * path不变
 * @param pluginInfo
 */
async function updatePlugin(pluginInfo: IPluginData) {
    const i = getPlugins().findIndex(v => v.name === pluginInfo.name)
    if (i > -1) {
        const path = db.data.plugins[i].path
        db.data.plugins[i] = {...pluginInfo, path}
        fs.writeFileSync(path, pluginInfo.code)
        db.write()
        return pluginInfo
    } else {
        throw PLUGIN_NOT_EXIST
    }
}

export {
    customPluginPath,
    getPlugins,
    getPlugin,
    addPlugin,
    removePlugin,
    updatePlugin
}

