const { createClient } = require("oicq");
const { loadPlugins, loadYML, processed } = require("./src/utils/load");
const { getRandomInt } = require('./src/utils/rand');
const botEnvironment = require('./src/utils/init');

const Setting = loadYML('setting');

let BOT = createClient(Setting['account'].qq, {
    log_level: "debug"
});

BOT.sendMessage = async ( id, msg, type ) => {
    if (type === 'group') {
        await BOT.sendGroupMsg(id, msg);
    } else if (type === 'private') {
        await BOT.sendPrivateMsg(id, msg);
    }
};

BOT.sendMaster = async ( id, msg, type ) => {
    if (typeof Setting['master'] === 'number') {
        await BOT.sendPrivateMsg(Setting['master'], msg);
    } else {
        await BOT.sendMessage(id, '该 bot 未设置主人', type);
    }
}

global.bot = BOT;
global.master = Setting['master'];
global.repeatProb = parseInt(Setting['repeatProb']);

const run = async () => {
    // 处理登录滑动验证码
    bot.on("system.login.slider", () => {
        process.stdin.once("data", (input) => {
            bot.sliderLogin(input.toString());
        });
    });

    // 处理登录图片验证码
    bot.on("system.login.captcha", () => {
        process.stdin.once("data", (input) => {
            bot.captchaLogin(input.toString());
        });
    });

    // 处理设备锁事件
    bot.on("system.login.device", () => {
        bot.logger.info("手机扫码完成后按下 Enter 继续...");
        process.stdin.once("data", () => {
            bot.login();
        });
    });

    bot.login(Setting['account'].password);
}

run().then(() => {
    botEnvironment();
    const plugins = loadPlugins();
    let repeat = repeatProb ? repeatProb : 0;

    bot.logger.info("群消息复读的概率为 " + repeat + "%");
    ++repeat;

    bot.on("message.group", async msgData => {
        if (!processed(msgData, plugins, 'group')) {
            if (getRandomInt(100) < repeat) {
                await bot.sendMessage(msgData.group_id, msgData.raw_message, 'group');
            }
        }
    });

    bot.on("message.private", async msgData => {
        processed(msgData, plugins, 'private');
    });
});
