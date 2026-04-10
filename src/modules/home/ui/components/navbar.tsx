"use client";

import Link from "next/link";
import Image from "next/image";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { UserControl } from "@/components/user-control";
import { ThemeToggler } from "@/components/theme-toggler";
import { useScroll } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const isScrolled = useScroll(10);

  return (
    <nav
      className={cn(
        "p-4 bg-transparent fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b border-transparent",
        isScrolled && "bg-background border-border",
      )}
    >
      <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
        <div className="flex flex-row gap-3 ">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Logo" width={24} height={24} />
            <span className="font-semibold text-lg">Vibe</span>
          </Link>
          <ThemeToggler />
        </div>

        <Show when="signed-out">
          <div className="flex gap-2">
            <SignUpButton>
              <Button variant="outline" size="sm">
                Sign Up
              </Button>
            </SignUpButton>

            <SignInButton>
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </div>
        </Show>

        <Show when="signed-in">
          <UserControl />
        </Show>
      </div>
    </nav>
  );
}
