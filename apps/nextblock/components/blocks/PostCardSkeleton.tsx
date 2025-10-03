import { Skeleton } from "@nextblock-cms/ui";

const PostCardSkeleton = () => {
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm bg-card text-card-foreground">
      <Skeleton className="h-48 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-1/4 mt-2" />
      </div>
    </div>
  );
};

export default PostCardSkeleton;