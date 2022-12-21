module.exports = function createPlugin() {
    /**
     * @type {import("../src/types").IOrder}
     */
    const wang = {
        trigger:/^叫$/,
        action(e) {
            e.reply("汪汪", true)
        }
    }

    return {
        orders: [wang]
    }
}
