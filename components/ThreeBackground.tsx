"use client";

import { useEffect, useRef } from "react";
import type { Timer, PerspectiveCamera, Points, PointsMaterial, Scene, WebGLRenderer } from "three";

export default function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let mounted = true;
    let raf = 0;
    let renderer: WebGLRenderer | null = null;
    let scene: Scene | null = null;
    let camera: PerspectiveCamera | null = null;
    let points: Points | null = null;
    let pointsMaterial: PointsMaterial | null = null;
    let timer: Timer | null = null;

    let resizeHandler: (() => void) | null = null;
    let mouseHandler: ((e: PointerEvent) => void) | null = null;

    async function init() {
      const lowCores = (navigator.hardwareConcurrency ?? 4) <= 2;
      const lowMemory = (navigator.deviceMemory ?? 4) <= 2;
      const reducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const smallScreen = window.innerWidth < 600;

      if (lowCores || lowMemory || reducedMotion || smallScreen) {
        mounted = false;
        return;
      }

      const THREE = await import("three");
      if (!mounted || !canvas) return;

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        1,
        2000
      );
      camera.position.z = 320;

      const count = Math.min(
        1500,
        Math.max(350, Math.floor((window.innerWidth * window.innerHeight) / 1300))
      );
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] = (Math.random() - 0.5) * 1300;
        positions[i + 1] = (Math.random() - 0.5) * 800;
        positions[i + 2] = (Math.random() - 0.5) * 600;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      pointsMaterial = new THREE.PointsMaterial({
        size: 1.7,
        color: new THREE.Color("#7c5cff"),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });

      points = new THREE.Points(geometry, pointsMaterial);
      scene.add(points);

      const syncSize = () => {
        if (!renderer || !camera) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      resizeHandler = syncSize;
      window.addEventListener("resize", syncSize);
      syncSize();

      let mouseX = 0;
      let mouseY = 0;
      mouseHandler = (e: PointerEvent) => {
        mouseX = e.clientX / window.innerWidth - 0.5;
        mouseY = e.clientY / window.innerHeight - 0.5;
      };
      window.addEventListener("pointermove", mouseHandler);

      const prefersReduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      timer = new THREE.Timer();

      const themeColor = () => {
        const el = document.documentElement;
        const color = getComputedStyle(el).getPropertyValue("--accent").trim() || "#7c5cff";
        const isLight = getComputedStyle(el).colorScheme === "light";
        return { color, opacity: isLight ? 0.32 : 0.5 };
      };

      const draw = () => {
        if (!mounted) return;
        raf = requestAnimationFrame(draw);
        if (!renderer || !scene || !camera || !points || !pointsMaterial || !timer) return;
        timer.update();
        const t = timer.getElapsed();
        const { color, opacity } = themeColor();
        pointsMaterial.color.set(color);
        pointsMaterial.opacity = opacity;

        const attr = points.geometry.getAttribute("position");
        const arr = attr.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] += Math.sin(t * 0.4 + arr[i] * 0.008) * 0.12;
        }
        attr.needsUpdate = true;
        points.rotation.y = t * 0.02 + mouseX * 0.25;
        points.rotation.x = mouseY * 0.18;
        renderer.render(scene, camera);
      };

      if (prefersReduced) {
        const { color, opacity } = themeColor();
        pointsMaterial.color.set(color);
        pointsMaterial.opacity = opacity;
        renderer.render(scene, camera);
      } else {
        draw();
      }
    }

    init();

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (mouseHandler) window.removeEventListener("pointermove", mouseHandler);
      timer?.dispose();
      renderer?.dispose();
      renderer = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
