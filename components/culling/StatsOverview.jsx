import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, CloudUpload } from "lucide-react";

export default function StatsOverview({ culls, pendingCount, onTotalClick, onPendingClick }) {
  const thisMonth = culls.filter(cull => {
    const cullDate = new Date(cull.created_date);
    const now = new Date();
    return cullDate.getMonth() === now.getMonth() && 
           cullDate.getFullYear() === now.getFullYear();
  }).length;

  const stats = [
    {
      title: "Total Culls",
      value: culls.length,
      icon: Target,
      bgColor: "bg-orange-500",
      description: `${thisMonth} this month`,
      onClick: onTotalClick,
      clickable: true
    },
    {
      title: "Pending Sync",
      value: pendingCount,
      icon: CloudUpload,
      bgColor: "bg-purple-500",
      description: pendingCount > 0 ? "Awaiting upload" : "All synced",
      onClick: onPendingClick,
      clickable: pendingCount > 0
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {stats.map((stat, index) => (
        <Card 
          key={index} 
          className={`bg-slate-800 border-slate-700 relative overflow-hidden ${
            stat.clickable ? 'cursor-pointer hover:bg-slate-750 transition-colors' : ''
          }`}
          onClick={stat.clickable ? stat.onClick : undefined}
        >
          <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${stat.bgColor} rounded-full opacity-10`} />
          <CardHeader className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400">{stat.title}</p>
                <CardTitle className="text-4xl font-bold mt-2 text-white">
                  {stat.value}
                </CardTitle>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor} bg-opacity-20`}>
                <stat.icon className={`w-6 h-6 text-white`} />
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">{stat.description}</p>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}