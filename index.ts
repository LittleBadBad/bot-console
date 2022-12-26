import {initWSServer, wsServer} from "./src/ws";
import {oicqServices} from "./src/services";
import db from "./src/db";
import next from "next";
import {createServer} from "http";
import {parse} from "url";

const dev = process.env.NODE_ENV !== 'production'
const app = next({dev})
const handler = app.getRequestHandler()
const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true)
    await handler(req, res, parsedUrl)
})
wsServer.attach(httpServer)
const port = parseInt(process.env.PORT || '3000', 10)


app.prepare().then(async () => {
    initWSServer()
    httpServer.listen(port)
    db.read()
    db.data ||= {
        bots: [],
        /**
         *  todo
         *
         *  1. 扫描2个目录：__dirname/plugins 和 __dirname/src/plugins，
         *  扫描包括该目录下的.js、.ts、目录
         *  2. 取最后文件名或文件夹名作为插件的名字 https://stackoverflow.com/questions/19811541/get-file-name-from-absolute-path-in-nodejs
         *  3. 与现有db.data合并，以绝对目录为主键，若不存在，则{name: 文件名, path:绝对路径}
         */
        plugins: []
    }
    db.write()
    db.read()
    for (const bot of db.chain.get("bots").value()) {
        await oicqServices.addOicqBot(bot)
    }

    console.log(
        `> Server listening at http://localhost:${port} as ${
            dev ? 'development' : process.env.NODE_ENV
        }`
    )
})
