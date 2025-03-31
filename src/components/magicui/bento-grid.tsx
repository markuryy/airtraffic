import { ArrowRightIcon } from "@radix-ui/react-icons";
import { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className?: string;
  color?: string;
  colorFrom?: string;
  colorTo?: string;
  Icon: React.ElementType;
  description: string;
  href: string;
  cta: string;
  children?: ReactNode;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 md:grid-cols-3 gap-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  color = "blue",
  colorFrom,
  colorTo,
  Icon,
  description,
  href,
  cta,
  children,
  ...props
}: BentoCardProps) => {
  // Define color schemes for different card types
  const colorSchemes: Record<string, { from: string, to: string, border: string, shadow: string, text: string, button: string }> = {
    blue: {
      from: "from-blue-800",
      to: "to-blue-900",
      border: "border-blue-700",
      shadow: "shadow-blue-500/20",
      text: "text-blue-100",
      button: "bg-blue-600"
    },
    indigo: {
      from: "from-indigo-800",
      to: "to-indigo-900",
      border: "border-indigo-700",
      shadow: "shadow-indigo-500/20",
      text: "text-indigo-100",
      button: "bg-indigo-600"
    },
    purple: {
      from: "from-purple-800",
      to: "to-purple-900",
      border: "border-purple-700",
      shadow: "shadow-purple-500/20",
      text: "text-purple-100",
      button: "bg-purple-600"
    },
    cyan: {
      from: "from-cyan-800",
      to: "to-cyan-900",
      border: "border-cyan-700",
      shadow: "shadow-cyan-500/20",
      text: "text-cyan-100",
      button: "bg-cyan-600"
    },
    green: {
      from: "from-green-800",
      to: "to-green-900",
      border: "border-green-700",
      shadow: "shadow-green-500/20",
      text: "text-green-100",
      button: "bg-green-600"
    },
    red: {
      from: "from-red-900",
      to: "to-red-950",
      border: "border-red-800",
      shadow: "shadow-red-500/20",
      text: "text-red-100",
      button: "bg-red-700"
    }
  };

  const scheme = colorSchemes[color];
  const customFrom = colorFrom || scheme.from;
  const customTo = colorTo || scheme.to;

  return (
    <div
      key={name}
      className={cn(
        "group relative col-span-1 md:col-span-1 flex flex-col justify-between overflow-hidden rounded-xl",
        "h-full transition-all duration-300 transform-gpu will-change-transform hover:scale-[1.02] hover:z-10",
        "bg-card text-card-foreground border",
        `hover:${scheme.shadow} hover:shadow-xl hover:bg-gradient-to-br hover:${customFrom} hover:${customTo} hover:${scheme.border}`,
        className,
      )}
      {...props}
    >
      <div className="flex flex-col h-full">
        <div className="p-6 pb-3 flex items-center gap-2 border-b border-border/40">
          <Icon className={`h-5 w-5 text-${color}-500 group-hover:${scheme.text}`} />
          <h3 className={`text-xl font-semibold group-hover:${scheme.text}`}>
            {name}
          </h3>
        </div>
        <div className="p-6 flex-grow">
          <p className={`text-muted-foreground mb-4 group-hover:${scheme.text}`}>
            {description}
          </p>
          {children}
        </div>
        <div className="p-6 pt-3 border-t border-border/40 mt-auto">
          <Button 
            asChild 
            className={`w-full group-hover:${scheme.button} group-hover:${scheme.text}`}
          >
            <Link href={href}>
              {cta}
              <ArrowRightIcon className="ms-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Animated hover effect overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-0 bg-gradient-to-br from-transparent to-black/5 transition-all duration-300 group-hover:opacity-100" />
    </div>
  );
};

export { BentoCard, BentoGrid };
