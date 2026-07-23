import { shuffle, normalize, arraysEqual } from "./utils.js";
import { MODE_LABELS, LEVEL_LABELS } from "./config.js";
const REWARD_TARGET=500;
export class Session{
 constructor(database,state,onState,onReward){this.database=database;this.state=state;this.onState=onState;this.onReward=onReward;this.reset();}
 reset(){this.mode="";this.level="gr4";this.questions=[];this.index=0;this.score=0;this.selected=null;this.indices=new Set();this.answered=false;}
 start(mode,level){
  this.reset();this.mode=mode;this.level=level;const source=this.database[level][mode],amount=this.state.settings.sessionLength;
  if(mode==="lezen"){
    const groups=new Map(); for(const q of shuffle(source)){const k=normalize(q.text||q.question);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(q);}
    let texts=shuffle([...groups.values()]);
    while(this.questions.length<Math.min(amount,source.length)){
      if(!texts.length)texts=shuffle([...groups.values()]);
      const group=texts.pop(); this.questions.push(shuffle(group)[0]);
    }
  } else {
    let pool=shuffle(source);while(this.questions.length<Math.min(amount,source.length)){if(!pool.length)pool=shuffle(source);this.questions.push(pool.pop());}
  }
 }
 current(){return this.questions[this.index];} select(value){this.selected=value;} selectIndex(i,on){on?this.indices.add(i):this.indices.delete(i);}
 evaluate(input=""){
  if(this.answered||this.mode==="woordtrainer")return null;const q=this.current();let correct=false,answer="";
  if(q.type==="dictee"){correct=normalize(input)===normalize(q.word);answer=q.word;}
  else if(q.type==="grammar"){correct=arraysEqual([...this.indices].sort((a,b)=>a-b),[...q.correctIndices].sort((a,b)=>a-b));answer=q.correctText;}
  else{if(this.selected===null)return{missing:true};correct=this.selected===String(q.correct);answer=q.explanation||String(q.correct);}
  this.answered=true;const p=this.state.progress[this.mode];p.answered++;if(correct)p.correct++;let reward=false;
  if(correct){this.score++;this.state.points++;this.state.rewardProgress=(this.state.rewardProgress||0)+1;if(this.state.rewardProgress>=REWARD_TARGET){this.state.rewardProgress-=REWARD_TARGET;this.state.rewards++;reward=true;}}
  this.onState();if(reward)this.onReward();return{correct,answer,reward};
 }
 next(){this.index++;this.selected=null;this.indices.clear();this.answered=false;return this.index<this.questions.length;}
 previous(){if(this.index>0){this.index--;this.selected=null;this.indices.clear();this.answered=false;}return this.index>=0;}
 finish(){if(this.mode!=="woordtrainer"){this.state.streak++;this.state.progress[this.mode].sessions++;this.state.history.push({date:new Date().toLocaleDateString("nl-NL"),mode:MODE_LABELS[this.mode],level:LEVEL_LABELS[this.level],score:`${this.score} / ${this.questions.length}`});this.onState();}}
}
