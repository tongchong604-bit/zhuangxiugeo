import { marketingSchema, type MarketingCopy, type GenerateInput, type AssetRequest, type AssetResult } from './schema';
type Generators={text:(input:GenerateInput)=>Promise<MarketingCopy>;image:(input:GenerateInput,index:number)=>Promise<string>};
export async function generateAsset(input:AssetRequest,generators:Generators):Promise<AssetResult>{
 try{
  if(input.task==='copy'){
   const copy=marketingSchema.parse(await generators.text(input));
   if(copy.imageCaptions.length!==input.imageCount)throw new Error('caption count');
   return {copy};
  }
  const image=await generators.image(input,input.imageIndex);
  if(!image||image.length>4_000_000)throw new Error('image delivery budget');
  return {image:`data:image/jpeg;base64,${image}`};
 }catch{throw new Error('生成失败，请检查服务端模型权限、账户额度或稍后重试。');}
}
