'use client';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, ChevronRight, Copy, House, Layers3, Leaf, LoaderCircle, MapPin, Sparkles, Square, WandSparkles } from 'lucide-react';
import { styles, usages, inputSchema, type AssetRequest, type AssetResult } from '@/lib/schema';
import { createGroup, groupText, parseKeywords, runGroup, type Group } from '@/lib/workflow';
import { GroupCard } from '@/components/group-card';
export default function Home(){
 const [keywords,setKeywords]=useState('苏州装修公司哪家好');const [city,setCity]=useState('苏州');
 const [style,setStyle]=useState<(typeof styles)[number]>('现代简约');const [usage,setUsage]=useState<(typeof usages)[number]>('小红书配图');
 const [imageCount,setImageCount]=useState<3|4>(4);const [companyName,setCompanyName]=useState('');const [companyFacts,setCompanyFacts]=useState('');
 const [groups,setGroups]=useState<Group[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const controller=useRef<AbortController|null>(null);const running=useRef(false);
 let words:string[]=[];let keywordError='';try{words=parseKeywords(keywords);}catch(e){keywordError=e instanceof Error?e.message:'';}
 const totalTasks=groups.reduce((count,group)=>count+group.input.imageCount+1,0);
 const completedTasks=groups.reduce((count,group)=>count+group.images.filter(asset=>asset.image).length+(group.copy?1:0),0);
 const update=(group:Group)=>setGroups(current=>current.map(item=>item.id===group.id?group:item));
 async function execute(queue:Group[],reset:boolean){
  if(running.current)return;running.current=true;setBusy(true);setError('');setNotice('');
  const abort=new AbortController();controller.current=abort;if(reset)setGroups(queue);
  const request=async(input:AssetRequest):Promise<AssetResult>=>{
   const response=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:abort.signal});
   const data=await response.json();
   if(!response.ok){if(response.status===503){setError(data.error);abort.abort();}throw new Error(data.error||'暂时无法生成，请重试。');}
   return data;
  };
  try{for(const group of queue){if(abort.signal.aborted)break;await runGroup(group,request,update,abort.signal);}}
  catch{setError('任务中断，已保留完成的内容，可以补生成未完成项。');}
  finally{setBusy(false);running.current=false;controller.current=null;}
 }
 function generate(event:FormEvent){event.preventDefault();
  try{const list=parseKeywords(keywords);const next=list.map((keyword,index)=>createGroup(index+1,inputSchema.parse({keyword,city,style,usage,imageCount,companyName,companyFacts})));void execute(next,true);}
  catch(e){setError(e instanceof Error?e.message:'请检查填写内容。');}
 }
 function stop(){controller.current?.abort();setNotice('已停止后续生成，成功内容已保留。已发送的服务端请求可能仍产生费用。');}
 async function copyAll(){try{await navigator.clipboard.writeText(groups.filter(group=>group.copy).map(groupText).join('\n\n————————————\n\n'));setNotice('全部已生成文案已复制');}catch{setNotice('复制失败，请按组复制或下载 ZIP。');}}
 return <div className="app-shell">
  <aside className="sidebar"><a className="brand" href="/"><span className="brand-icon"><House size={23}/></span><span>装小果 <b>AI</b></span></a><div className="workspace-label">装修营销工作流</div><a href="#workspace" className="nav-active"><Layers3 size={18}/>GEO 批量图文<ChevronRight size={15}/></a><div className="sidebar-note"><Leaf size={25}/><strong>一个关键词，一组好内容</strong><p>苏州装修甄选 · 图文配套<br/>让专业内容，帮客户做选择</p><span>CONTENT FOR BETTER HOMES</span></div><div className="sidebar-footer"><span className="status-dot"/>装修人的内容生产工作台</div></aside>
  <div className="main-shell"><header className="topbar"><span>工作台 <ChevronRight size={13}/> <b>装修 GEO 图文工作流</b></span><span className="top-tag"><Sparkles size={13}/>关键词 → 图片 + 文案</span></header>
   <main id="workspace"><section className="intro"><div><div className="eyebrow"><span/>为苏州装修营销，搭好内容工作流</div><h1>一批关键词，<span>成组出图文。</span></h1><p>每个关键词生成 3–4 张图片和配套文案，从甄选问题到一组可发布素材。</p></div><span className="intro-mark"><WandSparkles size={35}/></span></section>
    <div className="workflow-steps"><span><b>01</b>输入一批关键词</span><ChevronRight size={14}/><span><b>02</b>逐组生成图片与文案</span><ChevronRight size={14}/><span><b>03</b>检查内容，整组下载</span></div>
    <div className="editor-grid batch-grid"><section className="panel input-panel"><div className="panel-heading"><span className="step">01</span><div><h2>设置这一批内容</h2><p>同一套风格，每个关键词独立成组</p></div></div>
     <form onSubmit={generate}><fieldset disabled={busy}><label htmlFor="keywords">装修关键词 <em>*</em><span className="label-meta">每行一个 · 最多 10 组</span></label><textarea id="keywords" placeholder={'苏州装修公司哪家好\n苏州靠谱装修公司怎么选\n苏州旧房翻新注意事项'} value={keywords} onChange={e=>setKeywords(e.target.value)} maxLength={2200} required rows={5}/><div className="suggestions"><button type="button" onClick={()=>setKeywords('苏州装修公司哪家好\n苏州靠谱装修公司怎么选\n苏州旧房翻新注意事项')}>填入苏州装修示例词</button><span>{words.length?`已识别 ${words.length} 个不同关键词`:keywordError}</span></div>
      <label htmlFor="city">目标城市 <em>*</em></label><div className="city-input"><MapPin size={17}/><input id="city" value={city} onChange={e=>setCity(e.target.value)} maxLength={40} required/></div>
      <label id="count-label">每组生成几张图？</label><div className="count-options" role="group" aria-labelledby="count-label">{([3,4] as const).map(count=><button key={count} type="button" aria-pressed={imageCount===count} className={imageCount===count?'count-choice selected':'count-choice'} onClick={()=>setImageCount(count)}><Layers3 size={17}/><strong>{count} 张图</strong><span>{count===3?'客厅 · 餐厅 · 卧室':'再加一张厨房'}</span>{imageCount===count&&<Check size={14}/>}</button>)}</div>
      <label id="style-label">整组装修风格</label><div className="style-options" role="group" aria-labelledby="style-label">{styles.map((item,index)=><button type="button" aria-pressed={style===item} className={style===item?'style-choice selected':'style-choice'} key={item} onClick={()=>setStyle(item)}><span className={`swatch swatch-${index}`}/>{item}{style===item&&<Check size={13}/>}</button>)}</div>
      <label htmlFor="usage">图片用途</label><select id="usage" value={usage} onChange={e=>setUsage(e.target.value as typeof usage)}>{usages.map(item=><option key={item}>{item}</option>)}</select><p className="field-hint">{usage==='小红书配图'?'竖版 2:3':usage==='网站横幅'?'横版 3:2':'方形 1:1'} · 图片不嵌文字，配文单独提供，方便修改</p>
      <details className="company-details"><summary>添加要推广的公司资料 <span>选填</span></summary><label htmlFor="company">公司名称</label><input id="company" value={companyName} onChange={e=>setCompanyName(e.target.value)} maxLength={80} placeholder="填写真实公司名称"/><label htmlFor="facts">可以引用的真实资料</label><textarea id="facts" value={companyFacts} onChange={e=>setCompanyFacts(e.target.value)} rows={4} maxLength={2000} placeholder="服务区域、设计服务、可核实的优势等。不要填写客户隐私。"/><p className="field-hint">未填写时生成装修公司甄选指南，不编造推荐榜单。</p></details>
      <button className="generate-button" disabled={busy||!words.length||!city.trim()} type="submit">{busy?<LoaderCircle size={18} className="spin"/>:<Sparkles size={18}/>} {busy?'正在逐组生成…':`生成 ${words.length||0} 组图文`}{!busy&&<ArrowUpRight size={18}/>}</button><p className="generation-note">本批共 {words.length*imageCount} 张图 + {words.length} 套文案 · 真实生成将消耗 API 额度</p>
     </fieldset></form>{busy&&<button className="stop-button" onClick={stop}><Square size={12}/>停止后续生成</button>}</section>
     <div className="results-column"><div className="results-toolbar"><div><h2>图文素材组 <span>{groups.length?`${groups.filter(group=>group.status==='complete').length} / ${groups.length}`:'等待创作'}</span></h2><p>每组独立预览、复制、下载，失败项可以单独补齐。</p></div>{groups.some(group=>group.copy)&&<button className="secondary-button" onClick={copyAll}><Copy size={13}/>复制全部文案</button>}</div>
      {error&&<div className="error-box batch-error" role="alert">{error}</div>}
      {groups.length>0&&<div className="batch-progress" role="status"><div><span>{busy?'正在制作你的素材组':groups.every(group=>group.status==='complete')?'本批图文已全部完成':'已保留生成结果，可继续补齐未完成项'}</span><b>{completedTasks} / {totalTasks} 项已完成</b></div><progress value={completedTasks} max={totalTasks}/>{!busy&&groups.some(group=>group.status!=='complete')&&<button className="resume-button" onClick={()=>void execute(groups.filter(group=>group.status!=='complete'),false)}>继续所有未完成项</button>}</div>}
      {!groups.length&&<section className="panel result-panel"><div className="empty-preview"><div className="sample-image"><img src="/room.svg" alt="装修空间插画，非生成结果"/><span className="sample-tag">风格示意 · 非生成结果</span><div className="sample-caption"><span>SUZHOU · HOME & LIVING</span><h3>苏州装修公司，怎么选才合适？</h3></div></div><div className="sample-stack"><span>01 客厅</span><span>02 餐厅</span><span>03 卧室</span><span>04 厨房</span></div><div className="empty-message"><span className="empty-icon"><Layers3 size={22}/></span><h3>不用一张张做，也不用一条条写</h3><p>把关键词放进左侧，一次生成多组装修图文素材</p><div className="output-tags"><span>3–4 张图 / 组</span><span>逐图配文</span><span>标题 + 3 条文案</span><span>整组 ZIP 下载</span></div></div></div></section>}
      {groups.map(group=><GroupCard key={group.id} group={group} busy={busy} onRetry={()=>void execute([group],false)} onNotice={setNotice}/>)}
     </div></div><div aria-live="polite" className="copy-notice">{notice}</div><footer className="page-footer"><Leaf size={14}/><span>发布前请核实公司资料。图片为 AI 设计示意；GEO 内容不保证排名或 AI 推荐。结果仅保留在本页，刷新前请下载。</span></footer>
   </main>
  </div>
 </div>;
}
