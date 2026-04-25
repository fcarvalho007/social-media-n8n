import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isMobile = useIsMobile();

  // Posicionamento responsivo:
  //  - Mobile → topo-centro (longe da barra fixa global de acções).
  //  - Desktop → canto inferior-direito, com offset dinâmico para nunca
  //    ficar tapado pela `PublishActionsCard` (`--sticky-bar-height`,
  //    actualizada via ResizeObserver). Fallback 72px para o primeiro
  //    paint antes do observer correr.
  const position: ToasterProps["position"] = isMobile ? "top-center" : "bottom-right";
  const offset = isMobile ? undefined : "calc(var(--sticky-bar-height, 72px) + 16px)";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={5000}
      position={position}
      offset={offset}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:!border-red-500/50",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
