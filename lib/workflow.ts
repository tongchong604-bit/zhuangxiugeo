import { type AssetRequest, type AssetResult, type GenerateInput, type MarketingCopy } from './schema';
export type GroupStatus='queued'|'running'|'complete'|'partial'|'failed'|'stopped';
export type Group={id:number;input:GenerateInput;status:GroupStatus;copy:MarketingCopy|null;copyError:string|null;images:{image:string|null;error:string|null}[]};
export function parseKeywords(value:string):string[]{
 const words=[...new Set(value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean))];
 if(!words.length)throw new Error('请至少输入一个关键词，每行一个。');
 if(words.length>10)throw new Error('每批最多 10 个不同关键词，请分批生成。');
 if(words.some(word=>word.length>200))throw new Error('每个关键词最多 200 字。');
 return words;
}
export function createGroup(id:number,input:GenerateInput):Group{
 return {id,input,status:'queued',copy:null,copyError:null,images:Array.from({length:input.imageCount},()=>({image:null,error:null}))};
}
export async function runGroup(group:Group,request:(input:AssetRequest)=>Promise<AssetResult>,onUpdate:(group:Group)=>void,signal:AbortSignal):Promise<Group>{
 let current:Group={...group,status:'running',copyError:null,images:group.images.map(image=>({...image,error:null}))};
 const publish=()=>onUpdate({...current,images:current.images.map(image=>({...image}))});
 publish();
 const tasks:(()=>Promise<void>)[]=[];
 if(!current.copy)tasks.push(async()=>{
  try{const result=await request({...current.input,task:'copy',imageIndex:0});if(!result.copy)throw new Error('未返回文案，请重试。');current={...current,copy:result.copy};}
  catch(error){if(!signal.aborted)current={...current,copyError:error instanceof Error?error.message:'文案生成失败，请重试。'};}publish();
 });
 current.images.forEach((image,index)=>{if(!image.image)tasks.push(async()=>{
  try{const result=await request({...current.input,task:'image',imageIndex:index});if(!result.image)throw new Error('未返回图片，请重试。');current.images[index]={image:result.image,error:null};}
  catch(error){if(!signal.aborted)current.images[index]={image:null,error:error instanceof Error?error.message:'图片生成失败，请重试。'};}publish();
 });});
 let next=0;
 const worker=async()=>{while(!signal.aborted){const task=tasks[next++];if(!task)break;await task();}};
 await Promise.all([worker(),worker()]);
 const success=current.images.filter(image=>image.image).length+(current.copy?1:0);
 current={...current,status:success===current.images.length+1?'complete':signal.aborted?'stopped':success>0?'partial':'failed'};
 publish();return current;
}
export function groupText(group:Group):string{
 if(!group.copy)return `${group.input.keyword}\n文案尚未生成`;
 return [group.copy.title,`关键词：${group.input.keyword}`,`城市：${group.input.city}`,...group.copy.copies, ...group.copy.imageCaptions.map((caption,index)=>`图 ${index+1}：${caption}`),group.copy.consultation].join('\n\n');
}
