import {NextApiRequest, NextApiResponse} from "next";
import {checkAuth, checkParams, router} from "../../../kit";
import {botHandler} from "./index";

async function handler(req: NextApiRequest,
                       res: NextApiResponse) {
    return botHandler[req.method](req, res)
}

export default router(checkAuth, checkParams, handler)
