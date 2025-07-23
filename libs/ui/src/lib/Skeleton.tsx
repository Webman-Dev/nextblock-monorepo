import { cn } from "@nextblock-monorepo/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-muted shimmer", className)}
      {...props}
    />
  );
}

export { Skeleton };