import * as schedule from 'node-schedule'
import {getCard} from "../event/drawEvent.js";

/**
 * 设置定时器
 * @param {*} date 日期
 * @param {*} callback 回调
 */
//其他规则见 https://www.npmjs.com/package/node-schedule
// 规则参数讲解    *代表通配符
//
// *  *  *  *  *  *
// ┬ ┬ ┬ ┬ ┬ ┬
// │ │ │ │ │ |
// │ │ │ │ │ └ day of week (0 - 7) (0 or 7 is Sun)
// │ │ │ │ └───── month (1 - 12)
// │ │ │ └────────── day of month (1 - 31)
// │ │ └─────────────── hour (0 - 23)
// │ └──────────────────── minute (0 - 59)
// └───────────────────────── second (0 - 59, OPTIONAL)
// 每分钟的第30秒触发： '30 * * * * *'
//
// 每小时的1分30秒触发 ：'30 1 * * * *'
//
// 每天的凌晨1点1分30秒触发 ：'30 1 1 * * *'
//
// 每月的1日1点1分30秒触发 ：'30 1 1 1 * *'
//
// 每周1的1点1分30秒触发 ：'30 1 1 * * 1'
export function setLocalSchedule(date: string, callback: () => void, name: string) {
    if (name) {
        schedule.scheduleJob(name, {rule: date, tz: 'Asia/Shanghai'}, callback)
    } else {
        schedule.scheduleJob({rule: date, tz: 'Asia/Shanghai'}, callback)
    }
}

// 取消任务
export function cancelLocalSchedule(name: string) {
    schedule.cancelJob(name)
}

// 取消指定任务
export function cancelAllSchedule(type: string) {
    for (let i in schedule.scheduledJobs) {
        if (i.includes(type)) {
            cancelLocalSchedule(i)
        }
    }
}

export interface TaskInfo {
    cron: string;
    type: string;
    targets: { name: string, id: string }[];
    deck: string
}

export function initSchedule(that: any, tasks: TaskInfo[]) {
    if (tasks && tasks.length) {
        tasks.forEach((item) => {
            void setMultiTask(that, item);
        });
    }
}


async function setMultiTask(that: any, task: TaskInfo) {
    try {
        setLocalSchedule(task.cron, startSendMultiTask.bind(null, {
            that,
            task
        }), 'schedule_decks');
        console.log(`设定任务成功`)
    } catch (e) {
        console.log("catch error:" + e);
    }
}

async function getMultiTargets(that: any, type: string, task: TaskInfo) {
    const targets = [];
    for (let target of task.targets) {
        let finalTarget = '';
        if (type === 'room') {
            finalTarget = target.id ? await that.Room.find({id: target.id}) : await that.Room.find({topic: target.name})
        } else {
            console.log('target', target)
            finalTarget = target.id ? await that.Contact.find({id: target.id}) : await that.Contact.find({name: target.name})
        }
        if (finalTarget) {
            targets.push(finalTarget);
        } else {
            console.log(`定时任务查找不到${type === "room" ? "群" : "好友"}：${target.name}，请检查${type === "room" ? "群名" : "好友昵称"}是否正确`);
        }
    }
    return targets;
}

async function startSendMultiTask({that, task}: { that: any, task: TaskInfo }) {
    const targets = await getMultiTargets(that, task.type, task);
    if (!targets.length) {
        return;
    }
    await getTaskCard({
        that,
        targets,
        info: task
    })
}


async function getTaskCard({that, targets, info}: { that: any, targets: any[], info: TaskInfo }) {
    const userSelfName = that.currentUser.name()
    for (const single of targets) {
        const name = info.type === 'room' ? await single.topic() : single.name();
        const res = await getCard({
            key: info.deck,
            name,
            self: userSelfName,
            room: info.type === 'room' ? single : undefined
        })
        if (res.length) {
            for (const reply of res) {
                await single.say(reply.content)
            }
        }
    }
}
