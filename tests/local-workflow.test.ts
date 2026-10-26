import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import JSZip from 'jszip';
import {planBatch,inspectBatch,saveCopy,attachImage,approveGroup,exportBatch,renderBoard} from '../lib/local-workflow';
const copy={title:'苏州装修公司怎么选',copies:['比较服务与需求。','核实施工与合同。','沟通自己的预算。'],imageCaptions:['客厅','餐厅','卧室'],consultation:'可以先整理户型与需求。'};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function setup(){const root=await mkdtemp(join(tmpdir(),'geo-workflow-'));const batch=await planBatch(root,{name:'测试批次',keywords:['苏州装修公司哪家好','苏州装修公司哪家好'],city:'苏州',style:'现代简约',imageCount:3,companyName:'',companyFacts:''});return {root,batch};}
test('planning persists one group per unique keyword and resumes without overwrite',async()=>{
 const {root,batch}=await setup();assert.equal(batch.groups.length,1);
 const before=await readFile(join(root,batch.id,'batch.json'),'utf8');
 await assert.rejects(()=>planBatch(root,{name:batch.id,keywords:['另一个词'],city:'苏州',style:'现代简约',imageCount:3,companyName:'',companyFacts:''}));
 assert.equal(await readFile(join(root,batch.id,'batch.json'),'utf8'),before);
 const status=await inspectBatch(root,batch.id);assert.equal(status.groups[0].status,'awaiting_copy');
 assert.match(await readFile(join(root,batch.id,'01','prompts','01.txt'),'utf8'),/客厅/);
 assert.match(await readFile(join(root,batch.id,'01','prompts','03.txt'),'utf8'),/卧室/);
});
test('validates captions, attachments and safe paths',async()=>{
 const {root,batch}=await setup();
 await assert.rejects(()=>saveCopy(root,batch.id,'01',{...copy,imageCaptions:['a']}));
 await assert.rejects(()=>inspectBatch(root,'../escape'));
 const bad=join(root,'invalid.png');await writeFile(bad,'not an image');
 await assert.rejects(()=>attachImage(root,batch.id,'01',1,bad));
 await assert.rejects(()=>attachImage(root,batch.id,'01',4,bad));
});
test('review is required, review becomes stale after changes, and ZIP contains real files',async()=>{
 const {root,batch}=await setup();await saveCopy(root,batch.id,'01',copy);
 assert.equal((await inspectBatch(root,batch.id)).groups[0].status,'awaiting_images');
 await assert.rejects(()=>approveGroup(root,batch.id,'01','checked'));
 const image=join(root,'fixture.png');await writeFile(image,png);
 for(let i=1;i<=3;i++)await attachImage(root,batch.id,'01',i,image);
 assert.equal((await inspectBatch(root,batch.id)).groups[0].status,'awaiting_review');
 await assert.rejects(()=>exportBatch(root,batch.id));
 await approveGroup(root,batch.id,'01','已逐项检查文案和图片，图片为设计示意。');
 assert.equal((await inspectBatch(root,batch.id)).groups[0].status,'ready');
 const paths=await exportBatch(root,batch.id);assert.equal(paths.length,1);
 const zip=await JSZip.loadAsync(await readFile(paths[0]));assert.equal(Object.keys(zip.files).filter(name=>name.endsWith('.png')).length,3);assert.match(await zip.file('发布文案.md')!.async('string'),/苏州/);
 await saveCopy(root,batch.id,'01',{...copy,title:'修改后的标题'});
 assert.equal((await inspectBatch(root,batch.id)).groups[0].status,'awaiting_review');
 await assert.rejects(()=>exportBatch(root,batch.id));
});
test('board escapes user content and identifies placeholders without faking readiness',async()=>{
 const root=await mkdtemp(join(tmpdir(),'geo-workflow-'));const batch=await planBatch(root,{name:'board',keywords:['<script>alert(1)</script>'],city:'苏州',style:'现代简约',imageCount:3,companyName:'',companyFacts:''});
 const path=await renderBoard(root,batch.id);const html=await readFile(path,'utf8');
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>alert(1)</script>'));assert.match(html,/等待文案/);assert.match(html,/尚未生成/);
});
test('editing the actual brief blocks old approval and export',async()=>{
 const {root,batch}=await setup();await saveCopy(root,batch.id,'01',copy);
 const image=join(root,'fixture.png');await writeFile(image,png);
 for(let i=1;i<=3;i++)await attachImage(root,batch.id,'01',i,image);
 await approveGroup(root,batch.id,'01','checked');
 const brief=join(root,batch.id,'01','brief.json');const changed=JSON.parse(await readFile(brief,'utf8'));changed.keyword='另一个关键词';await writeFile(brief,JSON.stringify(changed));
 await assert.rejects(()=>exportBatch(root,batch.id),/需求|brief/);
});
