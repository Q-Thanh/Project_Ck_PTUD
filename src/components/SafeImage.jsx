import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

function isUsableImageSrc(src) {
  const value = String(src || "").trim();
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image/") ||
    value.startsWith("blob:") ||
    value.startsWith("/")
  );
}

export function SafeImage({ src, fallbackSrc, alt, className = "", placeholderClassName = "", hideOnError = false, ...props }) {
  const [failed, setFailed] = useState(false);
  const imageSrc = String(src || "").trim();
  const fallbackImageSrc = String(fallbackSrc || "").trim();
  const canUsePrimary = imageSrc && isUsableImageSrc(imageSrc) && !failed;
  const canUseFallback =
    fallbackImageSrc &&
    fallbackImageSrc !== imageSrc &&
    isUsableImageSrc(fallbackImageSrc) &&
    (failed || !isUsableImageSrc(imageSrc));
  const activeSrc = canUsePrimary ? imageSrc : canUseFallback ? fallbackImageSrc : "";

  useEffect(() => {
    setFailed(false);
  }, [imageSrc]);

  if (!activeSrc) {
    if (hideOnError) return null;

    return (
      <div className={["image-placeholder", className, placeholderClassName].filter(Boolean).join(" ")} aria-label={alt || "Không có ảnh"}>
        <ImageOff size={24} />
        <span>Chưa có ảnh</span>
      </div>
    );
  }

  return <img src={activeSrc} alt={alt || ""} className={className} onError={() => setFailed(true)} {...props} />;
}
