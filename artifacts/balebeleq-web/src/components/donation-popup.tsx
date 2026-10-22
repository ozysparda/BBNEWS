import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Heart, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useGetDonationSettings, useGetDonationCampaign } from "@workspace/api-client-react";
import { formatRupiah } from "@/lib/format-money";

interface DonationPopupProps {
  placement?: "floating" | "article-top" | "article-middle" | "article-bottom" | "home-banner";
  filterPlacement?: string;
}

export function DonationPopup({ placement, filterPlacement }: DonationPopupProps) {
  const { data: settings } = useGetDonationSettings();
  const popupEnabled = settings?.popupEnabled ?? false;
  const popupCampaignId = settings?.popupCampaignId ?? null;
  const popupPlacement = placement ?? settings?.popupPlacement ?? "floating";
  const popupDelay = settings?.popupDelay ?? 5;
  const popupDismissable = settings?.popupDismissable ?? true;

  const { data: campaign } = useGetDonationCampaign(
    popupCampaignId ? String(popupCampaignId) : "",
    {
      query: {
        queryKey: popupCampaignId ? ["donation-campaign", popupCampaignId] : ["donation-campaign", "none"],
        enabled: !!popupCampaignId,
      },
    }
  );

  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const shouldRender = popupEnabled && !!campaign && campaign.status === "active";
  const placementMatches = !filterPlacement || popupPlacement === filterPlacement;

  useEffect(() => {
    if (!shouldRender || !placementMatches) return;
    if (popupPlacement === "floating" || popupPlacement === "home-banner") {
      const timer = setTimeout(() => setVisible(true), popupDelay * 1000);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
      return undefined;
    }
  }, [shouldRender, placementMatches, popupPlacement, popupDelay]);

  if (!shouldRender || !placementMatches || dismissed) return null;

  const collected = campaign!.collectedAmount ?? 0;
  const target = campaign!.targetAmount ?? 0;
  const progress = campaign!.progress ?? (target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0);

  if (popupPlacement === "floating") {
    if (!visible) return null;
    return (
      <div className="fixed bottom-24 right-4 z-40 w-[min(calc(100vw-2rem),320px)] animate-in slide-in-from-bottom-4 fade-in duration-300">
        <Card className="overflow-hidden border-primary/20 shadow-xl shadow-primary/10">
          <CardContent className="p-0">
            {campaign!.coverImageUrl && (
              <div className="relative h-32 overflow-hidden">
                <img
                  src={campaign!.coverImageUrl}
                  alt={campaign!.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {popupDismissable && (
                  <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="absolute right-2 top-2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60"
                    aria-label="Tutup"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <div className="space-y-3 p-4">
              <div className="flex items-start gap-2">
                <Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Berugak Donasi
                  </p>
                  <h3 className="line-clamp-2 font-serif text-sm font-bold leading-snug">
                    {campaign!.title}
                  </h3>
                </div>
                {!campaign!.coverImageUrl && popupDismissable && (
                  <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="shrink-0 rounded-full p-1 hover:bg-muted"
                    aria-label="Tutup"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {campaign!.excerpt && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{campaign!.excerpt}</p>
              )}
              {target > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-primary">{formatRupiah(collected)}</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}
              <Button asChild size="sm" className="w-full">
                <Link href={`/donasi/${campaign!.slug}`}>
                  Donasi Sekarang
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (popupPlacement === "home-banner") {
    return (
      <div className="mb-6 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Berugak Donasi</p>
              <h3 className="font-serif text-lg font-bold leading-snug">{campaign!.title}</h3>
              {campaign!.excerpt && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{campaign!.excerpt}</p>
              )}
              {target > 0 && (
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={progress} className="h-2 w-32" />
                  <span className="text-xs text-muted-foreground">{progress}% terkumpul</span>
                </div>
              )}
            </div>
          </div>
          <Button asChild className="shrink-0">
            <Link href={`/donasi/${campaign!.slug}`}>
              Donasi Sekarang
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Article placements (top, middle, bottom)
  return (
    <div className="my-6 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Berugak Donasi</p>
            <h3 className="font-serif text-base font-bold leading-snug sm:text-lg">{campaign!.title}</h3>
            {campaign!.excerpt && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{campaign!.excerpt}</p>
            )}
            {target > 0 && (
              <div className="mt-2 flex items-center gap-3">
                <Progress value={progress} className="h-2 w-24 sm:w-32" />
                <span className="text-xs text-muted-foreground">{progress}%</span>
              </div>
            )}
          </div>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href={`/donasi/${campaign!.slug}`}>
            Donasi
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}