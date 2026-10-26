import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '装小果 AI · 装修灵感，一键成稿', description: '为装修行业打造的 AI 营销工作台，一次生成宣传图片、标题、三条营销文案和咨询引导语。' };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="zh-CN"><body>{children}</body></html>;}
