import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TrustMeterProps {
  score: number;
  className?: string;
}

export default function TrustMeter({ score, className }: TrustMeterProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-success";
    if (score >= 6) return "text-warning";
    return "text-danger";
  };

  const getProgressColor = (score: number) => {
    if (score >= 8) return "bg-gradient-to-r from-green-500 to-green-600";
    if (score >= 6) return "bg-gradient-to-r from-yellow-500 to-orange-500";
    return "bg-gradient-to-r from-red-500 to-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return "Excellent";
    if (score >= 6) return "Good";
    if (score >= 4) return "Fair";
    return "Poor";
  };

  return (
    <div className={cn("", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
          Rating
        </span>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold transition-all duration-300", getScoreColor(score))}>
            {score.toFixed(1)}/10
          </span>
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full transition-all duration-300", 
            score >= 8 ? "bg-success/10 text-success" :
            score >= 6 ? "bg-warning/10 text-warning" :
            score >= 4 ? "bg-orange-100 text-orange-700" :
            "bg-danger/10 text-danger"
          )}>
            {getScoreLabel(score)}
          </span>
        </div>
      </div>
      <div className="relative">
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div 
            className={cn("h-2 rounded-full transition-all duration-1000 ease-out shadow-sm", getProgressColor(score))}
            style={{ width: `${score * 10}%` }}
          ></div>
        </div>
        <div className="absolute -top-1 left-0 w-1 h-4 bg-border rounded-full"></div>
        <div className="absolute -top-1 right-0 w-1 h-4 bg-border rounded-full"></div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span className="font-medium">Low</span>
        <span className="font-medium">High</span>
      </div>
    </div>
  );
}
