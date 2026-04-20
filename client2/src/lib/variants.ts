import { cva } from "class-variance-authority";

export const badgeVariants = cva(
    "inline-flex items-center rounded-2xl border px-2.5 py-0.5 text-xs font-semibold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
      variants: {
        variant: {
          default:
            "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
          secondary:
            "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
          destructive:
            "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
          outline: "text-foreground",
        },
      },
      defaultVariants: {
        variant: "default",
      },
    }
  )

export const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-3xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:hover:scale-100 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    {
      variants: {
        variant: {
          default:
            "bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:brightness-105 border-2 border-[#F9C74F]/50",
          destructive:
            "bg-destructive text-white shadow-lg hover:shadow-xl hover:brightness-105 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 rounded-3xl",
          outline:
            "border-2 border-[#F9C74F]/60 bg-background shadow-md hover:shadow-lg hover:bg-[#FFF9E6] hover:border-[#FFCC00]/70 dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
          secondary:
            "bg-secondary text-secondary-foreground shadow-md hover:shadow-lg hover:brightness-105 border-2 border-[#F9C74F]/30",
          ghost:
            "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 shadow-none hover:scale-100",
          link: "text-primary underline-offset-4 hover:underline shadow-none hover:scale-100 rounded-none",
        },
        size: {
          default: "h-10 px-5 py-2 has-[>svg]:px-4",
          sm: "h-9 rounded-2xl gap-1.5 px-4 has-[>svg]:px-3",
          lg: "h-12 rounded-3xl px-8 text-base has-[>svg]:px-6",
          icon: "size-10 rounded-2xl",
        },
      },
      defaultVariants: {
        variant: "default",
        size: "default",
      },
    }
  )
