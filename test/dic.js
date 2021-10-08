const { Wechaty } = require('wechaty')
const { diceBot } = require('../dist/cjs/index')

const bot = new Wechaty({
  name: 'dice-bot',
  puppet: 'wechaty-puppet-wechat',
})

bot
  .use(diceBot({ quickModel: true }))
  .start()
  .catch((e) => console.error(e))
