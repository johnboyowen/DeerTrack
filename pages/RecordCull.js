
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MapPin, Loader2, WifiOff, CheckCircle, Timer, Target } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CullForm from "../components/culling/CullForm";

// SIMPLIFIED: Just get cached user immediately
const getCachedUser = () => {
  try {
    const cached = localStorage.getItem('cachedUser');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

export default function RecordCull() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationAttempts, setLocationAttempts] = useState(0);
  const [accuracy, setAccuracy] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [user, setUser] = useState(getCachedUser());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(!getCachedUser()); // Only show loading if no cached user

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overscrollBehavior = 'auto';
    };
  }, []);

  // CRITICAL FIX: Don't block render waiting for user fetch
  useEffect(() => {
    if (!user && isOnline) {
      const fetchUser = async () => {
        try {
          const userData = await base44.auth.me();
          setUser(userData);
          localStorage.setItem('cachedUser', JSON.stringify(userData));
        } catch (error) {
          console.error("Failed to load user:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUser();
    } else if (!user) {
      // Offline and no cached user - wait a moment in case SW is still loading
      setTimeout(() => setIsLoading(false), 1000);
    }
  }, [user, isOnline]);

  const getLocation = () => {
    setGettingLocation(true);
    setLocationError(null);
    setLocationAttempts(0);
    setAccuracy(null);
    setElapsedTime(0);
    
    if (!navigator.geolocation) {
      setLocationError("GPS not supported on this device");
      setGettingLocation(false);
      return;
    }

    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    let bestPosition = null;
    let bestAccuracy = Infinity;
    let attempts = 0;
    const maxAttempts = 10;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        attempts++;
        setLocationAttempts(attempts);
        const currentAccuracy = position.coords.accuracy;
        setAccuracy(currentAccuracy);

        if (currentAccuracy < bestAccuracy) {
          bestAccuracy = currentAccuracy;
          bestPosition = position;
        }

        if (currentAccuracy <= 10) {
          clearInterval(timer);
          navigator.geolocation.clearWatch(watchId);
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: currentAccuracy
          });
          setGettingLocation(false);
        } else if (attempts >= maxAttempts) {
          clearInterval(timer);
          navigator.geolocation.clearWatch(watchId);
          if (bestPosition) {
            setLocation({
              latitude: bestPosition.coords.latitude,
              longitude: bestPosition.coords.longitude,
              accuracy: bestAccuracy
            });
            if (bestAccuracy > 10) {
              setLocationError(`GPS locked but accuracy is ${bestAccuracy.toFixed(0)}m (target: 10m)`);
            }
          } else {
            setLocationError("Unable to get accurate GPS location");
          }
          setGettingLocation(false);
        }
      },
      (error) => {
        clearInterval(timer);
        navigator.geolocation.clearWatch(watchId);
        setLocationError("Unable to get GPS location. You can still submit without it.");
        setGettingLocation(false);
        console.error("GPS error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    if (user) {
      getLocation();
    }
  }, [user]);

  const handleSubmit = async (formData) => {
    if (!user) {
      setMessage({ type: 'error', text: 'User not found. Please refresh the page.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      // CRITICAL: Create clean data object without File objects
      const cullData = {
        property_name: formData.property_name,
        lead_contractor: formData.lead_contractor,
        additional_stalkers: formData.additional_stalkers,
        exemptions: formData.exemptions,
        land_type: formData.land_type,
        maturity: formData.maturity,
        species: formData.species,
        carcass_fate: formData.carcass_fate,
        notes: formData.notes,
        photo_url: formData.photo_url,
        user_email: user.email,
        gps_latitude: location?.latitude || null,
        gps_longitude: location?.longitude || null,
        gps_accuracy: location?.accuracy || null,
        cull_date_time: new Date().toISOString(),
      };

      if (isOnline) {
        try {
          await base44.entities.DeerCull.create(cullData);
          setMessage({ type: 'success', text: 'Cull recorded and synced successfully!' });
          setTimeout(() => navigate(createPageUrl("Dashboard")), 1500);
        } catch (error) {
          console.error("Failed to save online, saving offline:", error);
          savePendingCull(cullData);
        }
      } else {
        savePendingCull(cullData);
      }
    } catch (error) {
      console.error("Submit error:", error);
      setMessage({ type: 'error', text: 'Failed to process cull data' });
    }

    setSubmitting(false);
  };

  const savePendingCull = (cullData) => {
    try {
      const pendingStr = localStorage.getItem('pendingCulls');
      const pending = pendingStr ? JSON.parse(pendingStr) : [];
      
      pending.unshift(cullData);
      
      const trimmed = pending.slice(0, 50);
      
      localStorage.setItem('pendingCulls', JSON.stringify(trimmed));
      
      setMessage({ 
        type: 'offline', 
        text: 'Cull saved offline. Will sync when connection restored.' 
      });
      
      setTimeout(() => navigate(createPageUrl("Dashboard")), 2000);
    } catch (error) {
      console.error("LocalStorage save error:", error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to save offline. Storage may be full.' 
      });
    }
  };

  // CRITICAL FIX: Show loading only briefly
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // CRITICAL FIX: Don't show "offline setup" message immediately
  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 p-4">
        <Target className="w-16 h-16 text-slate-600" />
        <h2 className="text-xl text-white font-semibold">Welcome to DeerTrack</h2>
        <p className="text-slate-400 text-center max-w-md">
          {isOnline 
            ? 'Please log in to record culls' 
            : 'Please connect to the internet and log in for the first time'}
        </p>
        {isOnline && (
          <Button 
            onClick={() => base44.auth.redirectToLogin(window.location.href)}
            className="bg-orange-600 hover:bg-orange-700 mt-4"
          >
            Go to Login
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="border-slate-700 bg-white text-black hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Record New Cull</h1>
            <p className="text-slate-400 mt-1 text-base">Fill in the details below</p>
          </div>
        </div>

        {!isOnline && (
          <Alert className="mb-6 bg-orange-900 bg-opacity-30 border-orange-700">
            <WifiOff className="h-4 w-4 text-orange-400" />
            <AlertDescription className="text-orange-300">
              You're offline. Data will be saved locally and synced when you're back online.
            </AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert className={`mb-6 ${
            message.type === 'success' 
              ? 'bg-green-900 bg-opacity-30 border-green-700' 
              : message.type === 'offline'
              ? 'bg-orange-900 bg-opacity-30 border-orange-700'
              : 'bg-red-900 bg-opacity-30 border-red-700'
          }`}>
            <CheckCircle className={`h-4 w-4 ${
              message.type === 'success' ? 'text-green-400' : 
              message.type === 'offline' ? 'text-orange-400' : 'text-red-400'
            }`} />
            <AlertDescription className={
              message.type === 'success' ? 'text-green-300' : 
              message.type === 'offline' ? 'text-orange-300' : 'text-red-300'
            }>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" />
              GPS Location
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {gettingLocation ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-300">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                  Getting GPS coordinates...
                </div>
                {accuracy && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`font-medium ${accuracy <= 10 ? 'text-green-400' : 'text-orange-400'}`}>
                      Accuracy: {accuracy.toFixed(0)}m
                    </span>
                    <span className="text-slate-500">
                      (Target: 10m)
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Timer className="w-4 h-4" />
                  <span>Elapsed: {elapsedTime}s</span>
                  <span className="text-slate-500">
                    (Attempt {locationAttempts}/10)
                  </span>
                </div>
              </div>
            ) : location ? (
              <div className="space-y-2">
                <p className="text-green-400 font-medium">✓ Location captured</p>
                <p className="text-sm text-slate-400">
                  Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
                </p>
                <p className="text-sm text-slate-400">
                  Accuracy: {location.accuracy.toFixed(0)}m
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-orange-400">{locationError || "Location not available"}</p>
                <Button
                  variant="outline"
                  onClick={getLocation}
                  className="border-slate-700 bg-white text-black hover:bg-gray-100"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <CullForm onSubmit={handleSubmit} submitting={submitting} />
      </div>
    </div>
  );
}