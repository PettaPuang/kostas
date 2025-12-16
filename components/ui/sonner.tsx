"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="h-3 w-3 lg:h-4 lg:w-4" />,
        info: <InfoIcon className="h-3 w-3 lg:h-4 lg:w-4" />,
        warning: <TriangleAlertIcon className="h-3 w-3 lg:h-4 lg:w-4" />,
        error: <OctagonXIcon className="h-3 w-3 lg:h-4 lg:w-4" />,
        loading: <Loader2Icon className="h-3 w-3 lg:h-4 lg:w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "text-xs lg:text-sm p-2 lg:p-3 gap-1.5 lg:gap-2 bg-black/60 backdrop-blur-md border-2 border-orange-500/50 text-white",
          title: "text-xs lg:text-sm font-medium text-white",
          description: "text-[10px] lg:text-xs text-white/70",
          actionButton: "text-xs lg:text-sm h-6 lg:h-7 px-2 lg:px-3 bg-orange-500/90 hover:bg-orange-500 text-white",
          cancelButton: "text-xs lg:text-sm h-6 lg:h-7 px-2 lg:px-3 border-orange-500/50 text-white hover:bg-orange-500/20",
          success: "bg-black/60 backdrop-blur-md border-2 border-green-500/50 text-white",
          error: "bg-black/60 backdrop-blur-md border-2 border-red-500/50 text-white",
          warning: "bg-black/60 backdrop-blur-md border-2 border-yellow-500/50 text-white",
          info: "bg-black/60 backdrop-blur-md border-2 border-blue-500/50 text-white",
        },
      }}
      style={
        {
          "--normal-bg": "rgba(0, 0, 0, 0.6)",
          "--normal-text": "rgba(255, 255, 255, 1)",
          "--normal-border": "rgba(249, 115, 22, 0.5)",
          "--success-bg": "rgba(0, 0, 0, 0.6)",
          "--success-text": "rgba(255, 255, 255, 1)",
          "--success-border": "rgba(34, 197, 94, 0.5)",
          "--error-bg": "rgba(0, 0, 0, 0.6)",
          "--error-text": "rgba(255, 255, 255, 1)",
          "--error-border": "rgba(239, 68, 68, 0.5)",
          "--warning-bg": "rgba(0, 0, 0, 0.6)",
          "--warning-text": "rgba(255, 255, 255, 1)",
          "--warning-border": "rgba(234, 179, 8, 0.5)",
          "--info-bg": "rgba(0, 0, 0, 0.6)",
          "--info-text": "rgba(255, 255, 255, 1)",
          "--info-border": "rgba(59, 130, 246, 0.5)",
          "--border-radius": "0.5rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
