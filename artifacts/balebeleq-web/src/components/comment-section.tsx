import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { MapPin, MessageSquare, User } from "lucide-react";
import { useListComments, useCreateComment, getListCommentsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CommentSectionProps {
  articleId: number;
}

export default function CommentSection({ articleId }: CommentSectionProps) {
  const queryClient = useQueryClient();
  const { data: comments, isLoading } = useListComments(articleId);
  const createComment = useCreateComment();
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [location, setLocation] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Browser ini tidak mendukung lokasi.");
      return;
    }
    setLocationLoading(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(
          `${position.coords.latitude.toFixed(3)}, ${position.coords.longitude.toFixed(3)}`,
        );
        setLocationMessage("Lokasi perkiraan siap disertakan.");
        setLocationLoading(false);
      },
      () => {
        setLocationMessage("Lokasi tidak diizinkan. Komentar tetap bisa dikirim.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedContent = content.trim();

    if (!trimmedEmail || !trimmedContent) {
      setError("Email dan komentar wajib diisi.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Format email tidak valid.");
      return;
    }

    createComment.mutate(
      {
        id: articleId,
        data: {
          email: trimmedEmail,
          content: trimmedContent,
          location: location || undefined,
        },
      },
      {
        onSuccess: () => {
          setEmail("");
          setContent("");
          setLocation("");
          setLocationMessage("");
          queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(articleId) });
        },
        onError: (err: any) => {
          setError(err?.message || "Gagal mengirim komentar. Coba lagi.");
        },
      },
    );
  }

  return (
    <section className="mt-12 pt-8 border-t border-border">
      <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Komentar
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <Label htmlFor="comment-email">Email</Label>
          <Input
            id="comment-email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={requestLocation}
            disabled={locationLoading}
          >
            <MapPin className="mr-2 h-4 w-4" />
            {locationLoading
              ? "Meminta izin lokasi..."
              : location
                ? "Lokasi terlampir"
                : "Sertakan lokasi (opsional)"}
          </Button>
          {locationMessage && (
            <p className="mt-1 text-xs text-muted-foreground">{locationMessage}</p>
          )}
        </div>
        <div>
          <Label htmlFor="comment-content">Komentar</Label>
          <Textarea
            id="comment-content"
            placeholder="Tulis komentar Anda..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={createComment.isPending}>
          {createComment.isPending ? "Mengirim..." : "Kirim Komentar"}
        </Button>
      </form>

      {isLoading && <p className="text-muted-foreground">Memuat komentar...</p>}

      {!isLoading && comments?.length === 0 && (
        <p className="text-muted-foreground italic">Belum ada komentar. Jadilah yang pertama.</p>
      )}

      <div className="space-y-6">
        {comments?.map((comment) => (
          <div key={comment.id} className="bg-muted/30 rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{comment.email}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(comment.createdAt), "dd MMMM yyyy, HH:mm", { locale: id })}
                </p>
              </div>
            </div>
            <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
