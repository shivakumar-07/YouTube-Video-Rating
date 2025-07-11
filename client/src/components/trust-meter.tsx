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
    if (score >= 8) return "bg-success";
    if (score >= 6) return "bg-warning";
    return "bg-danger";
  };

  return (
    <div className={cn("", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Trust Score</span>
        <span className={cn("text-sm font-bold", getScoreColor(score))}>
          {score.toFixed(1)}/10
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
        <div 
          className={cn("h-2 rounded-full transition-all duration-300", getProgressColor(score))}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Low Trust</span>
        <span>High Trust</span>
      </div>
    </div>
  );
}
