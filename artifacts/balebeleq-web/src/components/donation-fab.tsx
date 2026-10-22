import { Link } from "wouter";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DonationFab() {
  return (
    <Link href="/donasi" className="group fixed bottom-6 left-6 z-40">
      <Button
        size="lg"
        className="rounded-full shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/40"
        aria-label="Berugak Donasi"
      >
        <Heart className="mr-2 h-5 w-5 animate-pulse" />
        <span className="hidden sm:inline">Donasi</span>
      </Button>
    </Link>
  );
}