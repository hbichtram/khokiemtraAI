// Helper functions for parsing game URLs, converting embed links, and handling built-in HTML5 games

export interface FormattedGameUrl {
  embedUrl: string;
  isBuiltIn: boolean;
  builtInKey?: string;
  isHtmlDoc?: boolean;
  isNonEmbeddable?: boolean;
}

export function formatGameEmbedUrl(url: string | undefined | null): FormattedGameUrl {
  if (!url || typeof url !== "string" || !url.trim()) {
    return {
      embedUrl: "builtin:typing",
      isBuiltIn: true,
      builtInKey: "typing"
    };
  }

  let trimmed = url.trim();

  // 1. Built-in games check
  if (trimmed.startsWith("builtin:")) {
    const key = trimmed.replace("builtin:", "").trim();
    return {
      embedUrl: trimmed,
      isBuiltIn: true,
      builtInKey: key || "typing"
    };
  }

  // 2. Direct HTML code or Data URL
  if (trimmed.startsWith("data:text/html") || trimmed.includes("<html") || trimmed.includes("<!DOCTYPE") || trimmed.includes("<iframe")) {
    return {
      embedUrl: trimmed,
      isBuiltIn: false,
      isHtmlDoc: true
    };
  }

  // Enforce HTTPS for Vercel Production security (avoids Mixed Content iframe blocks)
  if (trimmed.startsWith("http://")) {
    trimmed = trimmed.replace("http://", "https://");
  }

  // 3. Scratch & TurboWarp URL parsing
  // Match scratch.mit.edu/projects/12345678 or scratch.mit.edu/12345678 or turbowarp.org/12345678
  const scratchMatch = trimmed.match(/(?:scratch\.mit\.edu|turbowarp\.org)\/(?:projects\/|embed\/)?(\d+)/i);
  if (scratchMatch && scratchMatch[1]) {
    const projectId = scratchMatch[1];
    return {
      embedUrl: `https://turbowarp.org/${projectId}/embed?autoplay=true`,
      isBuiltIn: false
    };
  }

  // 4. Wordwall parsing
  // e.g. https://wordwall.net/resource/123456 or https://wordwall.net/play/123456 or https://wordwall.net/vi/resource/123456
  const wordwallMatch = trimmed.match(/wordwall\.net\/(?:[a-z]{2}\/)?(?:resource|play|embed\/resource)\/(\d+)/i);
  if (wordwallMatch && wordwallMatch[1]) {
    return {
      embedUrl: `https://wordwall.net/embed/resource/${wordwallMatch[1]}`,
      isBuiltIn: false
    };
  }

  // 5. Quizizz parsing
  const quizizzMatch = trimmed.match(/quizizz\.com\/(?:admin\/quiz|join\/quiz|embed\/quiz)\/([a-zA-Z0-9_-]+)/i);
  if (quizizzMatch && quizizzMatch[1]) {
    return {
      embedUrl: `https://quizizz.com/embed/quiz/${quizizzMatch[1]}`,
      isBuiltIn: false
    };
  }

  // 6. YouTube parsing
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/i);
  if (ytMatch && ytMatch[1]) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`,
      isBuiltIn: false
    };
  }

  // 7. Google Slides
  const googleSlidesMatch = trimmed.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/i);
  if (googleSlidesMatch && googleSlidesMatch[1]) {
    return {
      embedUrl: `https://docs.google.com/presentation/d/${googleSlidesMatch[1]}/embed?start=true&loop=true&delayms=3000`,
      isBuiltIn: false
    };
  }

  // 8. Canva
  const canvaMatch = trimmed.match(/canva\.com\/design\/([a-zA-Z0-9_-]+)/i);
  if (canvaMatch && canvaMatch[1]) {
    return {
      embedUrl: `https://www.canva.com/design/${canvaMatch[1]}/view?embed`,
      isBuiltIn: false
    };
  }

  // 9. Geogebra
  const geogebraMatch = trimmed.match(/geogebra\.org\/(?:m|material\/iframe\/id)\/([a-zA-Z0-9_-]+)/i);
  if (geogebraMatch && geogebraMatch[1]) {
    return {
      embedUrl: `https://www.geogebra.org/material/iframe/id/${geogebraMatch[1]}`,
      isBuiltIn: false
    };
  }

  // 10. Known Non-Embeddable Domains (sites that strictly enforce SAMEORIGIN / DENY)
  const nonEmbeddableDomains = ["kahoot.it", "blooket.com", "gimkit.com", "quizlet.com"];
  const isNonEmbed = nonEmbeddableDomains.some((domain) => trimmed.toLowerCase().includes(domain));
  if (isNonEmbed) {
    return {
      embedUrl: trimmed,
      isBuiltIn: false,
      isNonEmbeddable: true
    };
  }

  // Default return original URL
  return {
    embedUrl: trimmed,
    isBuiltIn: false
  };
}

// Built-in Game Definitions
export const BUILTIN_GAMES = [
  {
    id: "builtin:typing",
    title: "Vua Gõ Bàn Phím (Typing Speed)",
    description: "Trò chơi luyện tập gõ bàn phím nhanh, chuẩn xác từ hàng phím cơ sở đến các phím đặc biệt.",
    grade: "Tin học 3",
    topic: "Bàn phím & Chuột",
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
    gameUrl: "builtin:typing",
    status: "active" as const
  },
  {
    id: "builtin:quiz",
    title: "Đố Vui Tin Học & An Toàn Mạng",
    description: "Trò chơi trắc nghiệm vui nhộn thử thách kiến thức máy tính và kĩ năng sử dụng Internet an toàn.",
    grade: "Tin học 4",
    topic: "Internet & An toàn mạng",
    imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80",
    gameUrl: "builtin:quiz",
    status: "active" as const
  },
  {
    id: "builtin:scratch-maze",
    title: "Thám Tử Mê Cung Scratch",
    description: "Lập trình đường đi giúp chú Mèo Scratch thu thập linh kiện máy tính và né chướng ngại vật.",
    grade: "Tin học 5",
    topic: "Lập trình Scratch",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    gameUrl: "builtin:scratch-maze",
    status: "active" as const
  }
];
