import md5 from "md5"
import {LOG_ERROR} from "../errors";
import validUsers from "../validUsers";


export default async function login(username: string, password: string) {
    for (const [name, pwd] of validUsers) {
        if (name === username && md5(password) === pwd) {
            return
        }
    }
    throw LOG_ERROR
}
