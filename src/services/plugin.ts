import {PLUGIN_EXISTED, PLUGIN_NOT_EXIST} from "../errors";
import {IPluginData} from "../types";
import db from "../db";
import * as fs from "fs";
import path from "path";

const PLUGIN_PATH = "D:\\workspace\\IdeaProjects\\zcy\\bot-console\\plugins"

function pluginPath(p: string, dir = PLUGIN_PATH) {
    return path.join(dir, p + ".js")
}

function loadCode(path) {
    try {
        return fs.readFileSync(path).toString()
    } catch (e) {
        return ""
    }
}

function getPlugins() {
    db.read()
    return db.data.plugins.map(v => ({...v, code: loadCode(v.path)}))
}

function getPlugin(name: string) {
    db.read()
    const plugin = db.data.plugins.find(v => v.name === name)
    if (!plugin) {
        throw PLUGIN_NOT_EXIST
    }
    plugin.code = loadCode(plugin.path)
    return plugin
}

/**
 * 通过网页添加的插件，路径一律走pluginPath
 * @see pluginPath
 * @param pluginInfo
 */
function addPlugin(pluginInfo: IPluginData) {
    const p = getPlugins().find(v => v.name === pluginInfo.name)
    if (!p) {
        db.data.plugins.push({...pluginInfo, path: pluginPath(pluginInfo.name)})
        fs.writeFileSync(pluginPath(pluginInfo.name), pluginInfo.code)
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

function findPlugins(){

}

export {
    pluginPath,
    getPlugins,
    getPlugin,
    addPlugin,
    removePlugin,
    updatePlugin
}

