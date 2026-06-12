import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { WifiOff } from 'lucide-react';

interface Props {
  cameraId: string;
  streamType?: 'main' | 'sub';
}

export default function HlsVideoTile({ cameraId, streamType = 'sub' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamNameRef = useRef<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'error'>('loading');

  useEffect(() => {
    const token = localStorage.getItem('evron_jwt_token');
    if (!token) { setStatus('error'); return; }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const start = async () => {
      try {
        const res = await fetch('/api/live-preview/hls-start', {
          method: 'POST',
          headers,
          body: JSON.stringify({ camera_id: cameraId, stream_type: streamType }),
        });
        if (!res.ok) throw new Error('hls-start failed');
        const data = await res.json();
        streamNameRef.current = data.stream_name;
        const hlsUrl = `/hls/${data.stream_name}/index.m3u8?cookieCheck=1`;

        keepaliveRef.current = setInterval(() => {
          const t = localStorage.getItem('evron_jwt_token');
          if (!t) return;
          fetch('/api/live-preview/hls-keepalive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` },
            body: JSON.stringify({ camera_id: cameraId, stream_type: streamType }),
          }).catch(() => {});
        }, 25000);

        const video = videoRef.current;
        if (!video) return;

        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 10 });
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
            setStatus('playing');
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) { hls.destroy(); setStatus('error'); }
          });
          hlsRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = hlsUrl;
          video.addEventListener('loadedmetadata', () => {
            video.play().catch(() => {});
            setStatus('playing');
          });
          video.addEventListener('error', () => setStatus('error'));
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    };

    start();

    return () => {
      if (keepaliveRef.current) clearInterval(keepaliveRef.current);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      const t = localStorage.getItem('evron_jwt_token');
      if (t && streamNameRef.current) {
        fetch('/api/live-preview/hls-release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` },
          body: JSON.stringify({ camera_id: cameraId, stream_type: streamType }),
        }).catch(() => {});
      }
    };
  }, [cameraId, streamType]);

  return (
    <div className="absolute inset-0 bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`w-full h-full object-cover transition-opacity duration-500 ${status === 'playing' ? 'opacity-100' : 'opacity-0'}`}
      />
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80">
          <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[9px] font-mono text-zinc-400 tracking-widest">CONNECTING</span>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-zinc-600">
          <WifiOff className="w-7 h-7" />
          <span className="text-[9px] font-mono tracking-widest">NO SIGNAL</span>
        </div>
      )}
    </div>
  );
}
