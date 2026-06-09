import { useState, useEffect } from "react";
import { tokenStore } from "@/lib/api";

export function AuthenticatedImage({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  const [blobUrl, setBlobUrl] = useState<string>("");

  useEffect(() => {
    if (!src || src.startsWith("data:") || !src.includes("/files/attachments")) {
      setBlobUrl(src);
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const headers: HeadersInit = {};
        const storedToken = tokenStore.get() || localStorage.getItem("tfp-token");
        if (storedToken) {
          headers["Authorization"] = `Bearer ${storedToken}`;
        }
        const res = await fetch(src, { headers });
        if (!res.ok) throw new Error("Failed to load image");
        const blob = await res.blob();
        if (active) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }
      } catch (e) {
        console.error("Failed to load authenticated image", src, e);
        if (active) setBlobUrl(src); // fallback to raw URL
      }
    };

    load();

    return () => {
      active = false;
      if (blobUrl && blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [src]);

  if (!blobUrl) {
    return <div className="h-20 w-32 bg-muted animate-pulse rounded-lg flex items-center justify-center text-[10px] text-muted-foreground">Loading image...</div>;
  }

  return <img src={blobUrl} alt={alt || "image"} className={className} />;
}
