import {io} from "socket.io-client";
import {useEffect, useState} from "react";
import {ClientSocket, IBotInfo} from "../ws";
import {IBotData, IPluginData} from "../types";
import Popover from "@mui/material/Popover";
import Modal from "@mui/material/Modal";
import axios from "axios";

class Store {
    constructor(initialStates = {}) {
        this.states = Object.assign({}, initialStates);
        this.reducers = {};
    }

    states = {};
    reducers = {};

    dispatch(action, props?) {
        if (this.reducers[action]) {
            return this.states[action] = this.reducers[action](props, this.states[action])
        }
    }

    register(action, behavior) {
        this.states[action] = {};
        this.reducers[action] = behavior;
    }
}

const store = new Store()


function Bot({uin, password, managers, config, plugins, online, login, logout, edit, remove}:
                 (IBotInfo & {
                     login, logout, edit, remove,
                 })) {
    const [ps, setPs] = useState<IPluginData[]>([])
    const [open, setOpen] = useState(false)
    const [anchor, setAnchor] = useState<HTMLLIElement>()

    const [currentPlugin, setCurrentPlugin] = useState<IPluginData | undefined>()

    const socket = store.dispatch("get_socket") as ClientSocket

    function refresh() {
        axios.get("/api/bot/plugin")
            .then(r => {
                setPs(r.data[0])
            })
    }

    useEffect(() => {
        refresh()
    }, [])

    return <>
        <li onClick={event => {
            setAnchor(event.currentTarget)
        }}>
            <ul>
                <li>uin:{uin}</li>
                <li>psw:{password}</li>
                <li>managers:{managers.join(",")}</li>
                <li>config:{JSON.stringify(config)}</li>
                <li onClick={e => {
                    e.stopPropagation()
                    setOpen(true)
                }}>
                    plugins:{plugins.map(v => v.name).join(",")}
                </li>
                <li>online:{String(!!online)}</li>
            </ul>
        </li>
        <Modal open={open} onClose={() => setOpen(false)}>
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                minWidth: 600,
                minHeight: 200, maxHeight: 700, overflow: "auto", backgroundColor: "#ffffff"
            }}><h5 style={{textAlign: "center"}}>{uin} 插件</h5>
                <div style={{display: "flex", alignItems: "center"}}>
                    <ol>
                        {ps.map(v => {
                            const p = plugins.find(v1 => v1.name === v.name)
                            const id = "p_" + v.name
                            return <li key={v.name}>
                                <div onClick={() => {
                                    v.code && setCurrentPlugin(v)
                                }}>{v.name}{p && ",已安装"}{p?.broken && ",已损坏"}</div>
                                {p?.activated ? <button onClick={e =>
                                        socket.emit("PLUGIN_DEACTIVATE",
                                            uin,
                                            v.name)}>关闭
                                    </button> :
                                    <button onClick={() =>
                                        socket.emit("PLUGIN_ACTIVATE",
                                            uin,
                                            v.name)}>启动
                                    </button>}
                                {p ? <button onClick={() =>
                                        socket.emit("PLUGIN_UNINSTALL",
                                            uin,
                                            v.name)}>卸载</button> :
                                    <button onClick={() => {
                                        let config
                                        try {
                                            config = JSON.parse((document.getElementById(id) as HTMLInputElement)
                                                .value)
                                        } catch (e) {
                                            config = {managers: []}
                                        }
                                        socket.emit("PLUGIN_INSTALL",
                                            uin,
                                            v.name,
                                            config)
                                    }
                                    }>安装</button>}
                                <div>
                                    <textarea placeholder={"管理员"}
                                              id={id}
                                              readOnly={!!p}
                                              defaultValue={JSON.stringify(p?.config) || ""}/>
                                </div>
                            </li>
                        })}
                        <li onClick={() => setCurrentPlugin({
                            code: "export default function(){}",
                            name: "",
                            path: ""
                        })}>add +
                        </li>
                        {!ps.length && "暂无插件"}
                    </ol>
                    {currentPlugin && <form
                        style={{
                            display: "flex",
                            flexDirection: "column"
                        }}
                        onSubmit={e => {
                            e.preventDefault()
                            // @ts-ignore
                            const name = e.target.name.value
                            // @ts-ignore
                            const code = e.target.code.value;
                            (currentPlugin.name ?
                                axios.put("/api/bot/plugin", {
                                    name,
                                    code
                                }) : axios.post("/api/bot/plugin", {
                                    name,
                                    code
                                })).then(r => {
                                refresh()
                                setCurrentPlugin(undefined)
                            })
                        }}>
                        <input placeholder={"name"}
                               {...currentPlugin.name ? {value: currentPlugin.name} : {}}
                               defaultValue={currentPlugin.name} name={"name"}/>
                        <textarea placeholder={"code"}
                                  name={"code"}
                                  rows={50}
                                  style={{width: 500}}
                                  defaultValue={currentPlugin.code}/>
                        <div style={{display: "flex", justifyContent: "space-between"}}>
                            <button onClick={() => setCurrentPlugin(undefined)}>取消</button>
                            <button type={"submit"}>提交</button>
                        </div>
                    </form>}
                </div>
            </div>
        </Modal>
        <Popover
            open={!!anchor}
            anchorEl={anchor}
            onClose={() => setAnchor(null)}
            anchorOrigin={{
                vertical: 'top',
                horizontal: 'center',
            }}
            transformOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}>
            <>
                <button onClick={() => login(uin)}>登录</button>
                <button onClick={() => logout(uin)}>登出</button>
                <button onClick={() => edit({uin, password, managers})}>编辑</button>
                <button onClick={() => remove(uin)}>删除</button>
                <button>复制</button>
            </>
        </Popover>
    </>
}

function reducer(state, action) {
    switch (action.type) {
        case 'increment':
            return {count: state.count + 1};
        case 'decrement':
            return {count: state.count - 1};
        default:
            throw new Error();
    }
}

export default function Home() {
    const [botInfos, setBotInfos] = useState<IBotInfo[]>([])
    const [socket, setSocket] = useState<ClientSocket>(null)
    const [messages, setMessages] = useState<string[]>([])
    const [qr, setQr] = useState("")
    const [slide, setSlide] = useState("")
    const [current, setCurrent] = useState<IBotData>()
    const [] = useState()

    useEffect(() => {

        const s = io() as unknown as ClientSocket
        setSocket(s)
        s.on("BOT_STATUS", bots => setBotInfos(bots))
        s.on("message", ({message, type}) => {
            setMessages(pre => [...pre, message])
            if (message === "添加成功" || message === "更新成功") {
                setCurrent(undefined)
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

        store.register("get_socket", () => s)

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

    return <>
        <button onClick={() => {
            socket.emit("ACCOUNT_LOGIN", "zcy", "qwert1287299719")
        }}>账户登录
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
            />)}
        </ol>
    </>
}
