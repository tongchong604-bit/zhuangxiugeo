'use client';
import { useState } from 'react';
import { Copy, Download, LoaderCircle, RotateCcw, Check, ImagePlus } from 'lucide-react';
import { scenes } from '@/lib/schema';
import { groupText, type Group } from '@/lib/workflow';
const statusLabels={queued:'等待生成',running:'正在生成',complete:'已完成',partial:'部分完成',failed:'生成失败',stopped:'已停止'};
export function GroupCard({group,busy,onRetry,onNotice}:{group:Group;busy:boolean;onRetry:()=>void;onNotice:(message:string)=>void}){
 const [copied,setCopied]=useState('');const [packing,setPacking]=useState(false);
 async function copy(text:string,id:string){try{await navigator.clipboard.writeText(text);setCopied(id);setTimeout(()=>setCopied(''),1800);onNotice('已复制到剪贴板');}catch{onNotice('复制失败，请选中文案手动复制。');}}
 function download(image:string,index:number){const link=document.createElement('a');link.href=image;link.download=`装小果-第${group.id}组-图${index+1}.jpg`;link.click();}
 async function downloadGroup(){setPacking(true);try{
  const {default:JSZip}=await import('jszip');const zip=new JSZip();zip.file('文案.txt',groupText(group));
  group.images.forEach((asset,index)=>{if(asset.image)zip.file(`图${index+1}-${scenes[index]}.jpg`,asset.image.split(',')[1],{base64:true});});
  zip.file('说明.txt',`关键词：${group.input.keyword}\n风格：${group.input.style}\n图片为 AI 设计示意，不代表真实装修案例。\n已生成 ${group.images.filter(i=>i.image).length}/${group.input.imageCount} 张图片。${group.copy?'':'文案尚未生成。'}\n发布前请核实公司资料与文案事实。`);
  const url=URL.createObjectURL(await zip.generateAsync({type:'blob'}));const link=document.createElement('a');link.href=url;link.download=`装小果-第${group.id}组.zip`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
 }catch{onNotice('打包失败，请尝试逐张下载。');}finally{setPacking(false);}}
 const copyButton=(text:string,id:string)=><button type="button" className="icon-button" aria-label={`复制第${group.id}组${id}`} onClick={()=>copy(text,id)}>{copied===id?<Check size={14}/>:<Copy size={14}/>}<span>{copied===id?'已复制':'复制'}</span></button>;
 const successful=!!group.copy||group.images.some(asset=>asset.image);
 return <section className="panel group-panel" aria-label={`第${group.id}组 ${group.input.keyword}`}>
  <div className="group-heading"><div className="group-title"><span className="step">{String(group.id).padStart(2,'0')}</span><div><h2>{group.input.keyword}</h2><p>{group.input.city} · {group.input.style} · {group.input.imageCount} 张图 + 配套文案</p></div></div><span className={`group-status status-${group.status}`}>{group.status==='running'&&<LoaderCircle size={12} className="spin"/>}{statusLabels[group.status]}</span></div>
  <div className="group-content"><div className="image-grid">{group.images.map((asset,index)=><article className="image-tile" key={index}>
   <div className="tile-preview">{asset.image?<><img src={asset.image} alt={`${group.input.style}${scenes[index]} AI 设计示意图`}/><button type="button" onClick={()=>download(asset.image!,index)} aria-label={`下载第${group.id}组第${index+1}张图片`}><Download size={15}/></button></>:<div className="tile-placeholder">{group.status==='running'&&!asset.error?<LoaderCircle size={23} className="spin"/>:<ImagePlus size={23}/>}<span>{asset.error?'未生成':group.status==='running'?'正在创作':group.status==='queued'?'等待生成':'尚未生成'}</span></div>}<span className="tile-label">0{index+1} · {scenes[index]}</span></div>
   {asset.error&&<p className="asset-error" role="status">{asset.error}</p>}
   {group.copy&&<div className="image-caption"><p>{group.copy.imageCaptions[index]}</p>{copyButton(group.copy.imageCaptions[index],`图${index+1}配文`)}</div>}
  </article>)}</div>
  {group.copyError&&<div className="warning-box" role="alert">文案：{group.copyError}</div>}
  {group.copy&&<div className="group-copy"><div className="copy-heading"><span>发布标题</span>{copyButton(group.copy.title,'标题')}</div><h3>{group.copy.title}</h3><div className="copy-heading"><span>发布文案 · 任选一条搭配整组图片</span></div>{group.copy.copies.map((text,index)=><article className="copy-card" key={index}><div><span className="copy-number">0{index+1}</span><b>{['甄选指南','生活与设计','咨询与决策'][index]}</b>{copyButton(text,`文案${index+1}`)}</div><p>{text}</p></article>)}<div className="consultation"><div className="copy-heading"><span>客户咨询引导语</span>{copyButton(group.copy.consultation,'咨询引导语')}</div><p>{group.copy.consultation}</p></div></div>}
  <div className="group-actions">{successful&&<><button className="secondary-button" onClick={()=>copy(groupText(group),'整组文案')}><Copy size={14}/>复制整组文案</button><button className="secondary-button" disabled={packing} onClick={downloadGroup}>{packing?<LoaderCircle size={14} className="spin"/>:<Download size={14}/>}下载整组 ZIP</button></>}{!busy&&group.status!=='complete'&&group.status!=='queued'&&<button className="secondary-button retry-button" onClick={onRetry}><RotateCcw size={14}/>只补生成未完成项</button>}</div>
 </div></section>;
}
