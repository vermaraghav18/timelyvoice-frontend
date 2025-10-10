import React from "react";
import MediaGrid from "./MediaGrid";

export default function MediaPage({ token }) {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Media Library</h1>
      <MediaGrid token={token} />
    </div>
  );
}
