import AspectImage from "./AspectImage"; // adjust path

// inside render where you show the cover:
{item.imageUrl ? (
  <AspectImage
    src={item.imageUrl}
    alt={item.title || ""}
    width={item.mediaWidth /* later, when you wire list to include it */}
    height={item.mediaHeight}
    className="rounded-md overflow-hidden"
  />
) : null}
