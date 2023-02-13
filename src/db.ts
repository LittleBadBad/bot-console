import {IBotData, IPluginData, LowWithLodash} from "./types";
import {JSONFileSync} from "./vendor/lowdb/adapters/JSONFileSync";

export type IDb = {
    bots: IBotData[]
    plugins: IPluginData[]
}

const dbPath = process.env.DB_PATH || "D:\\workspace\\IdeaProjects\\zcy\\bot-console\\db.json"
const db = new LowWithLodash<IDb>(new JSONFileSync<IDb>(dbPath))
export default db
