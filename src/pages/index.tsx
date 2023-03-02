import {io} from "socket.io-client";
import {createContext, useEffect, useState} from "react";
import {ClientSocket, IBotInfo} from "../ws";
import {IBotData, IPluginData, ISocketMessage} from "../types";
import Bot from "../component/bot";
import axios from "axios";
import {CONNECTED} from "../errors";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";

export const requester = axios.create()

requester.interceptors.request.use(config => {
    const token = localStorage.getItem("token")
    config.headers["authorization"] = `Bearer ${token}`
    return config
},)

export const GlobalContext = createContext<{ refresh, socket?: ClientSocket }>({
    refresh: () => {
    }
})

export default function Home() {
    const [botInfos, setBotInfos] = useState<IBotInfo[]>([])
    const [socket, setSocket] = useState<ClientSocket>(null)
    const [messages, setMessages] = useState<ISocketMessage[]>([])
    const [qr, setQr] = useState("")
    const [slide, setSlide] = useState("")
    const [current, setCurrent] = useState<IBotData>()
    const [username, setU] = useState("")
    const [password, setP] = useState("")
    const [loginOpen, setLoginOpen] = useState(false)
    const [allPlugins, setAllPlugins] = useState<IPluginData[]>([])

    function refresh() {
        requester.get("/api/bot/plugin")
            .then(({data: [_ps]}) => {
                setAllPlugins(_ps)
            })
    }

    useEffect(() => {
        setU(localStorage.getItem("username") || "")
        setP(localStorage.getItem("password") || "")
        const s = io() as unknown as ClientSocket
        setSocket(s)
        s.on("BOT_STATUS", bots => setBotInfos(bots))
        s.on("message", ({message, type, data}) => {
            setMessages(pre => [...pre, {message, type}])
            if (message === "添加成功" || message === "更新成功") {
                setCurrent(undefined)
            } else if (message === CONNECTED.message) {
                localStorage.setItem("token", data)
                refresh()
            }
        })

        s.on("BOT_ONLINE", () => setMessages(pre => [...pre, {message: "机器人已上线", type: "success"}]))
        s.on("BOT_LOGIN_QRCODE", img => {
            var blob = new Blob([img], {type: "image/jpeg"});
            var urlCreator = URL;
            var imageUrl = urlCreator.createObjectURL(blob);
            setQr(imageUrl)
        })
        s.on("BOT_LOGIN_SLIDER", url => {
            url = "https://github.com"
            setSlide(url)//
            const {ipcRenderer} = (window as any).electron || {}
            ipcRenderer && ipcRenderer.send('asynchronous-message', url)//
        })

        return () => {
            s.removeAllListeners()
        }
    }, [])

    useEffect(() => {
        localStorage.setItem("username", username)
        localStorage.setItem("password", password)
    }, [password, username])

    useEffect(() => {
        const interval = setInterval(() => {
            messages.length && setMessages(pre => {
                pre.shift()
                return pre
            })
        }, 5000)
        return () => {
            clearInterval(interval)
        }
    }, [messages.length])

    useEffect(() => {
        if (qr) {
            const timeout = setTimeout(() => {
                setQr("")
            }, 10000)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [qr])

    const botLogin = (uin) => {
        socket.emit("BOT_LOGIN", uin)
    }

    const botLogout = (uin) => {
        socket.emit("BOT_LOGOUT", uin)
    }

    const botEdit = (botData: IBotData) => {
        setCurrent(botData)
    }

    const botDelete = (uin) => {
        socket.emit("BOT_DELETE", uin)
    }


    return <GlobalContext.Provider value={{refresh, socket}}>
        <Button onClick={() => setLoginOpen(true)}>账户登录
        </Button>
        <Button onClick={() => setCurrent({uin: 0, config: undefined, plugins: [], password: "", managers: []})}>
            添加qq
        </Button>
        {botInfos?.length &&
            <Button onClick={() => botInfos.forEach(v => botLogin(v.uin))}>
                全部登录
            </Button>}
        {botInfos?.length &&
            <Button onClick={() =>
                botInfos.forEach(bot =>
                    bot.plugins.forEach(plugin => socket.emit("PLUGIN_ACTIVATE",
                        bot.uin,
                        plugin.name)))}>
                插件全部启动
            </Button>}
        <div>----表单区--------------------</div>
        {(current && <form onSubmit={event => {
            event.preventDefault()
            // @ts-ignore
            const uin = parseInt(event.target.uin.value)
            // @ts-ignore
            const password = event.target.password.value
            // @ts-ignore
            const managers = event.target.managers.value
                .split(",").map(v => parseInt(v))
            let config
            try {
                // @ts-ignore
                config = JSON.parse(event.target.config.value)
            } catch (e) {
                config = {platform: 2}
            }
            socket.emit(current.uin ? "BOT_UPDATE" : "BOT_CREATE", {
                ...current,
                uin,
                password,
                managers,
                config
            })
        }}>
            {/**todo add config edit*/}
            <input placeholder={"uin"} name={"uin"} defaultValue={current.uin || ""} disabled={!!current.uin}/>
            <input placeholder={"password"} name={"password"} defaultValue={current.password}/>
            <input placeholder={"managers"} name={"managers"} defaultValue={current.managers.join(",")}/>
            <input placeholder={"config"} name={"config"} defaultValue={JSON.stringify(current.config || {})}/>
            <button onClick={() => setCurrent(undefined)}>取消</button>
            <button type={"submit"}>提交</button>
        </form>) || true}
        <div>----提示信息------------------</div>
        {messages.map(v => v.type + ":" + v.message).join("; ")}
        <div>----滑块链接------------------</div>
        {/*{slide}*/}
        <iframe src={slide} height={300} width={300}/>

        <div>----二维码-------------------</div>

        <img src={qr} alt={""}/>
        <div>----机器人信息----------------</div>
        <ol>
            {botInfos.map(v => <Bot
                key={v.uin}
                {...v}
                login={botLogin}
                logout={botLogout}
                edit={botEdit}
                remove={botDelete}
                allPlugins={allPlugins}
            />)}
        </ol>
        <Dialog open={loginOpen} onClose={_ => setLoginOpen(false)}>
            <form onSubmit={e => {
                e.preventDefault()
                socket.emit("ACCOUNT_LOGIN", username, password)
                setLoginOpen(false)
            }}>
                <TextField placeholder={"username"}
                           value={username}
                           onChange={e => setU(e.target.value)}/>
                <TextField placeholder={"password"}
                           value={password}
                           type={"password"}
                           onChange={e => setP(e.target.value)}/>
                <Button type={"submit"}>确定</Button>
            </form>
        </Dialog>
    </GlobalContext.Provider>
}
