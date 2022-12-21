module.exports = function () {
    return {
        managers: [],
        orders: [{
            trigger: "叫妈妈",
            auth(botManagers) {
                return botManagers;
            },
            action(e) {
                e.reply("妈妈", true)
            }
        }]
    }
}
