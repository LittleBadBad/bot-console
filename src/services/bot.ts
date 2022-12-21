import {BOT_EXISTED, BOT_NOT_EXIST} from "../errors";
import {IBotData} from "../types";
import db from "../db";

function getBots() {
    db.read()
    return db.data.bots
}

function getBot(uin: number) {
    db.read()
    const bot = db.data.bots.find(v => v.uin === uin)
    if (!bot) {
        throw BOT_NOT_EXIST
    }
    return bot
}

async function addBot(botInfo: IBotData) {
    db.read()
    if (!db.data.bots.find(v => v.uin === botInfo.uin)) {
        db.data.bots.push(botInfo)
        db.write()
        return botInfo
    } else {
        throw BOT_EXISTED
    }
}

async function removeBot(uin: number) {
    let i = getBots().findIndex(v => v.uin === uin)
    if (i > -1) {
        const bot = db.data.bots.splice(i, 1)[0]
        db.write()
        return bot
    } else {
        throw BOT_NOT_EXIST
    }
}

async function updateBot(botInfo: IBotData) {
    const i = getBots().findIndex(v => v.uin === botInfo.uin)
    if (i > -1) {
        db.data.bots[i] = botInfo
        db.write()
        return botInfo
    } else {
        throw BOT_NOT_EXIST
    }
}

/**
 * 机器人存在数据文件中的关键信息，不包含机器人实例
 */
export {
    getBots,
    getBot,
    addBot,
    removeBot,
    updateBot
}

