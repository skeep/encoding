import { useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

export function useResizableSplit(
  initialLeftPercent = 40
): {
  mainRef: MutableRefObject<HTMLElement | null>;
  leftPanePercent: number;
  isResizing: boolean;
  setIsResizing: Dispatch<SetStateAction<boolean>>;
} {
  const [leftPanePercent, setLeftPanePercent] = useState(initialLeftPercent);
  const [isResizing, setIsResizing] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function handlePointerMove(event: MouseEvent): void {
      if (!isResizing || !mainRef.current) {
        return;
      }
      const rect = mainRef.current.getBoundingClientRect();
      const raw = ((event.clientX - rect.left) / rect.width) * 100;
      // Left pane range 30-60 => right pane range 70-40.
      const clamped = Math.max(30, Math.min(60, raw));
      setLeftPanePercent(clamped);
    }

    function handlePointerUp(): void {
      setIsResizing(false);
    }

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      document.body.classList.add("is-resizing-divider");
    } else {
      document.body.classList.remove("is-resizing-divider");
    }
    return () => {
      document.body.classList.remove("is-resizing-divider");
    };
  }, [isResizing]);

  return { mainRef, leftPanePercent, isResizing, setIsResizing };
}
