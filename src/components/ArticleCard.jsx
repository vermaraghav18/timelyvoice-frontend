import React from "react";
import AspectImage from "./AspectImage"; // keep this

// inside render where you show the cover:
{item.imageUrl ? (
  <AspectImage
    src={item.imageUrl}
    alt={item.title || ""}
    // Prefer an aspect ratio for stable layout. If you have media dims, use them.
    aspect={
      item.mediaWidth && item.mediaHeight
        ? item.mediaWidth / item.mediaHeight
        : 16 / 9 // sensible default
    }
    className="rounded-md overflow-hidden"
    // If you want to also set intrinsic width/height on the <img>, pass via imgProps:
    imgProps={{
      width: item.mediaWidth || undefined,
      height: item.mediaHeight || undefined,
    }}
  />
) : null}

export default React.memo(ArticleCard);
