import Image from "next/image";

const DEFAULT_FRAME_CLASS_NAME =
  "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_45%),linear-gradient(135deg,#020617,#111827_55%,#1f2937)]";

interface FeatureImageHeroProps {
  alt: string;
  blurDataURL?: string | null;
  frameClassName?: string;
  height?: number | null;
  imageClassName?: string;
  imageUrl: string;
  priority?: boolean;
  width?: number | null;
}

export default function FeatureImageHero({
  alt,
  blurDataURL,
  frameClassName = DEFAULT_FRAME_CLASS_NAME,
  height,
  imageClassName = "h-full w-full object-cover",
  imageUrl,
  priority = false,
  width,
}: FeatureImageHeroProps) {
  return (
    <div
      className={`overflow-hidden rounded-[2rem] border border-slate-200/80 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.45)] dark:border-white/10 ${frameClassName}`}
    >
      <div className="relative aspect-[16/10] md:aspect-[2.35/1]">
        <Image
          src={imageUrl}
          alt={alt}
          width={width && width > 0 ? width : 1600}
          height={height && height > 0 ? height : 900}
          placeholder={blurDataURL ? "blur" : "empty"}
          blurDataURL={blurDataURL ?? undefined}
          sizes="(max-width: 768px) 100vw, 1200px"
          className={imageClassName}
          priority={priority}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
      </div>
    </div>
  );
}
