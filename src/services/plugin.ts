import {PLUGIN_EXISTED, PLUGIN_NOT_EXIST} from "../errors";
import {IPluginData} from "../types";
import db from "../db";
import * as fs from "fs";
import path from "path";
import {isDirectory, isFile} from "../kit/utils";

const CUSTOM_PLUGIN_PATH = process.env.CUSTOM_PLUGIN_PATH || "D:\\workspace\\IdeaProjects\\zcy\\bot-console\\plugins"
const SYSTEM_PLUGIN_PATH = process.env.SYSTEM_PLUGIN_PATH || "D:\\workspace\\IdeaProjects\\zcy\\bot-console\\src\\plugins"

/**
 * 根据插件数据获取插件模组引入路径
 * @param p
 */
export const pluginPath = (p: IPluginData): [string, string, string] => {
    const modulePath = path.join(p.custom ? CUSTOM_PLUGIN_PATH : SYSTEM_PLUGIN_PATH, p.path)
    return [
        modulePath + ".ts",
        modulePath + ".js",
        modulePath
    ]
}

/**
 * 通过网页管理端开发的插件路径名，目前仅支持js语法的插件自定义开发
 * @param p
 */
function customPluginPath(p: string) {
    return path.join(CUSTOM_PLUGIN_PATH, p + ".js")
}

function loadCode(p: IPluginData) {
    for (const modulePath of pluginPath(p)) {
        try {
            return fs.readFileSync(modulePath).toString()
        } catch (e) {

        }
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
        db.data.plugins.push({...pluginInfo, custom: true, path: customPluginPath(pluginInfo.name)})
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
        const path = pluginPath(db.data.plugins[i])
        db.data.plugins[i] = {...db.data.plugins[i], ...pluginInfo}
        for (const modulePath of path) {
            if (isFile(modulePath)) {
                fs.writeFileSync(modulePath, pluginInfo.code)
                break;
            } else if (isDirectory(modulePath)) {
                // todo rewrite files
            }
        }
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

