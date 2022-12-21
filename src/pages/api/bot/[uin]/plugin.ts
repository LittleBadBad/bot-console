import {NextApiRequest, NextApiResponse} from "next";

export default function handler(req: NextApiRequest,
                                res: NextApiResponse) {

    switch (req.method) {
        case "POST":
            break;
        case "GET":
            break;
        case "DELETE":
            break;
        case "PATCH":
            break;
        default:
            break;
    }

    res.send("/api/bot/" + JSON.stringify(req.query) + "/plugin")
}
