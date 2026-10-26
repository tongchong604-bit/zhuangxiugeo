import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inputSchema, requestSchema, marketingSchema, type GenerateInput } from '../lib/schema';
import { generateAsset } from '../lib/generate';
import { parseKeywords, createGroup, runGroup } from '../lib/workflow';
const input = inputSchema.parse({ keyword: '苏州装修公司哪家好', city: '苏州', style: '现代简约', usage: '小红书配图',imageCount:4 });
const copy = { title: '苏州装修公司怎么选', copies: ['第一条文案', '第二条文案', '第三条文案'], consultation: '私信了解方案',imageCaptions:['客厅配文','餐厅配文','卧室配文','厨房配文'] };
test('validates keyword and supports exactly 3 or 4 images', () => {
 assert.equal(inputSchema.safeParse({...input,keyword:' '}).success,false);
 assert.equal(inputSchema.safeParse({...input,imageCount:2}).success,false);
 assert.equal(inputSchema.safeParse({...input,imageCount:3}).success,true);
 assert.equal(inputSchema.safeParse({...input,companyFacts:'字'.repeat(2001)}).success,false);
 assert.equal(requestSchema.safeParse({...input,imageCount:3,task:'image',imageIndex:3}).success,false);
});
test('parses a keyword per line, deduplicates, and rejects excess instead of dropping it',()=>{
 assert.deepEqual(parseKeywords(' 苏州装修公司哪家好\n\n苏州旧房翻新\n苏州装修公司哪家好 '),['苏州装修公司哪家好','苏州旧房翻新']);
 assert.throws(()=>parseKeywords(Array.from({length:11},(_,i)=>`词${i}`).join('\n')),/10/);
 assert.throws(()=>parseKeywords('字'.repeat(201)),/200/);
});
test('requires image captions and exactly three marketing copies', () => {
 assert.equal(marketingSchema.safeParse(copy).success,true);
 assert.equal(marketingSchema.safeParse({...copy,copies:['a']}).success,false);
 assert.equal(marketingSchema.safeParse({...copy,imageCaptions:['a']}).success,false);
});
test('generates only requested asset, retaining image slot',async()=>{
 let textCalls=0;const slots:number[]=[];
 const generators={text:async()=>{textCalls++;return copy;},image:async(_:GenerateInput,index:number)=>{slots.push(index);return 'aGVsbG8=';}};
 const image=await generateAsset({...input,task:'image',imageIndex:2},generators);
 assert.deepEqual(image,{image:'data:image/jpeg;base64,aGVsbG8='});assert.equal(textCalls,0);assert.deepEqual(slots,[2]);
 const text=await generateAsset({...input,task:'copy',imageIndex:0},generators);assert.deepEqual(text,{copy});
});
test('rejects mismatched captions and oversized images without leaking provider errors',async()=>{
 const generators={text:async()=>({...copy,imageCaptions:['a','b','c']}),image:async()=> 'a'.repeat(4_000_001)};
 await assert.rejects(()=>generateAsset({...input,task:'copy',imageIndex:0},generators),/生成失败/);
 await assert.rejects(()=>generateAsset({...input,task:'image',imageIndex:0},generators),/生成失败/);
 await assert.rejects(()=>generateAsset({...input,task:'image',imageIndex:0},{text:async()=>copy,image:async()=>{throw new Error('secret-detail')}}),e=>e instanceof Error&&!e.message.includes('secret-detail'));
});
test('workflow assembles four images and copy with bounded concurrency',async()=>{
 let active=0,max=0;const updates:string[]=[];
 const result=await runGroup(createGroup(1,input),async request=>{
  active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,3));active--;
  return request.task==='copy'?{copy}:{image:`data:image/jpeg;base64,slot${request.imageIndex}`};
 },group=>updates.push(group.status),new AbortController().signal);
 assert.equal(result.status,'complete');assert.equal(result.images.filter(i=>i.image).length,4);assert.ok(max<=2);assert.ok(updates.includes('running'));
});
test('workflow retries only failed assets and retains earlier successes',async()=>{
 const first=await runGroup(createGroup(1,input),async request=>{
  if(request.task==='image'&&request.imageIndex===1)throw new Error('暂时失败');
  return request.task==='copy'?{copy}:{image:`image-${request.imageIndex}`};
 },()=>{},new AbortController().signal);
 assert.equal(first.status,'partial');assert.equal(first.images[1].error,'暂时失败');
 const called:number[]=[];
 const second=await runGroup(first,async request=>{assert.equal(request.task,'image');called.push(request.imageIndex);return {image:'retried'};},()=>{},new AbortController().signal);
 assert.deepEqual(called,[1]);assert.equal(second.status,'complete');assert.equal(second.images[0].image,'image-0');assert.deepEqual(second.copy,copy);
});
test('aborted workflow does not start paid tasks',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 const result=await runGroup(createGroup(1,{...input,imageCount:3}),async()=>{calls++;throw new Error('unexpected');},()=>{},controller.signal);
 assert.equal(calls,0);assert.equal(result.status,'stopped');
});
