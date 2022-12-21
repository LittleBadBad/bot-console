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
        plugins: []// todo scan plugin directories to init plugins data
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
