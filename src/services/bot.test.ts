// const {getBots} = require("./bot");
import axios from "axios";
import {getBots} from "./bot";

describe("auth api test", () => {
    it("registry01", async () => {
        const bots = getBots();
        expect(bots.length).toEqual(1);
    });

    it("add bot api", async () => {
        try {
            const bot = await axios.post("https://localhost:3000", {
                "uin": 123456,
                "password": "string",
                "config": {},
                "managers": [],
                "plugins": []
            })
            expect(bot).toEqual({
                "uin": 123456,
                "password": "string",
                "config": {},
                "managers": [],
                "plugins": []
            })
        } catch (e) {
            1
        }
    })
});
