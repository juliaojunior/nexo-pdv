"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Tag, BarChart2, Menu, BellRing } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const HIDDEN_ROUTES = ["/menu", "/process", "/sign-in", "/sign-up", "/sso-callback"];
  if (HIDDEN_ROUTES.some(r => pathname.startsWith(r)) || pathname.startsWith('/c')) return null;

  const navItems = [
    { href: "/", label: "Vendas", icon: ShoppingCart },
    { href: "/products", label: "Produtos", icon: Tag },
    { href: "/orders", label: "Pedidos", icon: BellRing },
    { href: "/reports", label: "Relatórios", icon: BarChart2 },
    { href: "/more", label: "Mais", icon: Menu },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-[#1a1a1a]/95 backdrop-blur-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.5)] border-t border-[#484847]/40">
      <div className="flex justify-around items-center h-20 px-1 w-full max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center px-1.5 sm:px-2 py-1.5 transition-all active:scale-90 ${
                isActive
                  ? "text-[#53ddfc] bg-[#004b58]/30 rounded-xl"
                  : "text-[#adaaaa] hover:text-[#53ddfc]"
              }`}
            >
              <Icon size={22} className={isActive ? "fill-current" : ""} />
              <span className="font-['Inter'] text-[10px] uppercase tracking-widest font-bold mt-1">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
