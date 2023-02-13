import {io} from "socket.io-client";
import {createContext, useEffect, useState} from "react";
import {ClientSocket, IBotInfo} from "../ws";
import {IBotData, IPluginData} from "../types";
import Modal from "@mui/material/Modal";
import Bot from "../component/bot";
import axios from "axios";
import {CONNECTED} from "../errors";

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
    const [messages, setMessages] = useState<string[]>([])
    const [qr, setQr] = useState("")
    const [slide, setSlide] = useState("")
    const [current, setCurrent] = useState<IBotData>()
    const [username, setU] = useState("")
    const [password, setP] = useState("")
    const [loginOpen, setO] = useState(false)
    const [allPlugins, setAllPlugins] = useState<IPluginData[]>([])

    function refresh() {
        requester.get("/api/bot/plugin")
            .then(({data: [_ps]}) => {
                setAllPlugins(_ps)
            })
    }

    useEffect(() => {
        const s = io() as unknown as ClientSocket
        setSocket(s)
        s.on("BOT_STATUS", bots => setBotInfos(bots))
        s.on("message", ({message, type, data}) => {
            setMessages(pre => [...pre, message])
            if (message === "添加成功" || message === "更新成功") {
                setCurrent(undefined)
            } else if (message === CONNECTED.message) {
                localStorage.setItem("token", data)
                refresh()
            }
        })

        s.on("BOT_ONLINE", () => setMessages(pre => [...pre, "机器人已上线"]))
        s.on("BOT_LOGIN_QRCODE", img => {
            var blob = new Blob([img], {type: "image/jpeg"});
            var urlCreator = URL;
            var imageUrl = urlCreator.createObjectURL(blob);
            setQr(imageUrl)
        })
        s.on("BOT_LOGIN_SLIDER", url => {
            setSlide(url)//
        })


        return () => {
            s.removeAllListeners()

        }
    }, [])

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
        <button onClick={() => setO(true)}>账户登录
        </button>
        <button onClick={() => {
            setCurrent({uin: 0, config: undefined, plugins: [], password: "", managers: []})
        }}>添加qq
        </button>
        <input placeholder={"ticket"} id={"ticket"}/>
        <button onClick={() => {
            socket.emit("BOT_LOGIN_SLIDER",
                737801717, "")
        }}>发送ticket
        </button>
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
        {messages.join("; ")}
        <div>----滑块链接------------------</div>
        {slide}
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
        <Modal open={loginOpen} onClose={_ => setO(false)}>
            <form style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                minWidth: 600,
                minHeight: 200, maxHeight: 700, overflow: "auto", backgroundColor: "#ffffff"
            }} onSubmit={e => {
                e.preventDefault()
                socket.emit("ACCOUNT_LOGIN", username, password)
                setO(false)
            }}>
                <input placeholder={"username"}
                       value={username}
                       onChange={e => setU(e.target.value)}/>
                <input placeholder={"password"}
                       value={password}
                       type={"password"}
                       onChange={e => setP(e.target.value)}/>
                <button type={"submit"}>确定
                </button>
            </form>
        </Modal>
    </GlobalContext.Provider>
}
