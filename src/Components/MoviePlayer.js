import React from 'react';

function MoviePlayer() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-4">Warfare - 2025</h1>
        <video
          controls
          className="w-full"
          style={{ border: '2px solid white', borderRadius: '8px' }}
        >
          <source src="/warfare-2025/hls/warfare2025.m3u8" type="application/x-mpegURL" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}

export default MoviePlayer;