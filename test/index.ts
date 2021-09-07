import { Wechaty } from 'wechaty'
import { diceBot } from '../src/index'

const bot = new Wechaty({
  name: 'dice-bot',
  puppet: 'wechaty-puppet-wechat',
})

bot
  .use(diceBot({ quickModel: true }))
  .start()
  .catch((e) => console.error(e))
