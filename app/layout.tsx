import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Navigation from '@/components/Navigation';
import './globals.css';
const sans=Geist({subsets:['latin'],variable:'--font-sans',display:'swap'});
const mono=Geist_Mono({subsets:['latin'],variable:'--font-mono',display:'swap'});
export const metadata:Metadata={title:{default:'Shubhang Srinivas Varda — Full-Stack & AI Engineer',template:'%s — Shubhang Srinivas Varda'},description:'Full-stack products, applied AI, and thoughtful digital experiences. Selected engineering work by Shubhang Srinivas Varda, Bengaluru.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className={`${sans.variable} ${mono.variable}`}><a className="skip-link" href="#main">Skip to content</a><Navigation/>{children}</body></html>;}
