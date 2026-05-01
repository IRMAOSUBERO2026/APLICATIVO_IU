import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3A5C35] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-[#3A5C35] text-white hover:bg-[#2D4A29] shadow-[#3A5C35]/10",
        destructive: "bg-[#FDECEA] text-[#B91C1C] hover:bg-[#FADCD9] border border-[#B91C1C]/10",
        outline: "border border-[#D0D5DD] bg-white text-[#1A1A1A] hover:bg-[#F4F5F6]",
        secondary: "bg-white border border-[#3A5C35] text-[#3A5C35] hover:bg-[#F9FBF8]",
        ghost: "text-[#6B6B6B] hover:bg-[#F4F5F6] hover:text-[#1A1A1A]",
        link: "text-[#3A5C35] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-[18px] py-[8px]",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
