import md5 from "md5"
import {LOG_ERROR} from "../errors";

const validUsers = [
    ["zcy", "043c9f118dd1b31dcb6b30b9b1d39770"],
    ["clover", ""]
]
export default async function login(username: string, password: string) {
    for (const [name, pwd] of validUsers) {
        if (name === username && md5(password) === pwd) {
            return
        }
    }
    throw LOG_ERROR
}
