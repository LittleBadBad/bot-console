import {isDirectory, isFile} from "./utils";

describe("util functions test",()=>{
    it("should judge right file",()=>{
        expect(isFile("D:\\workspace\\IdeaProjects\\zcy\\bot-console\\test\\hh.js")).toEqual(false)
        expect(isFile("D:\\workspace\\IdeaProjects\\zcy\\bot-console\\test\\jj.js")).toEqual(true)
        expect(isFile("D:\\workspace\\IdeaProjects\\zcy\\bot-console\\test\\kk.js")).toEqual(false)
    })
    it("should judge right dir",()=>{
        expect(isDirectory("D:\\workspace\\IdeaProjects\\zcy\\bot-console\\test\\hh.js")).toEqual(true)
        expect(isDirectory("D:\\workspace\\IdeaProjects\\zcy\\bot-console\\test\\jj.js")).toEqual(false)
        expect(isDirectory("D:\\workspace\\IdeaProjects\\zcy\\bot-console\\test\\kk.js")).toEqual(false)
    })
})