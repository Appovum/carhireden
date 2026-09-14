// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Ad Banner Renderer
// Renders REAL ad creatives from admin DB: image banners, Google
// AdSense code, and custom HTML. Tracks impressions & clicks in real time.
// ═══════════════════════════════════════════════════════════════════

"use client";

import { useEffect, useRef } from "react";

export interface AdBannerRowProps {
  /** Database Creative ID for tracking */
  id?: string;
  /** The creative type: "image" | "adsense" | "custom_html" */
  type?: "image" | "adsense" | "custom_html";
  /** The campaign title from admin (used as alt text for images) */
  title?: string;
  /** Image URL for type="image" banners */
  imageUrl?: string;
  /** Click-through destination URL for image banners */
  targetUrl?: string;
  /** Raw HTML/AdSense code for type="adsense" or "custom_html" */
  htmlContent?: string | null;
  /** Placement variant for sizing hints */
  variant?: "header" | "sidebar" | "in_feed";

  // Legacy props kept for backward compatibility
  logoUrl?: string;
  ctaLink?: string;
  sponsorName?: string;
  subtitle?: string;
  ctaText?: string;
}

export function AdBannerRow({
  id,
  type,
  title,
  imageUrl,
  targetUrl,
  htmlContent,
  variant = "in_feed",
  // Legacy prop mapping
  logoUrl,
  ctaLink,
}: AdBannerRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackedImpressionRef = useRef(false);

  // Normalize legacy props
  const resolvedImageUrl = imageUrl || logoUrl;
  const resolvedTargetUrl = targetUrl || ctaLink || "#";
  const resolvedType = type || (htmlContent ? "adsense" : resolvedImageUrl ? "image" : undefined);

  // ── Track Impression On Mount ──
  useEffect(() => {
    if (id && !trackedImpressionRef.current) {
      trackedImpressionRef.current = true;
      fetch("/api/ads/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creativeId: id, event: "impression" }),
      }).catch(() => {});
    }
  }, [id]);

  // ── Track Click On Interaction ──
  const handleAdClick = () => {
    if (id) {
      fetch("/api/ads/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creativeId: id, event: "click" }),
        keepalive: true,
      }).catch(() => {});
    }
  };

  // Execute HTML/AdSense scripts safely after mount
  useEffect(() => {
    if (!htmlContent || !containerRef.current) return;

    const container = containerRef.current;

    // Strip inline adsbygoogle.push calls to prevent 0px-width race
    let sanitizedHtml = htmlContent.replace(
      /<script\b[^>]*>([\s\S]*?adsbygoogle[\s\S]*?)<\/script>/gi,
      ""
    );

    // Strip <style> rules targeting body/html/* that would break page layout
    sanitizedHtml = sanitizedHtml.replace(
      /<style\b[^>]*>([\s\S]*?)<\/style>/gi,
      (match, cssContent: string) => {
        // Remove rules that target global selectors
        const scoped = cssContent.replace(
          /(?:^|\})\s*(?:body|html|\*|main|header|footer|#__next|#root)\s*\{[^}]*\}/gi,
          ""
        );
        return scoped.trim() ? `<style>${scoped}</style>` : "";
      }
    );

    container.innerHTML = sanitizedHtml;

    // Constrain all direct children so ad content can't overflow the container
    Array.from(container.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        child.style.maxWidth = "100%";
        child.style.boxSizing = "border-box";
        child.style.overflow = "hidden";
      }
    });

    // Clone and re-insert external <script> nodes so they execute
    const scripts = container.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      if (!oldScript.innerHTML.includes("adsbygoogle")) {
        try {
          const newScript = document.createElement("script");
          Array.from(oldScript.attributes).forEach((attr) =>
            newScript.setAttribute(attr.name, attr.value)
          );
          if (oldScript.innerHTML) {
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          }
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        } catch {
          // Gracefully ignore script replacement errors
        }
      }
    });

    // Trigger AdSense .push({}) after layout has had time to measure
    const timer = setTimeout(() => {
      try {
        if (containerRef.current && containerRef.current.offsetWidth >= 200) {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        }
      } catch {
        // Gracefully absorb AdSense tag warnings
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [htmlContent]);

  // ── No creative data at all → render nothing ──
  if (!resolvedType && !htmlContent && !resolvedImageUrl) {
    return null;
  }

  // ── 1. AdSense / Custom HTML path (Isolated via iframe) ──
  if (resolvedType === "adsense" || resolvedType === "custom_html" || (htmlContent && resolvedType !== "image")) {
    const iframeHeight = variant === "sidebar" ? "250px" : variant === "header" ? "90px" : "100px";
    
    // Construct isolated document with basic reset for ad iframe
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<base target="_blank">
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    overflow: hidden;
    display: block;
    font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
  }
  img, svg, iframe, video {
    max-width: 100%;
    max-height: 100%;
    object-fit: cover;
  }
</style>
</head>
<body>
${htmlContent || ""}
</body>
</html>`;

    return (
      <div
        className={`w-full box-border ${variant === "sidebar" ? "my-0" : "my-2 sm:my-2.5"}`}
        onClick={handleAdClick}
      >
        <div className="bg-paper-sunken border border-rule rounded-[4px] p-1.5 text-center flex flex-col items-center justify-center w-full">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted mb-1 self-start px-2 py-0.5 bg-paper rounded-[2px] border border-rule">
            ADVERTISEMENT
          </div>
          <iframe
            srcDoc={fullHtml}
            title={title || "Advertisement"}
            className="w-full border-0 bg-transparent overflow-hidden rounded-[2px]"
            style={{
              height: iframeHeight,
              minHeight: variant === "sidebar" ? "250px" : "90px",
            }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  // ── 2. Image banner path — renders actual image from DB ──
  if (resolvedType === "image" && resolvedImageUrl) {
    return (
      <div
        className={`w-full box-border ${variant === "sidebar" ? "my-0" : "my-2 sm:my-2.5"}`}
        onClick={handleAdClick}
      >
        <div className="bg-paper-sunken border border-rule rounded-[4px] overflow-hidden relative group">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted absolute top-2 left-2 z-10 px-2 py-0.5 bg-paper/90 backdrop-blur-sm rounded-[2px] border border-rule">
            SPONSORED
          </div>
          <a
            href={resolvedTargetUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block w-full"
            onClick={handleAdClick}
          >
            <img
              src={resolvedImageUrl}
              alt={title || "Sponsored advertisement"}
              className={`w-full object-cover transition-transform duration-300 group-hover:scale-[1.01] ${
                variant === "header"
                  ? "h-[90px]"
                  : variant === "sidebar"
                  ? "h-auto min-h-[200px] max-h-[250px]"
                  : "h-[100px] sm:h-[120px]"
              }`}
              loading="lazy"
            />
          </a>
          {title && (
            <div className="px-3 py-2 flex items-center justify-between bg-paper-sunken border-t border-rule">
              <span className="text-[12px] font-display font-semibold text-ink truncate">{title}</span>
              <a
                href={resolvedTargetUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="text-[11px] font-mono font-bold text-money hover:underline flex-shrink-0 ml-2"
                onClick={handleAdClick}
              >
                Visit →
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Fallback: no renderable creative ──
  return null;
}
