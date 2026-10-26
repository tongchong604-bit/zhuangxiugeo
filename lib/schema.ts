import { z } from 'zod';
export const styles = ['现代简约', '奶油风', '原木风', '新中式', '轻奢风', '北欧风'] as const;
export const usages = ['小红书配图', '朋友圈海报', '网站横幅'] as const;
export const scenes = ['客厅全景', '餐厅与日常', '卧室休憩', '厨房收纳'] as const;
export const inputSchema = z.object({
 keyword:z.string().trim().min(1).max(200),city:z.string().trim().min(1).max(40),
 style:z.enum(styles),usage:z.enum(usages),imageCount:z.union([z.literal(3),z.literal(4)]).default(4),
 companyName:z.string().trim().max(80).default(''),companyFacts:z.string().trim().max(2000).default(''),
});
export const requestSchema=inputSchema.extend({task:z.enum(['copy','image']),imageIndex:z.number().int().min(0).max(3).default(0)}).refine(value=>value.imageIndex<value.imageCount,{message:'图片序号超出本组范围',path:['imageIndex']});
export const marketingSchema = z.object({
 title:z.string().min(1).max(100),copies:z.array(z.string().min(1).max(1000)).length(3),
 imageCaptions:z.array(z.string().min(1).max(300)).min(3).max(4),consultation:z.string().min(1).max(300),
});
export type GenerateInput = z.infer<typeof inputSchema>;
export type AssetRequest = z.infer<typeof requestSchema>;
export type MarketingCopy = z.infer<typeof marketingSchema>;
export type AssetResult = {copy?:MarketingCopy;image?:string};
export function imageSize(usage: GenerateInput['usage']): '1024x1536'|'1024x1024'|'1536x1024' {
 return usage==='小红书配图'?'1024x1536':usage==='网站横幅'?'1536x1024':'1024x1024';
}
