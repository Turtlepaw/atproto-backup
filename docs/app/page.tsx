"use client";

import Image from "next/image";
import React from "react";
import {
  CloudOff,
  Download,
  FolderGit2,
  Pause,
  Play,
  RefreshCcw,
} from "lucide-react";
import { useThemeConfig } from "nextra-theme-docs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Accordion styling constants
const ACCORDION_TRIGGER_CLASSES =
  "flex items-center justify-between gap-2 text-lg font-medium bg-black/5 dark:bg-white/5 rounded-md px-4 py-3 cursor-pointer hover:no-underline hover:bg-black/8 dark:hover:bg-white/8 transition";
const ACCORDION_CONTENT_CLASSES =
  "mt-2 text-black/75 dark:text-white/75 text-base rounded-md p-4";

function getOS(): "windows" | "macos" | "linux" | "unknown" {
  if (typeof window === "undefined") return "unknown";
  const ua = window.navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macos";
  if (/Linux/i.test(ua)) return "linux";
  return "unknown";
}

function useOS() {
  const [os, setOS] = React.useState<ReturnType<typeof getOS>>("unknown");
  React.useEffect(() => {
    setOS(getOS());
  }, []);
  return os;
}

const DOWNLOADS = {
  windows: {
    text: "Download for Windows",
    url: "https://example.com/atbackup-windows.exe",
  },
  macos: {
    text: "Download for macOS",
    url: "https://example.com/atbackup-macos.dmg",
  },
  linux: {
    text: "Download for Linux",
    url: "https://example.com/atbackup-linux.AppImage",
  },
  unknown: {
    text: "Download",
    url: "https://example.com/atbackup",
  },
};

export default function Page() {
  const os = useOS();
  const { text } = DOWNLOADS[os];
  const url = "https://github.com/Turtlepaw/atproto-backup/releases/latest";
  const { darkMode, docsRepositoryBase } = useThemeConfig();

  return (
    <div>
      <div
        className={`flex flex-col md:flex-row items-center justify-center gap-8 min-h-[60vh] p-8 ${
          darkMode ? "bg-black" : "bg-white"
        }/70`}
      >
        <div>
          <h1 className="text-[2.5rem] font-bold text-black dark:text-white m-0 max-w-[350px] leading-tight">
            One-click local backups of your atproto data
          </h1>
          <p className="text-lg text-black/80 dark:text-white/80 mt-4 max-w-[350px]">
            Easily back up your Bluesky posts, likes, and other records (e.g.
            other AT Protocol app data) to your computer's filesystem.
          </p>
          <a
            href={url}
            className="mt-6 px-6 py-3 dark:bg-white bg-black dark:text-black text-white rounded-md hover:bg-black/80 dark:hover:bg-white/80 transition-colors inline-block"
            download
          >
            <div className="flex items-center gap-2 font-medium">
              <Download />
              {text}
            </div>
          </a>
        </div>
        <div className="relative mt-8 md:mt-0">
          <div className="absolute inset-0 rounded-xl blur-[100px] opacity-60 bg-[#c3b297]/20 pointer-events-none" />
          <Image
            src="/app.png"
            alt="Image of ATBackup"
            width={500}
            height={500}
            className="shadow-md relative z-10 border-[1px] border-white/5 rounded-md"
          />
        </div>
      </div>
      <div className="w-full h-[0.5px] bg-white/10 mb-4" />

      <div className="flex flex-col items-center w-full">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 min-h-[60vh] p-8">
          <div>
            <VideoPlayer className="w-lg" />
          </div>
          <div className="relative mt-8 md:mt-0">
            <h1 className="text-[2.5rem] font-bold text-black dark:text-white m-0 max-w-[350px] leading-tight">
              Intuitive and cozy
            </h1>
            <p className="text-lg text-black/80 dark:text-white/80 mt-4 max-w-[350px]">
              See how easy it is to save your Bluesky data to your computer.
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center max-w[800px] mx-auto my-16 px-4 w-full">
        <Accordion
          type="single"
          collapsible
          className="w-full max-w-2xl flex flex-col gap-4"
        >
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className={ACCORDION_TRIGGER_CLASSES}>
              <div className="flex items-center gap-4">
                <RefreshCcw size={20} />
                <span className="text-left">Unified backup format</span>
              </div>
              <span className="ml-auto" />
            </AccordionTrigger>
            <AccordionContent className={ACCORDION_CONTENT_CLASSES}>
              Your data is saved as a CAR file, which Bluesky uses, and blobs
              are stored as their original format (in blob files). This ensures
              you can restore your data in the future by yourself.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2" className="border-none">
            <AccordionTrigger className={ACCORDION_TRIGGER_CLASSES}>
              <div className="flex items-center gap-4">
                <CloudOff size={20} />
                <span className="text-left">Local only</span>
              </div>
              <span className="ml-auto" />
            </AccordionTrigger>
            <AccordionContent className={ACCORDION_CONTENT_CLASSES}>
              Your backups are saved directly to your computer's file system, in
              documents, ensuring you always have access. If you prefer cloud
              storage, you can tools like{" "}
              <a
                href="https://bsky.storage"
                className="text-blue-500 underline"
              >
                Storacha
              </a>.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger className={ACCORDION_TRIGGER_CLASSES}>
              <div className="flex items-center gap-4">
                <FolderGit2 size={20} />
                <span className="text-left">Open-source</span>
              </div>
              <span className="ml-auto" />
            </AccordionTrigger>
            <AccordionContent className={ACCORDION_CONTENT_CLASSES}>
              We're completly open-source, star us on{" "}
              <a
                href="https://github.com/Turtlepaw/atproto-backup"
                className="text-blue-500 underline"
              >
                GitHub
              </a>{" "}
              or{" "}
              <a
                href="https://tangled.org/did:plc:5fzwpxt3rctfetyqpbigvgic/atbackup"
                className="text-blue-500 underline"
              >
                Tangled
              </a>. We're also happy to merge your pull request! (mention us on
              Bluesky if we're a little slow)
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

function VideoPlayer({ className = "" }: { className?: string }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(true);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.play();
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  const Component = playing ? Pause : Play;

  return (
    <div
      className={`relative flex flex-col items-center ${className}`}
      style={{ maxWidth: 500, width: "100%" }}
    >
      <video
        ref={videoRef}
        src="/atbackup_progress.mp4"
        className="rounded-lg shadow w-full"
        tabIndex={-1}
        controls={false}
      />
      <button
        onClick={togglePlay}
        className="absolute bottom-3 right-3 p-2 bg-black/80 border-[1px] border-white/10 backdrop-blur-sm rounded-[100rem] hover:bg-black/50 transition cursor-pointer"
        aria-label={playing ? "Pause video" : "Play video"}
        style={{ pointerEvents: "auto" }}
      >
        <Component className="text-white" width={20} height={20} />
      </button>
    </div>
  );
}
