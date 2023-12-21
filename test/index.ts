import {WechatyBuilder} from 'wechaty'
import {diceBot} from '../src/index.js'

const bot = WechatyBuilder.build({
    name: 'wechat-dice-bot', // generate xxxx.memory-card.json and save login data for the next login
    // puppet: new PuppetWalnut(),
    puppet: 'wechaty-puppet-wechat4u',
});
bot
    .use(diceBot({
        quickModel: true,
        task: [{type: "contact", targets: [{id: '', name: 'Leo_chen'}], cron: '* * * * *', deck: '高考'}]
    }))

bot.start()
    .catch((e) => console.error(e))
