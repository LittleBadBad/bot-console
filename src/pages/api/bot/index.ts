import {NextApiRequest, NextApiResponse} from "next";
import {checkAuth, router} from "../../../kit";
import {IMiddleware} from "next-compose-router";
import {IBotData, IReturn} from "../../../types";
import {METHOD_NOT_ALLOWED} from "../../../errors";
import {botServices} from "../../../services";

const postBot: IMiddleware<IReturn<IBotData>> =
    async (req,
           res) => {
        if (req.query.qq) throw METHOD_NOT_ALLOWED
        const config = <IBotData>req.body
        const bot = await botServices.addBot(config)
        res.send([bot])
    }

const deleteBot: IMiddleware<IReturn<IBotData>> =
    async (req,
           res) => {
        const uin = parseInt(String(req.query.uin))
        const botInfo = await botServices.removeBot(uin)
        res.send([botInfo])
    }

const getBot: IMiddleware<IReturn<IBotData | IBotData[]>> =
    async (req,
           res) => {
        const {uin} = req.query
        if (uin) res.send([await botServices.getBot(parseInt(String(uin)))])
        else res.send([await botServices.getBots()])
    }

const putBot: IMiddleware<IReturn<IBotData>> =
    async (req,
           res) => {
        const config = <IBotData>req.body
        const botInfo = await botServices.updateBot(config)
        res.send([botInfo])
    }

export const botHandler = {
    POST: postBot,
    GET: getBot,
    DELETE: deleteBot,
    PUT: putBot
}

async function handler(req: NextApiRequest,
                       res: NextApiResponse) {
    return botHandler[req.method](req, res)
}

export default router(checkAuth, handler)
