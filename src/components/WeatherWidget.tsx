import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, ChevronRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatIST, nowIST } from "@/lib/time";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WeatherData {
  temperature: number;
  location: string;
  forecast: {
    day: string;
    date: string;
    temperature: number;
    icon: string;
  }[];
  tithi: {
    name: string;
    phase: string;
    isHighlighted: boolean;
  }[];
  humidity?: number;
  windSpeed?: number;
  pressure?: number;
  uvIndex?: number;
  error?: string;
}

const WeatherWidget = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [weatherData, setWeatherData] = useState<WeatherData>({
    temperature: 28,
    location: "Loading...",
    forecast: [],
    tithi: []
  });
  const [isAutoLocation, setIsAutoLocation] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);

  // Fetch weather data from our edge function
  const fetchWeatherData = async (latitude?: number, longitude?: number, city?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('weather-data', {
        body: { latitude, longitude, city }
      });

      if (error) throw error;

      if (data.error) {
        console.warn('Weather API error, using fallback data:', data.error);
        toast({
          title: "Weather API Unavailable",
          description: "Showing sample data. Please try again later.",
          variant: "default",
        });
      }

      setWeatherData(data);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      toast({
        title: "Failed to load weather data",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
      
      // Fallback to mock data
      setWeatherData({
        temperature: 28,
        location: "Chinaamiram",
        forecast: [
          { day: "31/Sun", date: "31", temperature: 29, icon: "🌧️" },
          { day: "01/Mon", date: "01", temperature: 28, icon: "🌧️" },
          { day: "02/Tue", date: "02", temperature: 27, icon: "⛅" },
          { day: "03/Wed", date: "03", temperature: 24, icon: "🌦️" },
          { day: "04/Thu", date: "04", temperature: 27, icon: "⛈️" },
        ],
        tithi: [
          { name: "Ashtami", phase: "🌗", isHighlighted: true },
          { name: "Nawami", phase: "🌗", isHighlighted: true },
          { name: "Dashami", phase: "🌖", isHighlighted: false },
          { name: "Ekadasi", phase: "🌖", isHighlighted: false },
          { name: "Dwadasi", phase: "🌖", isHighlighted: false },
        ],
        humidity: 78,
        windSpeed: 12,
        pressure: 1013,
        uvIndex: 6
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto location detection
  useEffect(() => {
    if (isAutoLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lon: longitude });
          fetchWeatherData(latitude, longitude);
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            title: "Location access denied",
            description: "Using default location. Enable location access for local weather.",
            variant: "default",
          });
          // Fallback to default city
          fetchWeatherData(undefined, undefined, "Chinaamiram");
        }
      );
    } else if (!isAutoLocation) {
      // Use manual location (default city for now)
      fetchWeatherData(undefined, undefined, "Chinaamiram");
    }
  }, [isAutoLocation]);

  const toggleLocationMode = () => {
    const newAutoMode = !isAutoLocation;
    setIsAutoLocation(newAutoMode);
    
    if (newAutoMode && userLocation) {
      fetchWeatherData(userLocation.lat, userLocation.lon);
    } else if (!newAutoMode) {
      fetchWeatherData(undefined, undefined, "Chinaamiram");
    }
  };

  const currentDate = formatIST(nowIST(), "EEEE, do MMM yyyy");

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-slate-600 text-white">
      <div className="p-6">
        {/* Header with location and temperature */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-3">
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLocationMode}
                className="text-white hover:bg-white/10 p-1 h-auto justify-start"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : isAutoLocation ? (
                  <Navigation className="h-4 w-4 mr-1" />
                ) : (
                  <MapPin className="h-4 w-4 mr-1" />
                )}
                <span className="text-base font-medium">{weatherData.location}</span>
              </Button>
              <p className="text-sm text-gray-300 ml-1">
                {currentDate}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              {isLoading ? "--" : `${weatherData.temperature}°C`}
            </div>
          </div>
        </div>

        {/* 5-day forecast */}
        <div className="flex justify-between items-center mb-6 gap-2">
          {isLoading ? (
            Array(5).fill(0).map((_, index) => (
              <div key={index} className="flex flex-col items-center min-w-0 flex-1">
                <div className="text-xs text-gray-300 mb-1">--/--</div>
                <div className="text-2xl mb-1">⏳</div>
                <div className="text-sm font-medium">--°C</div>
              </div>
            ))
          ) : (
            weatherData.forecast.slice(0, 5).map((day, index) => (
              <div key={index} className="flex flex-col items-center min-w-0 flex-1">
                <div className="text-xs text-gray-300 mb-1">{day.day}</div>
                <div className="text-2xl mb-1">{day.icon}</div>
                <div className="text-sm font-medium">{day.temperature}°C</div>
              </div>
            ))
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:bg-white/10 p-2 h-auto ml-2"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </Button>
        </div>

        {/* Tithi (Lunar Calendar) */}
        <div className="border-t border-gray-600 pt-4">
          <div className="flex justify-between items-center gap-2">
            {isLoading ? (
              Array(5).fill(0).map((_, index) => (
                <div key={index} className="flex flex-col items-center min-w-0 flex-1">
                  <div className="text-3xl mb-1 text-gray-400">🌑</div>
                  <div className="text-xs text-center text-gray-300">Loading...</div>
                </div>
              ))
            ) : (
              weatherData.tithi.slice(0, 5).map((tithi, index) => (
                <div key={index} className="flex flex-col items-center min-w-0 flex-1">
                  <div 
                    className={`text-3xl mb-1 ${
                      tithi.isHighlighted 
                        ? 'filter drop-shadow-[0_0_8px_rgba(255,165,0,0.8)] text-orange-400' 
                        : 'text-gray-400'
                    }`}
                  >
                    {tithi.phase}
                  </div>
                  <div className={`text-xs text-center ${
                    tithi.isHighlighted ? 'text-orange-400 font-medium' : 'text-gray-300'
                  }`}>
                    {tithi.name}
                  </div>
                </div>
              ))
            )}
            <div className="w-6" /> {/* Spacer to align with forecast */}
          </div>
        </div>

        {/* Expanded view */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-600 animate-fade-in">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-300">Humidity:</span>
                <span className="ml-2 font-medium">
                  {isLoading ? "--" : `${weatherData.humidity || 0}%`}
                </span>
              </div>
              <div>
                <span className="text-gray-300">Wind:</span>
                <span className="ml-2 font-medium">
                  {isLoading ? "--" : `${weatherData.windSpeed || 0} km/h`}
                </span>
              </div>
              <div>
                <span className="text-gray-300">Pressure:</span>
                <span className="ml-2 font-medium">
                  {isLoading ? "--" : `${weatherData.pressure || 0} hPa`}
                </span>
              </div>
              <div>
                <span className="text-gray-300">UV Index:</span>
                <span className="ml-2 font-medium">
                  {isLoading ? "--" : `${weatherData.uvIndex || 0} (High)`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default WeatherWidget;