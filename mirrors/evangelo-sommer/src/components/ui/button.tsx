import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold uppercase tracking-wide transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 font-primary",
  {
    variants: {
      variant: {
        default: "bg-tactical-gold text-tactical-gray-900 hover:bg-tactical-amber border-0 hover:shadow-tactical",
        destructive: "bg-tactical-red text-tactical-white hover:bg-red-700 border-0",
        outline: "border-2 border-tactical-gold bg-transparent text-hud-text-primary hover:bg-tactical-gold hover:text-tactical-gray-900",
        secondary: "bg-hud-background-secondary text-hud-text-primary hover:bg-tactical-gray-600 border-0",
        ghost: "hover:bg-hud-background-secondary hover:text-hud-text-primary text-hud-text-secondary",
        link: "text-tactical-gold underline-offset-4 hover:underline hover:text-tactical-amber",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
