import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "PixelFlow · AI 影像任务控制台",
  description: "可展示的全栈 AI 图像任务平台作品"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
