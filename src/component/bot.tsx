import {IBotInfo} from "../ws";
import {createContext, Dispatch, ReducerStateWithoutAction, useContext, useReducer, useState} from "react";
import {IPluginData} from "../types";
import Modal from "@mui/material/Modal";
import Popover from "@mui/material/Popover";
import {GlobalContext, requester} from "../pages";
import Plugin from "./plugin";

export const BotContext = createContext<[ReducerStateWithoutAction<any>, Dispatch<any>]>([() => {
}, () => {
}])


export default function Bot({uin, password, managers, config, plugins, online, login, logout, edit, remove, allPlugins}:
                                (IBotInfo & {
                                    login, logout, edit, remove, allPlugins: IPluginData[]
                                })) {
    const [open, setOpen] = useState(false)
    const [anchor, setAnchor] = useState<HTMLLIElement>()
    const [state, dispatch] = useReducer((s, action: { type: "set_current_plugin" | "set_modify_mode" | string } & Record<any, any>) => {
        switch (action.type) {
            case "set_current_plugin":
                return {
                    ...s,
                    currentPlugin: action.plugin
                }
            case "set_modify_mode":
                return {
                    ...s,
                    modify: action.modify
                }
            default:
                return s
        }
    }, {currentPlugin: undefined, modify: false})
    const {currentPlugin, modify} = state
    const setCurrentPlugin = (plugin) => dispatch({type: "set_current_plugin", plugin})
    const setModifyMode = (modify) => dispatch({type: "set_modify_mode", modify})
    const {refresh} = useContext(GlobalContext)

    return <BotContext.Provider value={[state, dispatch]}>
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
                        {allPlugins.map(v => <Plugin key={v.name} plugin={v} plugins={plugins} uin={uin}/>)}
                        <li onClick={() => {
                            setCurrentPlugin({
                                code: "export default function(){}",
                                name: "",
                                path: ""
                            })
                            setModifyMode(true)
                        }}>add +
                        </li>
                        {!allPlugins.length && "暂无插件"}
                    </ol>
                    {currentPlugin && <form
                        style={{
                            display: "flex",
                            flexDirection: "column"
                        }}
                        onSubmit={e => {
                            e.preventDefault()
                            const {name, code} = currentPlugin;
                            (!modify ?
                                requester.put("/api/bot/plugin", {
                                    name,
                                    code
                                }) : requester.post("/api/bot/plugin", {
                                    name,
                                    code
                                })).then(r => {
                                refresh()
                                setCurrentPlugin(undefined)
                                setModifyMode(false)
                            })
                        }}>
                        <input placeholder={"name"}
                               value={currentPlugin.name}
                               onChange={e => {
                                   modify &&
                                   setCurrentPlugin({...currentPlugin, name: e.target.value})
                               }}
                               name={"name"}/>
                        <textarea placeholder={"code"}
                                  name={"code"}
                                  rows={50}
                                  style={{width: 500}}
                                  value={currentPlugin.code}
                                  onChange={e => setCurrentPlugin({...currentPlugin, code: e.target.value})}/>
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
    </BotContext.Provider>
}
