import { Link } from "wouter";
import { useGetDonationSettings, useListDonationCampaigns } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah } from "@/lib/format-money";
import { ArrowRight, Heart, HandHeart, Users } from "lucide-react";

export default function DonationListPage() {
  const { data: campaigns, isLoading } = useListDonationCampaigns();
  const { data: settings } = useGetDonationSettings();

  const list = campaigns ?? [];
  const totalCollected = list.reduce((sum, item) => sum + (item.collectedAmount ?? 0), 0);
  const totalDonors = list.reduce((sum, item) => sum + (item.donorCount ?? 0), 0);

  return (
    <PublicLayout>
      <SEO
        title={settings?.heroTitle || "Berugak Donasi"}
        description={
          settings?.heroDescription ||
          "Bantu sesama melalui Berugak Donasi. Scan QRIS, transfer bank, atau donasi kripto - terverifikasi otomatis."
        }
        url="/donasi"
        keywords="donasi berugaknews, donasi lombok, qris, donasi berita"
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-emerald-900 text-primary-foreground">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
              <Heart className="h-3.5 w-3.5" /> Berugak Donasi
            </span>
            <h1 className="mt-4 font-serif text-3xl font-black leading-tight md:text-4xl">
              {settings?.heroTitle || "Berugak Donasi"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/90 md:text-base">
              {settings?.heroDescription ||
                "Setiap rupiah yang kamu berikan disalurkan untuk membantu orang yang membutuhkan. BerugakNews hanya sebagai wadah penyaluran."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <a href="#campaign">
                  Lihat Campaign <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href="/donasi/lacak">Cek Status Donasi</Link>
              </Button>
            </div>

            {list.length > 0 && (
              <dl className="mt-8 grid grid-cols-2 gap-4 sm:max-w-md">
                <div className="rounded-xl bg-white/10 px-4 py-3">
                  <dt className="text-xs uppercase tracking-wider text-primary-foreground/70">Terkumpul</dt>
                  <dd className="mt-1 text-xl font-bold">{formatRupiah(totalCollected)}</dd>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-3">
                  <dt className="text-xs uppercase tracking-wider text-primary-foreground/70">Donatur</dt>
                  <dd className="mt-1 text-xl font-bold">{totalDonors}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </section>

      {/* Daftar campaign */}
      <section id="campaign" className="container mx-auto px-4 py-10 md:py-14">
        <div className="mb-6 flex items-center gap-2">
          <HandHeart className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-2xl font-bold">Campaign Donasi</h2>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
            <HandHeart className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-4 font-semibold">Belum ada campaign donasi aktif</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Admin sedang menyiapkan campaign. Kembali lagi nanti atau cek status donasi yang pernah kamu kirim.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/donasi/lacak">Cek Status Donasi</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((campaign) => {
              const collected = campaign.collectedAmount ?? 0;
              const target = campaign.targetAmount ?? 0;
              const progress = campaign.progress ?? (target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0);

              return (
                <Card key={campaign.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
                  {campaign.coverImageUrl ? (
                    <img
                      src={campaign.coverImageUrl}
                      alt={campaign.title}
                      className="h-44 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                      <HandHeart className="h-12 w-12 text-primary/40" />
                    </div>
                  )}
                  <CardContent className="flex flex-1 flex-col gap-3 p-5">
                    <div>
                      <h3 className="font-serif text-lg font-bold leading-snug">{campaign.title}</h3>
                      {campaign.excerpt && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{campaign.excerpt}</p>
                      )}
                    </div>

                    <div className="mt-auto space-y-2">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-bold text-primary">{formatRupiah(collected)}</span>
                        <span className="text-muted-foreground">dari {formatRupiah(target)}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{progress}% terkumpul</span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" /> {campaign.donorCount ?? 0} donatur
                        </span>
                      </div>
                      <Button asChild className="w-full">
                        <Link href={`/donasi/${campaign.slug}`}>Donasi Sekarang</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
