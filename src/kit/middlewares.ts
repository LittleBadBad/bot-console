import {FORBIDDEN} from "../errors";
import {IMiddleware, nextCompose} from "next-compose-router"
import jwt from "jsonwebtoken";
import {IJWTPayload} from "../types";
import validUsers from "../validUsers";

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

const verifyJWT = (token) => {
    const secret = process.env.JWT_SECERET_KEY || "secret"
    try {
        return jwt.verify(token, secret);
    } catch (err) {
        return null;
    }
};

export const checkAuth: IMiddleware = async (req, res, next) => {
    const token = req.headers.authorization.split(" ")[1];
    const payload = verifyJWT(token) as IJWTPayload;
    if (!payload) {
        throw FORBIDDEN;
    }
    for (const [name] of validUsers) {
        if (name === payload.user) {
            return next()
        }
    }
    throw FORBIDDEN;
}
export const checkParams: IMiddleware = async (req, res, next) => {
    await next()
}
