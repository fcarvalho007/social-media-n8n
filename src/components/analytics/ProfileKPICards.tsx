import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, TrendingUp, BadgeCheck, Building2 } from "lucide-react";
import { InstagramProfile } from "@/hooks/useInstagramProfiles";
import { motion } from "framer-motion";

interface ProfileKPICardsProps {
  profiles: InstagramProfile[];
}

export function ProfileKPICards({ profiles }: ProfileKPICardsProps) {
  const totalFollowers = profiles.reduce((sum, p) => sum + (p.followers_count || 0), 0);
  const avgFollowers = profiles.length > 0 ? Math.round(totalFollowers / profiles.length) : 0;
  
  const avgRatio = profiles.length > 0
    ? profiles.reduce((sum, p) => {
        const ratio = p.follows_count > 0 ? p.followers_count / p.follows_count : 0;
        return sum + ratio;
      }, 0) / profiles.length
    : 0;

  const verifiedCount = profiles.filter(p => p.is_verified).length;
  const businessCount = profiles.filter(p => p.is_business_account).length;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const kpis = [
    {
      label: "Total Seguidores",
      value: formatNumber(totalFollowers),
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Média por Conta",
      value: formatNumber(avgFollowers),
      icon: UserCheck,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Rácio Médio",
      value: `${avgRatio.toFixed(1)}:1`,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Verificados",
      value: `${verifiedCount}/${profiles.length}`,
      icon: BadgeCheck,
      color: "text-sky-500",
      bgColor: "bg-sky-500/10",
    },
    {
      label: "Business",
      value: `${businessCount}/${profiles.length}`,
      icon: Building2,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold truncate">{kpi.value}</div>
                  <div className="text-xs text-muted-foreground truncate">{kpi.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
