"use client";

import React, { useState, useEffect, useTransition, useOptimistic } from "react";
import { createClient } from "@nextblock-cms/db";
import { Button } from "@nextblock-cms/ui/button";
import { Textarea } from "@nextblock-cms/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@nextblock-cms/ui/avatar";
import { submitInteraction, toggleReaction } from "../app/actions/interactions";
import { cn } from "@nextblock-cms/utils";
import { MessageSquare, ThumbsUp, Star, Loader2, PenTool } from "lucide-react";

interface ProductReviewsSectionProps {
  productId: string;
}

export default function ProductReviewsSection({ productId }: ProductReviewsSectionProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Liked interactions tracking
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // Optimistic reviews list
  const [optimisticReviews, setOptimisticReviews] = useOptimistic(
    reviews,
    (state, { reviewId, hasReacted, count }: { reviewId: string; hasReacted: boolean; count: number }) =>
      state.map((r) => {
        if (r.id === reviewId) {
          const reactions = { ...((r.reactions as Record<string, number>) || {}) };
          reactions.likes = count;
          return { ...r, reactions, tempHasReacted: hasReacted };
        }
        return r;
      })
  );

  useEffect(() => {
    // 1. Fetch user
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // 2. Read liked interactions from cookies
    const match = document.cookie.match(/reacted_interactions=([^;]+)/);
    if (match) {
      try {
        setLikedIds(JSON.parse(decodeURIComponent(match[1])));
      } catch {}
    }

    // 3. Load initial reviews
    fetchReviews(0, true);
  }, [productId]);

  const fetchReviews = async (pageNum: number, isInitial = false) => {
    setLoading(true);
    const supabase = createClient();
    const limit = 5;
    const start = pageNum * limit;
    const end = start + limit - 1;

    try {
      const { data, error: dbError } = await supabase
        .from("cms_interactions" as any)
        .select("*, profiles(full_name, avatar_url, github_username)")
        .eq("product_id", productId)
        .eq("type", "review")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .range(start, end);

      if (dbError) throw dbError;

      if (data) {
        if (isInitial) {
          setReviews(data);
          setPage(0);
        } else {
          setReviews((prev) => [...prev, ...data]);
          setPage(pageNum);
        }
        setHasMore(data.length === limit);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchReviews(page + 1);
  };

  const handleLike = async (reviewId: string) => {
    const isLiked = likedIds.includes(reviewId);
    const review = reviews.find((r) => r.id === reviewId);
    if (!review) return;

    const currentLikes = (review.reactions as Record<string, number>)?.likes || 0;
    const nextCount = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;

    startTransition(async () => {
      // Apply optimistic update
      setOptimisticReviews({ reviewId, hasReacted: !isLiked, count: nextCount });

      const res = await toggleReaction(reviewId);
      if (res.success) {
        // Update liked cookie state locally
        if (isLiked) {
          setLikedIds((prev) => prev.filter((id) => id !== reviewId));
        } else {
          setLikedIds((prev) => [...prev, reviewId]);
        }
        // Sync actual state
        setReviews((prev) =>
          prev.map((r) => {
            if (r.id === reviewId) {
              const reactions = { ...((r.reactions as Record<string, number>) || {}) };
              reactions.likes = res.count ?? nextCount;
              return { ...r, reactions };
            }
            return r;
          })
        );
      }
    });
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to submit a review.");
      return;
    }

    if (content.trim().length < 5) {
      setError("Your review must be at least 5 characters long.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const res = await submitInteraction({
      type: "review",
      content: content.trim(),
      rating,
      productId,
    });

    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Your review has been submitted successfully and is pending moderation.");
      setContent("");
      setRating(5);
      // Close form after a brief delay
      setTimeout(() => {
        setIsFormOpen(false);
        setSuccess(null);
      }, 3000);
    }
  };

  const getInitials = (profile: any) => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "U";
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Customer Reviews
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Share your thoughts and experience with this product.
          </p>
        </div>

        {user ? (
          <Button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 transition-all"
            variant={isFormOpen ? "outline" : "default"}
          >
            <PenTool className="h-4 w-4" />
            {isFormOpen ? "Cancel Review" : "Write a Review"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Please log in to write a review.
          </p>
        )}
      </div>

      {/* Submission Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmitReview}
          className="bg-card/50 border border-border/80 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <h3 className="text-lg font-semibold text-foreground">Write your review</h3>

          {/* Stars Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Rating
            </label>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => {
                const starVal = i + 1;
                const isActive = starVal <= (hoverRating || rating);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(starVal)}
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform active:scale-95 focus:outline-none"
                    aria-label={`Rate ${starVal} stars`}
                  >
                    <Star
                      className={cn(
                        "h-7 w-7 transition-colors",
                        isActive
                          ? "text-amber-500 fill-amber-500"
                          : "text-slate-300 dark:text-slate-700"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-1.5">
            <label
              htmlFor="review-content"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block"
            >
              Review Description
            </label>
            <Textarea
              id="review-content"
              placeholder="What did you like or dislike? How does it perform?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] focus:ring-1 focus:ring-primary"
              disabled={submitting}
              required
            />
          </div>

          {error && <div className="text-sm font-semibold text-destructive">{error}</div>}
          {success && <div className="text-sm font-semibold text-emerald-600">{success}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsFormOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="min-w-[120px]">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {optimisticReviews.length > 0 ? (
          optimisticReviews.map((review) => {
            const hasLiked = likedIds.includes(review.id) || review.tempHasReacted;
            const likeCount = (review.reactions as Record<string, number>)?.likes || 0;
            const reviewerName = review.profiles?.full_name || review.profiles?.github_username || "Anonymous";
            const dateStr = new Date(review.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            return (
              <div
                key={review.id}
                className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-4 hover:border-border/100 transition-all duration-300"
              >
                {/* Reviewer Header */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={review.profiles?.avatar_url || undefined} alt={reviewerName} />
                      <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
                        {getInitials(review.profiles)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground leading-none">
                        {reviewerName}
                      </h4>
                      <span className="text-[10px] text-muted-foreground mt-1.5 block">
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < review.rating ? "fill-amber-500 text-amber-500" : "text-slate-200 dark:text-slate-800"
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Review Content */}
                <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-line text-left">
                  {review.content}
                </p>

                {/* Reaction Actions */}
                <div className="flex items-center pt-2">
                  <button
                    onClick={() => handleLike(review.id)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all active:scale-95",
                      hasLiked
                        ? "bg-primary/5 border-primary/20 text-primary"
                        : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/100"
                    )}
                  >
                    <ThumbsUp className={cn("h-3.5 w-3.5", hasLiked && "fill-current")} />
                    <span>Helpful</span>
                    {likeCount > 0 && <span className="font-semibold ml-0.5">{likeCount}</span>}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          !loading && (
            <div className="text-center py-12 border border-dashed rounded-2xl bg-slate-50/50 dark:bg-slate-900/10">
              <Star className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
              <h3 className="mt-4 text-sm font-semibold text-foreground">No reviews yet</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                There are no reviews for this product yet.
              </p>
            </div>
          )
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={handleLoadMore}>
              Load More Reviews
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
