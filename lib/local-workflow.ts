/** File-based Codex workflow. No model, network, credentials or browser service calls. */
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,readdir,unlink} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import JSZip from 'jszip';
import {z} from 'zod';
import {inputSchema,marketingSchema,scenes,type GenerateInput,type MarketingCopy} from './schema';
const batchSchema=z.object({version:z.literal(1),id:z.string(),createdAt:z.string(),groups:z.array(z.object({id:z.string(),input:inputSchema}))});
export type LocalBatch=z.infer<typeof batchSchema>;
type PlanInput={name:string;keywords:string[];city:string;style:GenerateInput['style'];imageCount:3|4;companyName:string;companyFacts:string};
export type LocalStatus='awaiting_copy'|'awaiting_images'|'awaiting_review'|'ready';
export type LocalGroup={id:string;input:GenerateInput;copy:MarketingCopy|null;images:(string|null)[];status:LocalStatus;reviewNote:string|null};
const statusLabels:Record<LocalStatus,string>={awaiting_copy:'等待文案',awaiting_images:'等待图片',awaiting_review:'等待审核',ready:'审核通过'};
function identifier(value:string){if(!/^[\p{L}\p{N}_-]{1,80}$/u.test(value))throw new Error('批次或组编号无效，请只使用文字、数字、短横线或下划线。');return value;}
function folder(root:string,batchId:string,groupId?:string){return join(resolve(root),identifier(batchId),...(groupId?[identifier(groupId)]:[]));}
async function json(path:string){return JSON.parse(await readFile(path,'utf8'));}
async function writeJson(path:string,data:unknown){const temp=`${path}.${process.pid}.tmp`;await writeFile(temp,JSON.stringify(data,null,2)+'\n');await rename(temp,path);}
async function optionalJson(path:string){try{return await json(path);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}}
async function load(root:string,batchId:string){const batch=batchSchema.parse(await json(join(folder(root,batchId),'batch.json')));if(batch.id!==batchId)throw new Error('批次编号不一致。');return batch;}
async function groupInfo(root:string,batchId:string,groupId:string){const batch=await load(root,batchId);const group=batch.groups.find(g=>g.id===identifier(groupId));if(!group)throw new Error('找不到素材组。');return group;}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));}
export async function planBatch(root:string,options:PlanInput):Promise<LocalBatch>{
 const id=identifier(options.name);const keywords=[...new Set(options.keywords.map(word=>word.trim()).filter(Boolean))];
 if(!keywords.length||keywords.length>10)throw new Error('请提供 1–10 个不同关键词。');
 const groups=keywords.map((keyword,index)=>({id:String(index+1).padStart(2,'0'),input:inputSchema.parse({...options,keyword,usage:'小红书配图'})}));
 const batch:LocalBatch={version:1,id,createdAt:new Date().toISOString(),groups};
 await mkdir(resolve(root),{recursive:true});const batchDir=folder(root,id);
 try{await mkdir(batchDir);}catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')throw new Error('同名批次已存在，请先查看进度或选择新批次名；不会覆盖已有成果。');throw error;}
 await writeJson(join(batchDir,'batch.json'),batch);
 for(const group of groups){const dir=folder(root,id,group.id);await mkdir(join(dir,'images'),{recursive:true});await mkdir(join(dir,'prompts'));
  await writeJson(join(dir,'brief.json'),group.input);
  for(let i=0;i<group.input.imageCount;i++)await writeFile(join(dir,'prompts',`${String(i+1).padStart(2,'0')}.txt`),imagePrompt(group.input,i));
  await writeFile(join(dir,'文案任务.md'),`# ${group.input.keyword}\n\n请先读取项目 AGENTS.md、workflow/roles/writer.md 和本组 brief.json。\n\n输出 ${group.input.imageCount} 条逐图配文、标题、3 条发布文案、咨询引导语，保存为 copy.json。使用模板 workflow/templates/copy.example.json。不要编造公司推荐、排名、口碑或真实案例。完成后通过 workflow copy 命令校验写入。\n`);
 }
 await renderBoard(root,id);return batch;
}
function imagePrompt(input:GenerateInput,index:number){return `为中文装修图文内容创作一张独立的高品质室内设计效果图。\n关键词：${input.keyword}\n城市：${input.city}\n风格：${input.style}\n场景：${scenes[index]}；本组第 ${index+1}/${input.imageCount} 张。\n整组采用统一的材质、色调和自然光，但每张聚焦对应的不同空间，不重复同一客厅。竖版约 2:3，真实可居住尺度，专业室内摄影构图，留出适量视觉留白。\n不要文字、品牌标志、水印、排名、公司资质、对比拼图或电话。该图为 AI 设计示意，不代表真实完工案例，不要求复刻真实苏州建筑。\n配套图片仅用于插画式说明设计，不能当作某家公司优劣的证据。\n`;}
function imageExtension(bytes:Buffer):'png'|'jpg'|'webp'{
 if(bytes.length<32)throw new Error('图片为空或格式无效。');
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpg';
 if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'webp';
 throw new Error('只接受真实 PNG、JPEG 或 WebP 图片文件，不能用文字或 SVG 占位。');
}
async function imagePaths(dir:string,count:number){const names=await readdir(join(dir,'images'));return Array.from({length:count},(_,index)=>{
 const matches=names.filter(name=>new RegExp(`^${String(index+1).padStart(2,'0')}\\.(png|jpg|webp)$`).test(name));
 if(matches.length>1)throw new Error('同一图片槽位存在多个文件，请先整理。');return matches[0]?join(dir,'images',matches[0]):null;
});}
async function fingerprint(dir:string,input:GenerateInput,copy:MarketingCopy,images:(string|null)[]){
 const hash=createHash('sha256').update(JSON.stringify(input)).update(JSON.stringify(copy));
 for(const path of images){if(!path)throw new Error('图片未齐全。');const bytes=await readFile(path);imageExtension(bytes);hash.update(bytes);}return hash.digest('hex');
}
export async function inspectBatch(root:string,batchId:string):Promise<{batch:LocalBatch;groups:LocalGroup[]}>{
 const batch=await load(root,batchId);const groups:LocalGroup[]=[];
 for(const group of batch.groups){const dir=folder(root,batchId,group.id);
  const brief=inputSchema.parse(await json(join(dir,'brief.json')));
  if(JSON.stringify(brief)!==JSON.stringify(group.input))throw new Error('brief.json 需求与批次快照不一致，请保留成果并新建批次；旧审核不能用于新需求。');
  const raw=await optionalJson(join(dir,'copy.json'));const copy=raw?marketingSchema.parse(raw):null;
  if(copy&&copy.imageCaptions.length!==group.input.imageCount)throw new Error('逐图配文数量与图片数量不一致。');
  const images=await imagePaths(dir,group.input.imageCount);for(const image of images)if(image)imageExtension(await readFile(image));
  const review=await optionalJson(join(dir,'review.json'));let status:LocalStatus=!copy?'awaiting_copy':images.some(image=>!image)?'awaiting_images':'awaiting_review';
  if(copy&&images.every(Boolean)&&review?.fingerprint===await fingerprint(dir,group.input,copy,images)&&typeof review.note==='string'&&review.note.trim())status='ready';
  groups.push({...group,copy,images,status,reviewNote:status==='ready'?review.note:null});
 }
 return {batch,groups};
}
export async function saveCopy(root:string,batchId:string,groupId:string,raw:unknown){
 const group=await groupInfo(root,batchId,groupId);const copy=marketingSchema.parse(raw);
 if(copy.imageCaptions.length!==group.input.imageCount)throw new Error(`需要 ${group.input.imageCount} 条逐图配文。`);
 await writeJson(join(folder(root,batchId,groupId),'copy.json'),copy);await renderBoard(root,batchId);
}
export async function attachImage(root:string,batchId:string,groupId:string,index:number,source:string,replace=false){
 const group=await groupInfo(root,batchId,groupId);if(!Number.isInteger(index)||index<1||index>group.input.imageCount)throw new Error('图片序号超出范围。');
 const bytes=await readFile(source);const ext=imageExtension(bytes);const dir=folder(root,batchId,groupId);const existing=(await imagePaths(dir,group.input.imageCount))[index-1];
 if(existing){const same=(await readFile(existing)).equals(bytes);if(same)return existing;if(!replace)throw new Error('该图片已存在；如确需替换，请显式使用 --replace。');}
 const target=join(dir,'images',`${String(index).padStart(2,'0')}.${ext}`);await writeFile(target,bytes);if(existing&&existing!==target)await unlink(existing);
 await renderBoard(root,batchId);return target;
}
export async function approveGroup(root:string,batchId:string,groupId:string,note:string){
 const state=await inspectBatch(root,batchId);const group=state.groups.find(g=>g.id===groupId);if(!group?.copy||group.images.some(image=>!image))throw new Error('文案或图片尚未齐全，不能审核通过。');
 if(!note.trim())throw new Error('请填写实际审核结论。');const dir=folder(root,batchId,groupId);
 await writeJson(join(dir,'review.json'),{reviewedAt:new Date().toISOString(),note,fingerprint:await fingerprint(dir,group.input,group.copy,group.images)});
 await renderBoard(root,batchId);
}
function publication(group:LocalGroup){const copy=group.copy!;return `# ${copy.title}\n\n关键词：${group.input.keyword}\n\n## 发布文案（任选一条）\n\n${copy.copies.map((text,index)=>`### 版本 ${index+1}\n\n${text}`).join('\n\n')}\n\n## 逐图配文\n\n${copy.imageCaptions.map((text,index)=>`### 图 ${index+1} · ${scenes[index]}\n\n${text}`).join('\n\n')}\n\n## 咨询引导\n\n${copy.consultation}\n\n---\n图片为 AI 设计示意，不代表真实完工案例。公司资料发布前请核实。\n`;}
export async function exportBatch(root:string,batchId:string){
 const state=await inspectBatch(root,batchId);if(state.groups.some(group=>group.status!=='ready'))throw new Error('批次仍有未完成或待重新审核的组，不能标为完成或导出成品。');
 const dir=join(folder(root,batchId),'exports');await mkdir(dir,{recursive:true});const paths:string[]=[];
 for(const group of state.groups){const zip=new JSZip();const markdown=publication(group);zip.file('发布文案.md',markdown);zip.file('文案.json',JSON.stringify(group.copy,null,2));
  for(let index=0;index<group.images.length;index++){const path=group.images[index]!;zip.file(`图${index+1}.${path.split('.').pop()}`,await readFile(path));}
  zip.file('审核说明.txt',`${group.reviewNote}\n图片为 AI 设计示意，GEO 不保证 AI 推荐或排名。`);
  const path=join(dir,`第${group.id}组.zip`);await writeFile(path,await zip.generateAsync({type:'nodebuffer'}));await writeFile(join(folder(root,batchId,group.id),'发布文案.md'),markdown);paths.push(path);
 }
 await renderBoard(root,batchId);return paths;
}
export async function renderBoard(root:string,batchId:string){
 const {batch,groups}=await inspectBatch(root,batchId);const batchDir=folder(root,batchId);
 const cards=groups.map(group=>`<article><div class="heading"><h2>${escapeHtml(group.input.keyword)}</h2><span>${statusLabels[group.status]}</span></div><p>${escapeHtml(group.input.city)} · ${escapeHtml(group.input.style)} · ${group.input.imageCount} 张图</p><div class="images">${group.images.map((path,index)=>`<figure>${path?`<img src="${escapeHtml(relative(batchDir,path).split('\\').join('/'))}" alt="AI 设计示意 · ${scenes[index]}">`:'<div class="placeholder">尚未生成</div>'}<figcaption>图 ${index+1} · ${scenes[index]}${group.copy?`<p>${escapeHtml(group.copy.imageCaptions[index])}</p>`:''}</figcaption></figure>`).join('')}</div>${group.copy?`<h3>${escapeHtml(group.copy.title)}</h3>${group.copy.copies.map((text,index)=>`<section><b>文案 ${index+1}</b><p>${escapeHtml(text)}</p></section>`).join('')}<section><b>咨询引导语</b><p>${escapeHtml(group.copy.consultation)}</p></section>`:'<section>等待文案任务完成</section>'}${group.status==='ready'?`<p class="review">${escapeHtml(group.reviewNote!)}</p>`:''}</article>`).join('');
 const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>装小果 AI · ${escapeHtml(batch.id)}</title><style>*{box-sizing:border-box}body{margin:0;background:#f4f7f0;color:#294637;font:15px/1.9 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:35px 22px}h1{font-size:30px}header p{color:#7f8d73}article{background:white;padding:26px;border:1px solid #e1e8d9;border-radius:16px;margin:24px 0}.heading{display:flex;justify-content:space-between;gap:15px;align-items:center}h2{font-size:20px;overflow-wrap:anywhere}.heading span{font-size:12px;white-space:nowrap;background:#edf3e5;padding:5px 10px;border-radius:7px}.images{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}figure{margin:0}img,.placeholder{width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:10px;background:#edf2e4}.placeholder{display:grid;place-items:center;color:#97a486}figcaption{font-size:12px;color:#849175}section{padding:15px;margin:12px 0;background:#f7f9f2;border-radius:8px}section p{white-space:pre-wrap}a{color:#285d3b}.review{font-size:12px;color:#7b8d6b}@media(max-width:650px){.images{grid-template-columns:repeat(2,minmax(0,1fr))}article{padding:15px}.heading{align-items:start}h2{font-size:16px}}@media print{article{break-inside:avoid}}</style><main><header><small>装小果 AI · Codex 文件工作流</small><h1>一批关键词，成组出图文。</h1><p>批次 ${escapeHtml(batch.id)} · ${groups.filter(group=>group.status==='ready').length}/${groups.length} 组审核通过 · 此页为本地静态看板，重新运行 board 命令刷新。</p><p>图片为 AI 设计示意；没有密钥输入框，不自动调用付费 API。刷新页面不会丢失已保存到磁盘的文件。</p></header>${cards}<footer>发布前核实公司信息；不编造推荐榜单，不承诺 AI 推荐或排名。</footer></main></html>`;
 const path=join(batchDir,'index.html');await writeFile(path,html);return path;
}
