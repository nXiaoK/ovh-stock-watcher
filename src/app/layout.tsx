import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import AppProvider from "@/components/AppProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OVH 服务器库存监控",
  description: "实时监控OVH服务器库存并通过Telegram发送通知",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} antialiased`}>
        <AppProvider>
          {children}
          <Toaster position="top-right" />
        </AppProvider>
      </body>
    </html>
  );
}
