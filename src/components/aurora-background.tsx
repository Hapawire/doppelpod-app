"use client";

export function AuroraBackground() {
  return (
    <>
      {/* Animated blobs */}
      <div className="aurora-layer">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
        <div className="aurora-blob aurora-blob-4" />
      </div>
      {/* Fade blobs into page at bottom */}
      <div className="aurora-fade" />
    </>
  );
}
