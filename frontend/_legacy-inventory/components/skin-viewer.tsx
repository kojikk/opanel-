import { useEffect, useRef } from "react";
import MinecraftSkinViewer from "minecraft-skin-viewer";
import { getSettings } from "@/lib/settings";

export function SkinViewer({
  name,
  uuid
}: {
  name: string
  uuid: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if(!canvasRef.current) return;

    new MinecraftSkinViewer({
      canvas: canvasRef.current,
      skin: getSettings("players.skin-provider") + name,
      cape: getSettings("players.cape-provider") + uuid
    });
  }, [name, uuid]);

  return <canvas ref={canvasRef}/>;
}
