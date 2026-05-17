import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Listas de Compras",
  description: "Gestor web de listas y plantillas de compras"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <SiteHeader />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
