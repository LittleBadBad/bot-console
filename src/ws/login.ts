import {LOG_ERROR} from "../errors";
import validUsers from "../validUsers";
import bcrypt from "bcrypt"

export default async function login(username: string, password: string) {
    for (const [name, pwd] of validUsers) {
        if (name === username && await bcrypt.compare(password,pwd)) {
            return
        }
    }
    throw LOG_ERROR
}
