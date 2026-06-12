import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Sliders, VolumeX, EyeOff, Eye } from 'lucide-react';

interface AuraBackgroundProps {
  intensity?: number; // 0.1 to 1
  speed?: number; // 0.5 to 3
}

type VibePreset = 'aurora' | 'nebula' | 'cyberpunk' | 'monochrome';

export default function AuraBackground({ intensity = 0.5, speed = 1 }: AuraBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [vibe, setVibe] = useState<VibePreset>('aurora');
  const [quality, setQuality] = useState<'high' | 'eco'>('high');
  const [showConfig, setShowConfig] = useState(false);
  const [particlesActive, setParticlesActive] = useState(true);

  // Keep a reference to the settings to read inside the loop without re-triggering effects
  const settingsRef = useRef({ vibe, quality, particlesActive, intensity, speed });
  useEffect(() => {
    settingsRef.current = { vibe, quality, particlesActive, intensity, speed };
  }, [vibe, quality, particlesActive, intensity, speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // Track mouse position with client coordinates & target coordinates for easing
    let mouseX = -1000;
    let mouseY = -1000;
    let targetMouseX = -1000;
    let targetMouseY = -1000;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseX = e.clientX - rect.left;
      targetMouseY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      targetMouseX = -1000;
      targetMouseY = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Setup High-DPI canvas bounds
    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      
      // Let's optimize resolution for maximum battery & fluid rendering on high framerates (90Hz+)
      // Storing lower internal buffer for 'eco' mode but full resolution for 'high'
      const scaleFactor = settingsRef.current.quality === 'high' ? Math.min(dpr, 1.5) : 0.6;
      
      width = rect.width;
      height = rect.height;
      canvas.width = rect.width * scaleFactor;
      canvas.height = rect.height * scaleFactor;
      ctx.scale(scaleFactor, scaleFactor);
    };

    const resizeObserver = new ResizeObserver(resize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    resize();

    // Orb parameters: 8 moving centers to increase color richness and visual density
    const orbs = [
      { x: 0.2, y: 0.3, radius: 0.45, vx: 0.0006, vy: 0.0004, phase: 0 },
      { x: 0.8, y: 0.2, radius: 0.50, vx: -0.0005, vy: 0.0005, phase: Math.PI / 3 },
      { x: 0.5, y: 0.7, radius: 0.55, vx: 0.0004, vy: -0.0006, phase: Math.PI * (2/3) },
      { x: 0.1, y: 0.8, radius: 0.40, vx: -0.0004, vy: -0.0004, phase: Math.PI },
      { x: 0.3, y: 0.6, radius: 0.48, vx: 0.0005, vy: 0.0003, phase: Math.PI * 0.4 },
      { x: 0.7, y: 0.8, radius: 0.42, vx: -0.0003, vy: -0.0005, phase: Math.PI * 1.2 },
      { x: 0.9, y: 0.5, radius: 0.52, vx: 0.0004, vy: 0.0002, phase: Math.PI * 0.8 },
      { x: 0.4, y: 0.2, radius: 0.38, vx: -0.0005, vy: 0.0004, phase: Math.PI * 1.5 }
    ];

    // Real-Time Surveillance Telemetry Scope Nodes (High frequency radar crosshairs & trackers) - 26 rich nodes
    const telemetryCount = 26;
    const telemetries: Array<{
      x: number;
      y: number;
      radius: number;
      speedY: number;
      driftSpeed: number;
      rotation: number;
      rotSpeed: number;
      tag: string;
      status: 'nominal' | 'tracking' | 'active' | 'secure';
      pulse: number;
    }> = [];

    const telemetryTags = [
      'CAM-01', 'CAM-02', 'CAM-03', 'SENS-A', 'SENS-B', 
      'SEC-NET', 'BIO-A', 'ZONE-1', 'ZONE-2', 'GATE-09',
      'ROSTER', 'CLD-SQL', 'GEM-AI', 'AIR-P', 'BOI-T'
    ];

    for (let i = 0; i < telemetryCount; i++) {
      telemetries.push({
        x: Math.random() * 1.05 - 0.02,
        y: Math.random() * 1.1 - 0.05,
        radius: Math.random() * 16 + 12, // 12px to 28px
        speedY: Math.random() * 0.0003 + 0.0001, // slow float
        driftSpeed: Math.random() * 0.0002 - 0.0001,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() * 0.006 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
        tag: telemetryTags[i % telemetryTags.length] + `:${Math.floor(Math.random() * 90 + 10)}`,
        status: Math.random() > 0.8 ? 'active' : Math.random() > 0.6 ? 'tracking' : 'nominal',
        pulse: Math.random() * Math.PI
      });
    }

    // High performance sparkling dust particle nodes (increased to 72)
    const particleCount = 72;
    const particles: Array<{ x: number, y: number, r: number, alpha: number, speed: number, angle: number, color: string }> = [];

    const getParticleColor = (currentVibe: VibePreset) => {
      const isLight = document.documentElement.classList.contains('theme-light');
      if (isLight) {
        switch (currentVibe) {
          case 'aurora': return 'rgba(16, 185, 129, 0.4)'; // Emerald mint
          case 'nebula': return 'rgba(239, 68, 68, 0.4)';  // Scarlet red
          case 'cyberpunk': return 'rgba(236, 72, 153, 0.45)'; // Vibrant rose
          case 'monochrome': return 'rgba(100, 116, 139, 0.3)'; // Slate
        }
      }
      switch (currentVibe) {
        case 'aurora': return 'rgba(52, 211, 153, 0.25)'; // Emerald mint
        case 'nebula': return 'rgba(239, 68, 68, 0.25)';  // Radiant red
        case 'cyberpunk': return 'rgba(244, 63, 94, 0.3)'; // Neon pink
        case 'monochrome': return 'rgba(255, 255, 255, 0.15)';
      }
    };

    // Populate particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.1,
        speed: Math.random() * 0.001 + 0.0003,
        angle: Math.random() * Math.PI * 2,
        color: ''
      });
    }

    let time = 0;

    // Fluid render cycles running at native refresh speed (90/120Hz+)
    const draw = () => {
      const activeSettings = settingsRef.current;
      const isLight = document.documentElement.classList.contains('theme-light');

      // Update time increment
      time += 0.002 * activeSettings.speed;

      // Clear the canvas with theme background fallback
      ctx.clearRect(0, 0, width, height);

      // We compose an overarching background first
      if (isLight) {
        ctx.fillStyle = '#f8fafc'; // slate-50
      } else {
        ctx.fillStyle = '#09090b'; // dark slate
      }
      ctx.fillRect(0, 0, width, height);

      // Smooth coordinate easing for mouse
      if (targetMouseX !== -1000) {
        if (mouseX === -1000) {
          mouseX = targetMouseX;
          mouseY = targetMouseY;
        } else {
          mouseX += (targetMouseX - mouseX) * 0.08;
          mouseY += (targetMouseY - mouseY) * 0.08;
        }
      } else {
        mouseX = -1000;
        mouseY = -1000;
      }

      // Draw active orbs
      orbs.forEach((orb, index) => {
        // Move orbs in circular/sinusoidal patterns
        orb.phase += orb.vx * activeSettings.speed * 10;
        const currentX = (orb.x + Math.sin(orb.phase) * 0.15) * width;
        const currentY = (orb.y + Math.cos(orb.phase + index) * 0.15) * height;
        const currentRadius = orb.radius * Math.max(width, height) * 0.55;

        // Establish gorgeous fluid radial dynamic gradient colors
        const grad = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, currentRadius);
        
        let colorStop1 = '';
        const colorStop2 = 'rgba(0,0,0,0)';

        // High opacity vivid colors for both dark & light modes to respond to colorful requirement
        const opacity = isLight ? 0.35 : 0.18;

        switch (activeSettings.vibe) {
          case 'aurora':
            colorStop1 = index % 4 === 0 ? `rgba(16, 185, 129, ${opacity})`  // electric emerald
                       : index % 4 === 1 ? `rgba(6, 182, 212, ${opacity})`   // cyan
                       : index % 4 === 2 ? `rgba(79, 70, 229, ${opacity + 0.02})`   // royal indigo
                       : `rgba(245, 158, 11, ${opacity - 0.04})`;              // gold-yellow
            break;
          case 'nebula':
            colorStop1 = index % 4 === 0 ? `rgba(244, 63, 94, ${opacity + 0.02})`  // rose
                       : index % 4 === 1 ? `rgba(139, 92, 246, ${opacity})`  // violet
                       : index % 4 === 2 ? `rgba(239, 68, 68, ${opacity})`   // red
                       : `rgba(249, 115, 22, ${opacity - 0.04})`;              // stellar orange
            break;
          case 'cyberpunk':
            colorStop1 = index % 4 === 0 ? `rgba(236, 72, 153, ${opacity + 0.04})`   // hot pink
                       : index % 4 === 1 ? `rgba(6, 182, 212, ${opacity + 0.02})`   // vibrant cyan
                       : index % 4 === 2 ? `rgba(168, 85, 247, ${opacity})`  // space purple
                       : `rgba(234, 179, 8, ${opacity - 0.02})`;                // acid yellow
            break;
          case 'monochrome':
            colorStop1 = index % 2 === 0 
              ? (isLight ? `rgba(148, 163, 184, ${opacity - 0.08})` : `rgba(39, 39, 42, 0.25)`)
              : (isLight ? `rgba(203, 213, 225, ${opacity - 0.06})` : `rgba(82, 82, 91, 0.15)`);
            break;
        }

        grad.addColorStop(0, colorStop1);
        grad.addColorStop(1, colorStop2);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(currentX, currentY, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Interactive Dynamic Mouse Glow Aura & HUD Crosshair (extremely tactical precision)
      if (mouseX !== -1000) {
        // Subtle ambient mouse light glow
        const mouseRadius = Math.max(width, height) * 0.12;
        const mouseGrad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, mouseRadius);
        
        let mouseColor = 'rgba(239, 68, 68, 0.1)'; // Red alert core default
        if (isLight) {
          mouseColor = 'rgba(14, 165, 233, 0.12)'; // Soft water blue clicker
        } else {
          switch (activeSettings.vibe) {
            case 'aurora': mouseColor = 'rgba(52, 211, 153, 0.12)'; break;
            case 'nebula': mouseColor = 'rgba(239, 68, 68, 0.12)'; break;
            case 'cyberpunk': mouseColor = 'rgba(236, 72, 153, 0.12)'; break;
            case 'monochrome': mouseColor = 'rgba(255, 255, 255, 0.06)'; break;
          }
        }

        mouseGrad.addColorStop(0, mouseColor);
        mouseGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = mouseGrad;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, mouseRadius, 0, Math.PI * 2);
        ctx.fill();

        // 🎯 Tactical HUD Reticle tracking cursor
        ctx.save();
        ctx.lineWidth = 1;
        const strokeColor = isLight ? 'rgba(71, 85, 105, 0.16)' : 'rgba(239, 68, 68, 0.22)';
        ctx.strokeStyle = strokeColor;

        // Draw concentric coordinate crosshair ring
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 24, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Horizontal and vertical target guide ticks
        ctx.beginPath();
        ctx.moveTo(mouseX - 52, mouseY); ctx.lineTo(mouseX - 32, mouseY);
        ctx.moveTo(mouseX + 32, mouseY); ctx.lineTo(mouseX + 52, mouseY);
        ctx.moveTo(mouseX, mouseY - 52); ctx.lineTo(mouseX, mouseY - 32);
        ctx.moveTo(mouseX, mouseY + 32); ctx.lineTo(mouseX, mouseY + 52);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.4)' : 'rgba(239, 68, 68, 0.6)';
        ctx.fill();

        // Hud coordinate display values
        ctx.fillStyle = isLight ? 'rgba(74, 85, 104, 0.55)' : 'rgba(113, 113, 122, 0.6)';
        ctx.font = '7.5px monospace';
        ctx.fillText(`TRK_LOCK[X:${Math.floor(mouseX)}|Y:${Math.floor(mouseY)}]`, mouseX + 16, mouseY - 14);
        ctx.fillText(`NATIVE_CLK: 90Hz+ OK`, mouseX + 16, mouseY - 5);
        ctx.restore();
      }

      // Draw real-time spinning surveillance coordinate scopes instead of kids' bubbles!
      telemetries.forEach((node, idx) => {
        // Gently move upward
        node.y -= node.speedY * activeSettings.speed;
        node.x += node.driftSpeed * activeSettings.speed + Math.sin(time * 2 + idx) * 0.0002 * activeSettings.speed;
        node.rotation += node.rotSpeed * activeSettings.speed;
        node.pulse += 0.01;

        // Wrap boundaries
        if (node.y < -0.1) {
          node.y = 1.1;
          node.x = Math.random() * 1.05 - 0.02;
        }
        if (node.x < -0.1) node.x = 1.1;
        if (node.x > 1.1) node.x = -0.1;

        const nx = node.x * width;
        const ny = node.y * height;
        const rad = node.radius + Math.sin(node.pulse) * 1.5; // pulsating

        // Pick neon line color and glass overlays for widgets
        let strokeColor = '';
        let textColor = '';
        let fillColor = '';
        
        if (isLight) {
          switch (activeSettings.vibe) {
            case 'aurora':
              strokeColor = node.status === 'active' ? 'rgba(239, 68, 68, 0.55)' : 'rgba(16, 185, 129, 0.48)';
              textColor = node.status === 'active' ? 'rgba(220, 38, 38, 0.85)' : 'rgba(5, 150, 105, 0.82)';
              fillColor = node.status === 'active' ? 'rgba(254, 226, 226, 0.45)' : 'rgba(209, 250, 229, 0.35)';
              break;
            case 'nebula':
              strokeColor = node.status === 'active' ? 'rgba(139, 92, 246, 0.55)' : 'rgba(239, 68, 68, 0.48)';
              textColor = node.status === 'active' ? 'rgba(109, 40, 217, 0.85)' : 'rgba(220, 38, 38, 0.82)';
              fillColor = node.status === 'active' ? 'rgba(243, 232, 255, 0.45)' : 'rgba(254, 226, 226, 0.35)';
              break;
            case 'cyberpunk':
              strokeColor = node.status === 'active' ? 'rgba(236, 72, 153, 0.55)' : 'rgba(6, 182, 212, 0.55)';
              textColor = node.status === 'active' ? 'rgba(219, 39, 119, 0.85)' : 'rgba(13, 148, 136, 0.85)';
              fillColor = node.status === 'active' ? 'rgba(253, 242, 119, 0.38)' : 'rgba(204, 251, 241, 0.45)';
              break;
            case 'monochrome':
              strokeColor = 'rgba(71, 85, 105, 0.4)';
              textColor = 'rgba(15, 23, 42, 0.75)';
              fillColor = 'rgba(241, 245, 249, 0.5)';
              break;
          }
        } else {
          switch (activeSettings.vibe) {
            case 'aurora':
              strokeColor = node.status === 'active' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(52, 211, 153, 0.24)';
              textColor = 'rgba(161, 161, 170, 0.5)';
              fillColor = node.status === 'active' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(52, 211, 153, 0.04)';
              break;
            case 'nebula':
              strokeColor = 'rgba(139, 92, 246, 0.3)';
              textColor = 'rgba(161, 161, 170, 0.5)';
              fillColor = 'rgba(139, 92, 246, 0.04)';
              break;
            case 'cyberpunk':
              strokeColor = node.status === 'active' ? 'rgba(244, 63, 94, 0.35)' : 'rgba(34, 211, 238, 0.32)';
              textColor = 'rgba(161, 161, 170, 0.5)';
              fillColor = node.status === 'active' ? 'rgba(244, 63, 94, 0.05)' : 'rgba(34, 211, 238, 0.04)';
              break;
            case 'monochrome':
              strokeColor = 'rgba(255, 255, 255, 0.08)';
              textColor = 'rgba(255, 255, 255, 0.22)';
              fillColor = 'rgba(255, 255, 255, 0.02)';
              break;
          }
        }

        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 0.5;

        // Draw translucent high-tech center glass plate fill first
        ctx.beginPath();
        ctx.arc(nx, ny, rad, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();

        // Draw dotted concentric ring
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.arc(nx, ny, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw solid smaller safe gate ring
        ctx.beginPath();
        ctx.arc(nx, ny, rad * 0.65, 0, Math.PI * 2);
        ctx.stroke();

        // Draw concentric rotating telemetry angles
        ctx.translate(nx, ny);
        ctx.rotate(node.rotation);

        const tickLength = rad * 0.24;
        ctx.beginPath();
        // Top right tick
        ctx.moveTo(rad - tickLength, -rad + tickLength);
        ctx.lineTo(rad, -rad);
        
        // Bottom left tick
        ctx.moveTo(-rad + tickLength, rad - tickLength);
        ctx.lineTo(-rad, rad);
        ctx.stroke();

        ctx.restore();

        // Tiny center locator crosshairs
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(nx - 3, ny); ctx.lineTo(nx + 3, ny);
        ctx.moveTo(nx, ny - 3); ctx.lineTo(nx, ny + 3);
        ctx.stroke();

        // Print tiny tactical telemetry tags
        ctx.fillStyle = textColor;
        ctx.font = '6.5px monospace';
        ctx.fillText(`[${node.tag}] ${node.status}`, nx + rad + 4, ny + 3.5);
      });

      // Live High Frequency Particle Flow Sparkles
      if (activeSettings.particlesActive) {
        particles.forEach((p) => {
          p.angle += p.speed * activeSettings.speed;
          p.x += Math.cos(p.angle) * 0.0001 * activeSettings.speed;
          p.y += Math.sin(p.angle) * 0.0001 * activeSettings.speed;

          if (p.x < 0) p.x = 1;
          if (p.x > 1) p.x = 0;
          if (p.y < 0) p.y = 1;
          if (p.y > 1) p.y = 0;

          const px = p.x * width;
          const py = p.y * height;

          ctx.fillStyle = getParticleColor(activeSettings.vibe);
          ctx.beginPath();
          ctx.arc(px, py, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Elegant grid alignment overlay (surveillance digital aesthetic)
      ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.015)' : 'rgba(255, 255, 255, 0.01)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Request next frame at native browser speed (which supports high 90Hz/120Hz refresh rates automatically)
      animationFrameId = requestAnimationFrame(draw);
    };

    // Begin drawing
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      resizeObserver.disconnect();
    };
  }, [vibe, quality]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 -z-50 w-full h-full overflow-hidden" 
      id="cosmic-aura-canvas-container"
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block transition-opacity duration-700" 
        style={{ imageRendering: quality === 'eco' ? 'pixelated' : 'auto' }}
      />

      {/* Visual Floating Aura Customizer Utility Widget */}
      <div className="absolute top-14 right-4 z-40 hidden md:block">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="btn-glass p-2 rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:border-red-500/30 transition-all duration-300 group"
          title="Customize Aura Dynamics"
          id="custom-background-aurora-btn"
        >
          <Sliders className="w-3.5 h-3.5 text-red-400 group-hover:rotate-45 transition duration-500" />
          <span className="text-[10px] uppercase font-mono max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-1.5 transition-all duration-500 whitespace-nowrap">
            Aura Style
          </span>
        </button>

        {showConfig && (
          <div className="absolute right-0 mt-2 p-3.5 bg-zinc-950/95 border border-zinc-850 rounded-2xl w-56 shadow-2xl space-y-3.5 font-mono text-[10px] text-zinc-300 animate-fadeIn" id="canvas-aura-config-flyout">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-1.5">
              <span className="font-bold text-white uppercase tracking-wider text-[9px] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-red-500" /> Glow Synthesizer
              </span>
              <span className="text-[8px] bg-red-950/40 text-red-400 px-1 rounded">90Hz+ READY</span>
            </div>

            {/* Vibe Selection Options */}
            <div className="space-y-1">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider">Aesthetic Hue Map</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['aurora', 'nebula', 'cyberpunk', 'monochrome'] as VibePreset[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVibe(v)}
                    className={`p-1 rounded text-center transition cursor-pointer text-[9px] font-bold uppercase tracking-wide border ${
                      vibe === v 
                        ? 'bg-red-950/20 border-red-500/40 text-white shadow-sm' 
                        : 'bg-zinc-900 border-zinc-900 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality controls to toggle between ultimate and super eco */}
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Resolution Render</span>
              <div className="flex gap-1 bg-zinc-900 p-0.5 rounded border border-zinc-800">
                <button
                  onClick={() => setQuality('high')}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${quality === 'high' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-550'}`}
                >
                  HIGH
                </button>
                <button
                  onClick={() => setQuality('eco')}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${quality === 'eco' ? 'bg-zinc-800 text-amber-500' : 'text-zinc-550'}`}
                >
                  ECO
                </button>
              </div>
            </div>

            {/* Floating Sparks switches */}
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Sparkle Drift Core</span>
              <button
                onClick={() => setParticlesActive(!particlesActive)}
                className={`px-2 py-0.5 rounded text-[8px] font-bold border transition ${
                  particlesActive 
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400' 
                    : 'bg-zinc-900 border-zinc-900 text-zinc-650'
                }`}
              >
                {particlesActive ? 'RENDERED' : 'PAUSED'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
