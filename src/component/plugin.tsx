import {IPlugin, IPluginData} from "../types";
import {useContext} from "react";
import {GlobalContext} from "../pages";
import {BotContext} from "./bot";

export default function Plugin({plugin, plugins, uin}: { plugin: IPluginData, plugins: IPlugin[], uin: number }) {
    const [state, dispatch] = useContext(BotContext)
    const {socket} = useContext(GlobalContext)
    const p = plugins.find(v1 => v1.name === plugin.name)
    const id = "p_" + plugin.name


    return <li>
        <div onClick={() => {
            if (plugin.code) {
                dispatch({type: "set_current_plugin", plugin})
                dispatch({type: "set_modify_mode", modify: false})
            }
        }}>{plugin.name}{p && ",已安装"}{p?.broken && ",已损坏"}</div>
        {p?.activated ? <button onClick={e =>
                socket.emit("PLUGIN_DEACTIVATE",
                    uin,
                    plugin.name)}>关闭
            </button> :
            <button onClick={() =>
                socket.emit("PLUGIN_ACTIVATE",
                    uin,
                    plugin.name)}>启动
            </button>}
        {p ? <button onClick={() =>
                socket.emit("PLUGIN_UNINSTALL",
                    uin,
                    plugin.name)}>卸载</button> :
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
                    plugin.name,
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
}
