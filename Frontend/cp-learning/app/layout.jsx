import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Nav from "@/components/Common/Nav";
import { Separator } from "@/components/ui/separator";

import { Toaster } from "react-hot-toast";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({ children }) {
     
  return (
    <html lang="en">
      <ClerkProvider>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#151515]   `}
        >
          <Toaster />
          <main className="w-full  min-h-screen  flex flex-col">
            <div className="w-full h-full flex flex-col items-center justify-center ">
              <Nav />
              <Separator />

              {children}
            </div>
          </main>
        </body>
      </ClerkProvider>
    </html>
  );
}
