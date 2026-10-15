import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GPU Rack Assembly Line | Digital Twin",
  description: "Interactive 3D Digital Twin and Operational Kanban for GPU Server Rack Manufacturing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0f19] text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
