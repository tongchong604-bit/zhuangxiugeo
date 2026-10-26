import OpenAI from 'openai';
if(!process.env.OPENAI_API_KEY){console.error('请先在 .env.local 配置 OPENAI_API_KEY。');process.exit(1);}
const client=new OpenAI({timeout:20000,maxRetries:0});
let failed=false;
for(const model of [process.env.OPENAI_TEXT_MODEL||'gpt-4.1-mini',process.env.OPENAI_IMAGE_MODEL||'gpt-image-2.5-sunburst']){
 try{await client.models.retrieve(model);console.log(`${model}: 当前项目可见`);}
 catch{console.error(`${model}: 无法确认访问，请检查模型名称、权限、连接和账户配置。`);failed=true;}
}
console.log('模型可见不等于生成权限已验证；请在工作台完成一次实际图文生成。');
if(failed)process.exitCode=1;
