import {readFile,mkdir,copyFile,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {planBatch,inspectBatch,saveCopy,attachImage,approveGroup,exportBatch,renderBoard} from '../lib/local-workflow';
const args=process.argv.slice(2);const command=args.shift();
function option(name:string,fallback=''){const index=args.indexOf(`--${name}`);return index<0?fallback:args[index+1]||'';}
function required(name:string){const value=option(name);if(!value||value.startsWith('--'))throw new Error(`缺少 --${name}`);return value;}
const root=resolve(option('workspace','content-workspace'));
async function main(){
 if(command==='init'){
  await mkdir(root,{recursive:true});const target=join(root,'company.json');
  try{await access(target);console.log(`公司资料已存在，保留不覆盖：${target}`);}catch{await copyFile(resolve('workflow/templates/company.example.json'),target);console.log(`已创建公司资料：${target}`);}
  console.log('不需要 OPENAI_API_KEY。把关键词发给 Codex，由项目 AGENTS.md 引导任务执行。');return;
 }
 if(command==='plan'){
  const raw=await readFile(resolve(required('keywords')),'utf8');let profile={city:'苏州',companyName:'',companyFacts:''};
  try{profile={...profile,...JSON.parse(await readFile(join(root,'company.json'),'utf8'))};}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  const count=Number(option('count','3'));if(count!==3&&count!==4)throw new Error('--count 只能为 3 或 4');
  const batch=await planBatch(root,{...profile,name:option('name',new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14)),keywords:raw.split(/\r?\n/),city:option('city',profile.city),style:option('style','现代简约') as '现代简约',imageCount:count});
  console.log(`已建立批次 ${batch.id}，共 ${batch.groups.length} 组，每组 ${count} 张。\n下一步读取各组 brief.json 和 文案任务.md。\n看板：${join(root,batch.id,'index.html')}`);return;
 }
 const commands=['status','copy','attach','review','export','board'];
 if(!command||!commands.includes(command)){
  console.log(`装小果 AI · Codex 文件工作流（无 API 调用）\n\n初始化：npm run workflow -- init\n建任务：npm run workflow -- plan --keywords workflow/templates/keywords.example.txt --name suzhou-demo --count 3\n看进度：npm run workflow -- status --batch suzhou-demo\n存文案：npm run workflow -- copy --batch suzhou-demo --group 01 --file /path/copy.json\n存图片：npm run workflow -- attach --batch suzhou-demo --group 01 --index 1 --file /path/image.png\n审核后：npm run workflow -- review --batch suzhou-demo --group 01 --note '实际审核结论'\n导出：npm run workflow -- export --batch suzhou-demo\n刷新看板：npm run workflow -- board --batch suzhou-demo\n\n默认输出 content-workspace/（已被 Git 忽略）。可使用 --workspace 指定输出目录。`);return;
 }
 const batch=required('batch');
 if(command==='status'){const state=await inspectBatch(root,batch);console.log(JSON.stringify(state.groups.map(group=>({group:group.id,keyword:group.input.keyword,status:group.status,copy:!!group.copy,images:`${group.images.filter(Boolean).length}/${group.input.imageCount}`})),null,2));}
 if(command==='copy'){await saveCopy(root,batch,required('group'),JSON.parse(await readFile(resolve(required('file')),'utf8')));console.log('文案已校验并保存；修改文案后需要重新审核。');}
 if(command==='attach'){console.log(await attachImage(root,batch,required('group'),Number(required('index')),resolve(required('file')),args.includes('--replace')));}
 if(command==='review'){await approveGroup(root,batch,required('group'),required('note'));console.log('已记录审核结论和文件指纹；修改素材后自动回到待审核。');}
 if(command==='export')console.log((await exportBatch(root,batch)).join('\n'));
 if(command==='board')console.log(await renderBoard(root,batch));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'操作失败');process.exitCode=1;});
