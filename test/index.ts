import { WechatyBuilder } from 'wechaty'
import { diceBot } from '../src'

const bot = WechatyBuilder.build({
  name: 'wechat-dice-bot', // generate xxxx.memory-card.json and save login data for the next login
  // puppet: new PuppetWalnut(),
  puppet: 'wechaty-puppet-wechat',
});
bot
  .use(diceBot({ quickModel: true }))

bot.start()
  .catch((e) => console.error(e))
