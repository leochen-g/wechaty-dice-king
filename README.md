# Wechaty-Dice-King
Wechaty 骰王卡牌抽取游戏插件，类似骰娘https://v2docs.kokona.tech/zh/latest/CookBook.html

## 使用

### 安装依赖

```shell
npm i wechaty-dice-king --save
```

### 代码配置

> quickModel 是否需要快速体验 默认false, 如果为true，可以在控制台直接生成二维码。如果接入现有项目，可以设置为false

```javascript
import { WechatyBuilder } from 'wechaty'
import { diceBot } from 'wechaty-dice-king'

const bot = WechatyBuilder.build({
    name: 'wechat-dice-bot', // generate xxxx.memory-card.json and save login data for the next login
    // puppet: new PuppetWalnut(),
    puppet: 'wechaty-puppet-wechat',
});
bot
    .use(diceBot({ quickModel: true }))

bot.start()
    .catch((e) => console.error(e))

```


## 功能列表

- [x] 自定义牌堆
- [x] 公共牌堆
- [x] 带图片的牌堆

### 内置牌堆

直接在群或者私聊中发送

```
.draw 早餐
.draw 原神单抽
.
```

### 指令

> .help 帮助
> 
> .drawh 暗抽
> 
> .draw 明抽
