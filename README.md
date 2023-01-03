[TOC]

This is a [Next.js](https://nextjs.org/) project bootstrapped
with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

update: 新增基于[chatgpt](https://www.npmjs.com/package/chatgpt#authentication)开发的[chatgpt插件](./src/plugins/index.ts)

# oicq机器人管理后台

基于 [nextjs](https://nextjs.org/) + [oicq](https://www.npmjs.com/package/oicq)
搭建的机器人管理程序，提供一些WS、HTTP的api来控制后台运行中的机器人，以及机器人功能插件的安装、启动、关闭和卸载。并提供机器人插件开发的接口，且支持机器人插件的动态装载和启动；并提供了一个简陋的可视化界面，基本具备全部必要的交互逻辑

目前仅支持多用户对同一组机器人管理

## 启动

```bash
npm run dev
# or
yarn dev
```

## API

### ws

监听事件

| event | description |
|---|---|
| BOT_CREATE | 创建机器人 |
| BOT_READ | 读取已加载的机器人，无qq参数则读取全部 |
| BOT_UPDATE | 机器人信息更新（更新后会下线，插件保留但全部关闭） |
| BOT_DELETE | 删除机器人 |
| BOT_LOGIN | 登录机器人 |
| BOT_LOGIN_SLIDER | 提交滑块获取的ticket |
| BOT_LOGOUT | 机器人下线 |
| PLUGIN_INSTALL | 安装插件（插件代码有变化，则需要发送此事件重新启动） |
| PLUGIN_UNINSTALL | 卸载插件 |
| PLUGIN_ACTIVATE | 启动插件 |
| PLUGIN_DEACTIVATE | 关闭插件 |
| disconnect | socket.io指定断连事件 |
| ACCOUNT_LOGIN | 账户登录（登录后才能进入online房间，客户端才能发送以上消息并接收以下的消息） |

发送事件

| event | description |
|---|---|
| BOT_STATUS | 全部机器人的状态 |
| BOT_LOGIN_DEVICE | 设备锁验证 |
| BOT_LOGIN_ERROR | 登录出错 |
| BOT_LOGIN_QRCODE | 二维码登录 |
| BOT_LOGIN_SLIDER | 滑块验证 |
| BOT_OFFLINE | 机器人下线事件 |
| BOT_OFFLINE_KICKOFF | 机器人被挤下线 |
| BOT_ONLINE | 机器人上线事件 |
| message | socket.io默认消息事件 |

### http

- `/api/bot/plugin` `GET` 获取一个或多个插件

- `/api/bot/plugin/[name]` `GET` 获取name为[name]的插件

- `/api/bot/plugin` `POST` 新建一个插件

- `/api/bot/plugin` `PUT` 修改一个插件

- `/api/bot/plugin` `DELETE` 删除一个插件

- `/api/bot/plugin/[name]` `DELETE` 删除name为[name]的插件

## 插件开发

### 格式

- commonJS

```javascript
module.exports = function createPlugin() {
    /**
     * 类型提示引入方法
     * @type {import("../src/types").IOrder}
     */
    const wang = {
        trigger: /^叫$/,
        action(e) {
            e.reply("汪汪", true)
        }
    }

    return {
        orders: [wang]
    }
}
```

- moduleJS

```javascript
const thumbUp = (bot) => {
    return {
        orders: [{
            trigger: /^赞我$/,
            auth: _ => true,
            action(e) {
                const uid = e.sender.user_id
                const client = bot.client
                client.sendLike(uid, 1)
                    .then(_ => e.reply("赞了1次", true))
                    .catch(_ => e.reply("赞失败", true))
            }
        }]
    }
}

export default thumbUp
```

- typescript

```typescript
import {CP, IOrder} from "../types";
// 第二个参数由managers变为包含managers的config
// 可暂时通过es6的解包语法{managers}过渡
const callDaddy: CP = (bot, {managers}) => {
    const daddy: IOrder = {
        trigger: "叫爸爸",
        action(e) {
            return e.reply("爸爸", true);
        },
        auth: bot.managers
    }
    return {
        orders: [daddy]
    }
}
export default callDaddy
```

### interface

#### IOrder

插件命令

- trigger 触发条件

    - 触发关键词/关键词列表/正则表达式/其他函数处理
    - 注：触发指关键语句中包含该词，完全匹配请使用正则或函数手动处理
    - 基于插件安全使用的原则，默认不触发
    - 若需要默认全部触发，可设置为 `""` 或 `_=>true`

- auth 有权限的成员选择

    - 成员uin/有权限成员列表/返回成员列表的函数(消息对象)
    - 插件小规模自用的原则，默认机器人管理员
    - 若需要默认全部触发，可设置为 `_=>true`

- action 处理命令

    Params:

|name|desc|
|---|---|
| e | 消息对象|
| bot | 机器人对象，当插件不为函数为对象时获取到机器人和其client的方法|

- desc 命令的解释字段

#### IPluginDetail

- orders 命令集合

- onActivate 插件启动时的操作
    - 参数 bot 机器人对象

- onDeactivate 插件关闭时操作
    - 参数 bot 机器人对象

#### CP (Create Plugin)

creat plugin，插件最终模块导出的函数。多个机器人使用不同插件时最好单独创建新的实例，所以插件最好以函数的形式定义， 平台同样支持object式的插件，但是实现复杂功能时还是推荐使用函数

Params:

|name|desc|
|---|---|
| bot | oicq对象|
| config |  安装时的设置参数，managers必存在，其他自行设置|
| db |  安装时设置的lowdb对象，插件数据的路径为 __dirname/pluginData/[uin]/[plugin_name]|

Returns:
IPluginDetail 插件详细内容

### 载入

插件数据在数据文件中以`IPluginData{name,path,code}`格式存储

- name 插件名，可中文可英文，不建议重复
- path 插件代码文件存储路径，建议使用绝对路径（后期优化目标为可通过相对路径打开插件项目的全部文件）
- code 暂存插件的代码内容，目前无实际用途（后期优化目标为插件文件损坏或无法加载时，通过此项加载插件）

目前尚未实现插件自动扫盘加载的功能，可以在`index.ts`的初始化数据文件中载入

```typescript
db.data ||= {
    bots: [],
    plugins: [{name: "", path: "", code: ""}]// 在此添加
}
```

也可以在项目启动后生成的`db.json`数据文件中，手动添加插件信息

```json
{
  "plugins": [
    {
      "name": "叫爸爸",
      "path": "D:\\workspace\\IdeaProjects\\zcy\\bot-console\\src\\plugins\\callDaddy.ts"
    }
  ]
}
```

## Roadmap

| 计划 | 状态 |
|---|---|
|[旧版](https://www.npmjs.com/package/littlebad-bot) 插件迁移|√|
|插件管理http接口鉴权|📅|
|可视化页面优化|📅|
|可视化页面可编辑config|📅|
|本地插件扫描加载|📅|
|测试用例编写|📅|
|插件独立为项目模块并编辑|📅|
|项目打包|📅|
