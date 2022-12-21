import {BAD_REQUEST, FORBIDDEN} from "../errors";
import {IMiddleware, nextCompose} from "next-compose-router"

const dev = process.env.NODE_ENV !== 'production'

export const router = nextCompose((req, res, err) => {
    console.error(err)
    res.statusCode = err.status || 500
    res.send([null,
        {
            status: err.status || 500,
            message: err.status ? err.message : "程序出错"
        }])
})

export const checkAuth: IMiddleware = async (req, res, next) => {
    const token = req.headers.authorization
    if (!token) {
        await next()
    } else
        throw FORBIDDEN
}
export const checkParams: IMiddleware = async (req, res, next) => {
    const token = req.headers.authorization
    if (!token) {
        await next()
    } else
        throw BAD_REQUEST
}
