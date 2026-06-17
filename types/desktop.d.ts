export {};

declare global {
  interface Window {
    kasaDesktop?: {
      collapseOverlay: () => Promise<boolean>;
      collapseSetup: () => Promise<boolean>;
      closeWindow: () => Promise<boolean>;
      endOverlay: () => Promise<boolean>;
      expandOverlay: (payload?: {
        mode?: "chat" | "compact" | "result";
      }) => Promise<boolean>;
      expandSetup: () => Promise<boolean>;
      getPlatform: () => Promise<NodeJS.Platform>;
      getScreenSnapshot: () => Promise<{
        dataUrl?: string;
        error?: string;
        permissionRequired?: boolean;
      }>;
      minimizeWindow: () => Promise<boolean>;
      onSession: (
        callback: (payload: { sessionId?: string }) => void
      ) => () => void;
      openOverlay: (payload: { sessionId: string }) => Promise<boolean>;
      openLogin: () => Promise<boolean>;
      resizeOverlay: (payload: {
        height: number;
        width: number;
      }) => Promise<boolean>;
      setOverlayMode: (mode: "chat" | "compact" | "result") => Promise<boolean>;
      setOpacity: (opacity: number) => Promise<number>;
      toggleAlwaysOnTop: () => Promise<boolean>;
    };
  }
}
