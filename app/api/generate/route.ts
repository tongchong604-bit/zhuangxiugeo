import { NextResponse } from 'next/server';
import { requestSchema } from '@/lib/schema';
import { generateAsset } from '@/lib/generate';
import { createGenerators } from '@/lib/openai';
export const runtime='nodejs';
export const maxDuration=180;
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 const origin=request.headers.get('origin');
 const host=request.headers.get('host');
 if(origin&&origin!==`https://${host}`&&origin!==`http://${host}`){
  return NextResponse.json({error:'不允许跨站生成请求。'},{status:403,headers});
 }
 let raw:unknown;
 try{
  // Bound actual streamed bytes, rather than trusting Content-Length.
  const reader=request.body?.getReader();
  if(!reader)return NextResponse.json({error:'请求内容不能为空。'},{status:400,headers});
  const chunks:Uint8Array[]=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;
   if(length>8192){await reader.cancel();return NextResponse.json({error:'输入内容过长。'},{status:413,headers});}chunks.push(value);}
  raw=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 }catch{return NextResponse.json({error:'请求格式无效，请重新提交。'},{status:400,headers});}
 const parsed=requestSchema.safeParse(raw);
 if(!parsed.success)return NextResponse.json({error:'请填写有效的关键词、城市、装修风格、图片数量与图片用途。'},{status:400,headers});
 if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'尚未配置 AI 服务。请在服务端设置 OPENAI_API_KEY 后重新启动或部署。'},{status:503,headers});
 try{return NextResponse.json(await generateAsset(parsed.data,createGenerators(request.signal)),{headers});}
 catch{return NextResponse.json({error:'生成失败，请检查服务端模型权限、账户额度或稍后重试。'},{status:502,headers});}
}
