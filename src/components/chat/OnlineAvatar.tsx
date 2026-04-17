import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface OnlineAvatarProps {
  src: string;
  name: string;
  size?: "sm" | "md" | "lg";
  online?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

const dotSizeClasses = {
  sm: "w-2.5 h-2.5 border-[1.5px]",
  md: "w-3 h-3 border-2",
  lg: "w-3.5 h-3.5 border-2",
};

export function OnlineAvatar({ src, name, size = "md", online = false, className }: OnlineAvatarProps) {
  const initials = name.split(" ").map((n) => n[0]).join("");

  return (
    <div className={cn("relative shrink-0", className)}>
      <Avatar className={cn(sizeClasses[size], "shrink-0")}>
        <AvatarImage src={src} alt={name} />
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      {online && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full bg-[#10B981] border-background",
            dotSizeClasses[size]
          )}
        />
      )}
    </div>
  );
}
