import {NextApiRequest, NextApiResponse} from "next";
import {IMiddleware} from "next-compose-router";
import {IPluginData, IReturn} from "../../../types";
import {METHOD_NOT_ALLOWED} from "../../../errors";
import {pluginServices} from "../../../services";

const postPlugin: IMiddleware<IReturn<IPluginData>> =
    async (req,
           res) => {
        if (req.query.qq) throw METHOD_NOT_ALLOWED
        const config = <IPluginData>req.body
        const plugin = pluginServices.addPlugin(config)
        res.send([plugin])
    }

const deletePlugin: IMiddleware<IReturn<IPluginData>> =
    async (req,
           res) => {
        const name = String(req.query.name)
        const plugin = await pluginServices.removePlugin(name)
        res.send([plugin])
    }

const getPlugin: IMiddleware<IReturn<IPluginData | IPluginData[]>> =
    async (req,
           res) => {
        const {name} = req.query
        if (name) res.send([pluginServices.getPlugin(String(name))])
        else res.send([pluginServices.getPlugins()])
    }

const putPlugin: IMiddleware<IReturn<IPluginData>> =
    async (req,
           res) => {
        const config = <IPluginData>req.body
        const botInfo = await pluginServices.updatePlugin(config)
        res.send([botInfo])
    }

export const botHandler = {
    POST: postPlugin,
    GET: getPlugin,
    DELETE: deletePlugin,
    PUT: putPlugin
}


export default function handler(req: NextApiRequest,
                                res: NextApiResponse) {
    return botHandler[req.method](req, res)
}
