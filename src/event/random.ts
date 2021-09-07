import Sampler from 'random-sampler'

const sampler = new Sampler()
const array = [
  '经过两天的艰苦奋战，{at}的高考分数已经揭晓了！\n你颤抖地点开查分页面，发现：\n语文[d50+100]\n数学[d30+120]\n英语[d20+130]\n综合[d60+240]\n省排[d1000]\n被{一等院校}录取！',
  '::3::经过两天的艰苦奋战，{at}的高考分数已经揭晓了！\n你颤抖地点开查分页面，发现：\n语文[d100+50]\n数学[d70+80]\n英语[d60+90]\n综合[d120+180]\n省排[1d10][1d10-1][1d10-1][1d10-1][1d10-1]\n被{二等院校}录取！',
  '::2::经过两天的艰苦奋战，{at}的高考分数已经揭晓了！\n你颤抖地点开查分页面，发现：\n语文[d120]\n数学[d120]\n英语[d120]\n综合[d200]\n省排[1d4][1d10-1][1d10-1][1d10-1][1d10-1][1d10-1]\n被{2.5等院校}录取！',
  '::1::经过两天的艰苦奋战，{at}的高考分数已经揭晓了！\n你颤抖地点开查分页面，发现：\n语文[d50]\n数学[d60]\n英语[d70]\n综合[d100]\n省排 [这个数太大了{self}骰不出来]\n被{三等院校}录取！',
  '::20::经过两天的艰苦奋战，{at}的高考分数已经揭晓了！\n你颤抖地点开查分页面，发现：\n语文[d70+80]\n数学[d50+100]\n英语[d40+110]\n综合[d90+210]\n省排[d1000+d1000+d1000+d1000+d1000+d1000+d1000+d1000]\n被{1.5等院校}录取！',
]
const size = 1
function getWeight (element:any) {
  const weightArray: string[] = element.match(/^::[1-9]\d*::/g) || ['1']
  const weightNum: string = weightArray[0].replace(/:/g, '')
  console.log(weightNum)
  return parseInt(weightNum)
}

const result = sampler.sample(array, size, getWeight)
console.log(result)
