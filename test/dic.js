import { WechatyBuilder } from 'wechaty'
import { diceBot } from '../dist/esm/index.js'

const bot = WechatyBuilder.build({
  name: 'dice-bot',
  puppet: 'wechaty-puppet-wechat',
})

bot
  .use(diceBot({ quickModel: true }))
bot.start()
  .catch((e) => console.error(e))
