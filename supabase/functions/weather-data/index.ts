import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openWeatherApiKey = Deno.env.get('OPENWEATHER_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to calculate tithi (lunar day)
function calculateTithi(date: Date) {
  // Simplified tithi calculation based on lunar cycle
  const lunarMonth = 29.53059; // Average lunar month in days
  const newMoonBase = new Date('2024-01-11'); // Known new moon date
  const daysSinceNewMoon = (date.getTime() - newMoonBase.getTime()) / (1000 * 60 * 60 * 24);
  const lunarDay = Math.floor(daysSinceNewMoon % lunarMonth) + 1;
  
  const tithiNames = [
    'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami',
    'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
    'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami',
    'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
  ];
  
  const phaseEmojis = [
    '🌑', '🌒', '🌒', '🌓', '🌓', '🌔', '🌔', '🌕', '🌕', '🌖', '🌖', '🌗', '🌗', '🌘', '🌕',
    '🌑', '🌒', '🌒', '🌓', '🌓', '🌔', '🌔', '🌕', '🌕', '🌖', '🌖', '🌗', '🌗', '🌘', '🌑'
  ];
  
  const tithiIndex = Math.min(lunarDay - 1, 29);
  
  return {
    name: tithiNames[tithiIndex],
    phase: phaseEmojis[tithiIndex],
    isHighlighted: lunarDay === 8 || lunarDay === 9 || lunarDay === 11 || lunarDay === 15 || lunarDay === 30
  };
}

// Generate 5-day tithi forecast
function generateTithiForecast() {
  const tithiData = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    tithiData.push(calculateTithi(date));
  }
  return tithiData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, city } = await req.json();
    
    if (!openWeatherApiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    let weatherUrl = '';
    let forecastUrl = '';
    
    if (latitude && longitude) {
      weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${openWeatherApiKey}&units=metric`;
      forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${openWeatherApiKey}&units=metric`;
    } else if (city) {
      weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${openWeatherApiKey}&units=metric`;
      forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${openWeatherApiKey}&units=metric`;
    } else {
      throw new Error('Either coordinates or city name required');
    }

    // Fetch current weather
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }
    const weatherData = await weatherResponse.json();

    // Fetch 5-day forecast
    const forecastResponse = await fetch(forecastUrl);
    if (!forecastResponse.ok) {
      throw new Error(`Forecast API error: ${forecastResponse.status}`);
    }
    const forecastData = await forecastResponse.json();

    // Process forecast data to get daily forecast
    const dailyForecast = [];
    const processedDays = new Set();
    
    for (const item of forecastData.list) {
      const date = new Date(item.dt * 1000);
      const dayKey = date.toISOString().split('T')[0];
      
      if (!processedDays.has(dayKey) && dailyForecast.length < 5) {
        processedDays.add(dayKey);
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = dayNames[date.getDay()];
        const dayDate = date.getDate().toString().padStart(2, '0');
        
        // Map weather condition to emoji
        const getWeatherIcon = (condition: string) => {
          const conditionLower = condition.toLowerCase();
          if (conditionLower.includes('rain')) return '🌧️';
          if (conditionLower.includes('cloud')) return '⛅';
          if (conditionLower.includes('clear')) return '☀️';
          if (conditionLower.includes('storm') || conditionLower.includes('thunder')) return '⛈️';
          if (conditionLower.includes('snow')) return '🌨️';
          if (conditionLower.includes('mist') || conditionLower.includes('fog')) return '🌫️';
          return '⛅';
        };
        
        dailyForecast.push({
          day: `${dayDate}/${dayName}`,
          date: dayDate,
          temperature: Math.round(item.main.temp),
          icon: getWeatherIcon(item.weather[0].main)
        });
      }
    }

    // Generate tithi data
    const tithiForecast = generateTithiForecast();

    const result = {
      temperature: Math.round(weatherData.main.temp),
      location: weatherData.name,
      forecast: dailyForecast,
      tithi: tithiForecast,
      humidity: weatherData.main.humidity,
      windSpeed: Math.round(weatherData.wind.speed * 3.6), // Convert m/s to km/h
      pressure: weatherData.main.pressure,
      uvIndex: 6 // OpenWeather doesn't provide UV in free tier
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in weather-data function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        // Fallback mock data
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
      }), 
      {
        status: 200, // Return 200 even on error to provide fallback data
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});