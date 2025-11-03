import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, User, Target, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

const speciesColors = {
  "Red Deer": "bg-red-900 text-red-300 border-red-700",
  "Fallow Deer": "bg-amber-900 text-amber-300 border-amber-700",
  "Sika Deer": "bg-purple-900 text-purple-300 border-purple-700",
  "Whitetail Deer": "bg-blue-900 text-blue-300 border-blue-700",
  "Sambar Deer": "bg-green-900 text-green-300 border-green-700",
  "Rusa Deer": "bg-orange-900 text-orange-300 border-orange-700",
  "Other": "bg-slate-700 text-slate-300 border-slate-600"
};

export default function CullCard({ cull }) {
  return (
    <Card className="bg-slate-700 border-slate-600 hover:border-slate-500 transition-colors">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row gap-4">
          {cull.photo_url && (
            <div className="md:w-32 md:h-32 w-full h-48 flex-shrink-0">
              <img 
                src={cull.photo_url} 
                alt="Deer"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          )}
          
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  {cull.property_name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge className={speciesColors[cull.species] || speciesColors["Other"]}>
                    <Target className="w-3 h-3 mr-1" />
                    {cull.species}
                  </Badge>
                  <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-600">
                    {cull.maturity}
                  </Badge>
                  {cull.photo_url && (
                    <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-600">
                      <ImageIcon className="w-3 h-3 mr-1" />
                      Photo
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>{cull.lead_contractor}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>
                  {cull.cull_date_time 
                    ? format(new Date(cull.cull_date_time), "MMM d, yyyy 'at' HH:mm")
                    : format(new Date(cull.created_date), "MMM d, yyyy 'at' HH:mm")}
                </span>
              </div>
              {(cull.gps_latitude && cull.gps_longitude) && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-xs">
                    {cull.gps_latitude.toFixed(4)}, {cull.gps_longitude.toFixed(4)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Fate:</span>
                <span>{cull.carcass_fate}</span>
              </div>
            </div>

            {cull.notes && (
              <p className="text-sm text-slate-400 italic mt-2">
                "{cull.notes}"
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}