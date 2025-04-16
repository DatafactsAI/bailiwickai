import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium tracking-wide ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm hover:shadow-md active:shadow-inner active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-gray-700 hover:bg-primary/20",
        destructive:
          "bg-destructive/10 text-gray-700 hover:bg-destructive/20",
        outline:
          "border border-input bg-background text-gray-700 hover:bg-accent/50 hover:text-gray-800",
        secondary:
          "bg-secondary/50 text-gray-700 hover:bg-secondary/70",
        ghost: "text-gray-700 hover:bg-accent/30 hover:text-gray-800",
        link: "text-primary underline-offset-4 hover:underline shadow-none",
        blue: "bg-blue-100 text-gray-700 hover:bg-blue-200",
        purple: "bg-purple-100 text-gray-700 hover:bg-purple-200",
        green: "bg-green-100 text-gray-700 hover:bg-green-200",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-9 rounded-lg px-4 py-2 text-xs",
        lg: "h-11 rounded-xl px-8 py-3 text-base",
        icon: "h-10 w-10 rounded-full",
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
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
