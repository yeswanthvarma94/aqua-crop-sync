import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calculator, Clock, Droplets, Fish, Gauge, Info, Sun, Thermometer } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CalculatorInputs {
  pondArea: number;
  initialStocked: number;
  docDays: number;
  countPerKg: number;
  abwGrams: number;
  usingSizeType: 'count' | 'abw';
  survivalRate: number;
  feedingRate: number;
  
  // Check tray
  numberOfTrays: number;
  coverage: 'good' | 'poor';
  feedLeftover: 'finished' | 'some' | 'alot' | 'waste';
  shrimpOnTrays: 'many' | 'normal' | 'few';
  fecalStrands: 'normal' | 'reduced';
  gutColor: 'full' | 'light' | 'red';
  
  // Environment
  temperature: number;
  weather: 'clear' | 'light_rain' | 'heavy_rain' | 'cloudy';
  waterColor: 'normal' | 'thick_bloom' | 'muddy';
  pondActions: 'none' | 'water_exchange' | 'chemicals' | 'molting';
  doStatus: 'good' | 'low' | 'critical';
}

const ShrimpAquacultureCalculator = () => {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    pondArea: 1.0,
    initialStocked: 100000,
    docDays: 45,
    countPerKg: 100,
    abwGrams: 10,
    usingSizeType: 'count',
    survivalRate: 85,
    feedingRate: 5,
    numberOfTrays: 3,
    coverage: 'good',
    feedLeftover: 'some',
    shrimpOnTrays: 'normal',
    fecalStrands: 'normal',
    gutColor: 'full',
    temperature: 28,
    weather: 'clear',
    waterColor: 'normal',
    pondActions: 'none',
    doStatus: 'good'
  });

  const updateInput = (key: keyof CalculatorInputs, value: any) => {
    setInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Convert between COUNT and ABW
  React.useEffect(() => {
    if (inputs.usingSizeType === 'count') {
      updateInput('abwGrams', 1000 / inputs.countPerKg);
    } else {
      updateInput('countPerKg', 1000 / inputs.abwGrams);
    }
  }, [inputs.countPerKg, inputs.abwGrams, inputs.usingSizeType]);

  const calculations = useMemo(() => {
    // Basic calculations
    const liveShrimp = inputs.initialStocked * (inputs.survivalRate / 100);
    const biomassKg = (liveShrimp * inputs.abwGrams) / 1000;
    const baseDailyFeedKg = (biomassKg * inputs.feedingRate) / 100;

    // Tray adjustment factor
    let trayFactor = 1.0;
    switch (inputs.feedLeftover) {
      case 'finished': trayFactor = 1.075; break; // +7.5%
      case 'some': trayFactor = 1.0; break;
      case 'alot': trayFactor = 0.85; break; // -15%
      case 'waste': trayFactor = 0.7; break; // -30%
    }

    // Environmental factors
    let environmentFactor = 1.0;
    
    // Temperature
    if (inputs.temperature < 24) environmentFactor *= 0.8;
    else if (inputs.temperature > 32) environmentFactor *= 0.7;
    
    // Weather
    switch (inputs.weather) {
      case 'light_rain': environmentFactor *= 0.9; break;
      case 'heavy_rain': environmentFactor *= 0.6; break;
      case 'cloudy': environmentFactor *= 0.8; break;
    }
    
    // Water color
    switch (inputs.waterColor) {
      case 'thick_bloom': environmentFactor *= 0.75; break;
      case 'muddy': environmentFactor *= 0.85; break;
    }
    
    // Pond actions
    switch (inputs.pondActions) {
      case 'water_exchange': environmentFactor *= 0.8; break;
      case 'chemicals': environmentFactor *= 0.5; break;
      case 'molting': environmentFactor *= 0.7; break;
    }
    
    // DO status
    switch (inputs.doStatus) {
      case 'low': environmentFactor *= 0.7; break;
      case 'critical': environmentFactor *= 0.0; break; // No feeding
    }

    const finalDailyFeedKg = baseDailyFeedKg * trayFactor * environmentFactor;

    // Growth projections
    const expectedWeeklyGrowth = inputs.docDays < 60 ? 15 : inputs.docDays < 90 ? 12 : 8;
    const nextWeekCount = Math.max(20, inputs.countPerKg - expectedWeeklyGrowth);

    return {
      liveShrimp,
      biomassKg,
      baseDailyFeedKg,
      trayFactor,
      environmentFactor,
      finalDailyFeedKg,
      nextWeekCount
    };
  }, [inputs]);

  const getTrayRecommendation = () => {
    const { feedLeftover, shrimpOnTrays, coverage } = inputs;
    let recommendation = "";
    
    if (coverage === 'poor') {
      recommendation += "⚠️ Add more trays for better coverage (≥75%). ";
    }
    
    switch (feedLeftover) {
      case 'finished':
        recommendation += "✅ All feed consumed - increase next meal by +5-10%. ";
        break;
      case 'some':
        recommendation += "✅ Good feeding - maintain current amount. ";
        break;
      case 'alot':
        recommendation += "⚠️ Too much feed left - reduce next meal by -10-20%. ";
        break;
      case 'waste':
        recommendation += "❌ Excessive waste - reduce by -30% or skip next meal. ";
        break;
    }
    
    if (shrimpOnTrays === 'few') {
      recommendation += "Check for stress factors or disease. ";
    }
    
    return recommendation;
  };

  const getEnvironmentAlert = () => {
    if (inputs.doStatus === 'critical') {
      return {
        type: 'critical',
        message: 'CRITICAL: DO < 3 mg/L - Stop all feeding immediately. Run aeration. Resume only after DO > 4 mg/L.'
      };
    }
    
    if (inputs.doStatus === 'low') {
      return {
        type: 'warning',
        message: 'LOW DO (3-4 mg/L): Reduced feeding by 30%. Monitor closely.'
      };
    }
    
    if (inputs.pondActions === 'chemicals') {
      return {
        type: 'warning',
        message: 'Chemicals used: Feeding reduced by 50%. Monitor for 24-48 hours.'
      };
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Environmental Alert */}
      {getEnvironmentAlert() && (
        <Alert className={getEnvironmentAlert()?.type === 'critical' ? 'border-destructive' : 'border-yellow-500'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-semibold">
            {getEnvironmentAlert()?.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          {/* All Parameters in One Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fish className="h-5 w-5" />
                Basic Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Parameters */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Pond Area (acres)</Label>
                    <Input 
                      type="number" 
                      value={inputs.pondArea}
                      onChange={(e) => updateInput('pondArea', parseFloat(e.target.value) || 0)}
                      min="0.1"
                      max="10"
                      step="0.1"
                    />
                  </div>
                  
                  <div>
                    <Label>DOC (Days)</Label>
                    <Input 
                      type="number" 
                      value={inputs.docDays}
                      onChange={(e) => updateInput('docDays', parseInt(e.target.value) || 0)}
                      min="1"
                      max="150"
                    />
                  </div>
                </div>

                <div>
                  <Label>Initial PL Stocked</Label>
                  <Input 
                    type="number" 
                    value={inputs.initialStocked}
                    onChange={(e) => updateInput('initialStocked', parseInt(e.target.value) || 0)}
                    min="10000"
                    max="500000"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Survival Rate (%)</Label>
                    <Select value={inputs.survivalRate.toString()} onValueChange={(v) => updateInput('survivalRate', parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="95">95%</SelectItem>
                        <SelectItem value="90">90%</SelectItem>
                        <SelectItem value="85">85%</SelectItem>
                        <SelectItem value="80">80%</SelectItem>
                        <SelectItem value="75">75%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Feeding Rate (%)</Label>
                    <Input 
                      type="number" 
                      value={inputs.feedingRate}
                      onChange={(e) => updateInput('feedingRate', parseFloat(e.target.value) || 0)}
                      min="2"
                      max="10"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Shrimp Size */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Shrimp Size
                </h4>
                
                <div className="flex gap-2">
                  <Button 
                    variant={inputs.usingSizeType === 'count' ? 'default' : 'outline'}
                    onClick={() => updateInput('usingSizeType', 'count')}
                    className="flex-1"
                  >
                    COUNT/KG
                  </Button>
                  <Button 
                    variant={inputs.usingSizeType === 'abw' ? 'default' : 'outline'}
                    onClick={() => updateInput('usingSizeType', 'abw')}
                    className="flex-1"
                  >
                    ABW (g)
                  </Button>
                </div>

                {inputs.usingSizeType === 'count' ? (
                  <div>
                    <Label>COUNT per kg</Label>
                    <Select value={inputs.countPerKg.toString()} onValueChange={(v) => updateInput('countPerKg', parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="200">200+</SelectItem>
                        <SelectItem value="175">150-200</SelectItem>
                        <SelectItem value="125">100-150</SelectItem>
                        <SelectItem value="90">80-100</SelectItem>
                        <SelectItem value="70">60-80</SelectItem>
                        <SelectItem value="55">50-60</SelectItem>
                        <SelectItem value="45">40-50</SelectItem>
                        <SelectItem value="35">30-40</SelectItem>
                        <SelectItem value="25">20-30</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label>ABW (grams)</Label>
                    <Input 
                      type="number" 
                      value={inputs.abwGrams}
                      onChange={(e) => updateInput('abwGrams', parseFloat(e.target.value) || 0)}
                      min="0.1"
                      max="30"
                      step="0.1"
                    />
                  </div>
                )}

                <div className="text-sm text-muted-foreground p-2 bg-secondary/20 rounded">
                  {inputs.usingSizeType === 'count' 
                    ? `ABW: ${inputs.abwGrams.toFixed(2)} g`
                    : `COUNT: ${inputs.countPerKg.toFixed(0)} per kg`
                  }
                </div>
              </div>

              <Separator />

              {/* Check Tray Assessment */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Check Tray Assessment
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Number of Trays</Label>
                    <Select value={inputs.numberOfTrays.toString()} onValueChange={(v) => updateInput('numberOfTrays', parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="6">6</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Coverage</Label>
                    <Select value={inputs.coverage} onValueChange={(v) => updateInput('coverage', v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">≥75% (Good)</SelectItem>
                        <SelectItem value="poor">&lt;75% (Add trays)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Feed Leftover</Label>
                  <Select value={inputs.feedLeftover} onValueChange={(v) => updateInput('feedLeftover', v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="finished">All finished/very little</SelectItem>
                      <SelectItem value="some">Some left</SelectItem>
                      <SelectItem value="alot">A lot left</SelectItem>
                      <SelectItem value="waste">Too much waste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Shrimp on Trays</Label>
                    <Select value={inputs.shrimpOnTrays} onValueChange={(v) => updateInput('shrimpOnTrays', v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="many">Many</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="few">Few/None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Gut Color</Label>
                    <Select value={inputs.gutColor} onValueChange={(v) => updateInput('gutColor', v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Brown/black (full)</SelectItem>
                        <SelectItem value="light">Light/empty</SelectItem>
                        <SelectItem value="red">Reddish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Environmental Conditions */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  Environmental Conditions
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Temperature (°C)</Label>
                    <Input 
                      type="number" 
                      value={inputs.temperature}
                      onChange={(e) => updateInput('temperature', parseFloat(e.target.value) || 0)}
                      min="20"
                      max="36"
                    />
                  </div>

                  <div>
                    <Label>Weather</Label>
                    <Select value={inputs.weather} onValueChange={(v) => updateInput('weather', v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clear">Clear</SelectItem>
                        <SelectItem value="light_rain">Light rain</SelectItem>
                        <SelectItem value="heavy_rain">Heavy rain/storm</SelectItem>
                        <SelectItem value="cloudy">Many cloudy days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Water Color</Label>
                    <Select value={inputs.waterColor} onValueChange={(v) => updateInput('waterColor', v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal light green</SelectItem>
                        <SelectItem value="thick_bloom">Very green/thick bloom</SelectItem>
                        <SelectItem value="muddy">Muddy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>DO Status at Dawn</Label>
                    <Select value={inputs.doStatus} onValueChange={(v) => updateInput('doStatus', v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">Good (&gt;4)</SelectItem>
                        <SelectItem value="low">Low (3-4)</SelectItem>
                        <SelectItem value="critical">Critical (&lt;3)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Pond Actions</Label>
                  <Select value={inputs.pondActions} onValueChange={(v) => updateInput('pondActions', v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="water_exchange">Water exchange</SelectItem>
                      <SelectItem value="chemicals">Chemicals/medicine used</SelectItem>
                      <SelectItem value="molting">Molting observed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Summary Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Feed Calculation Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-3xl font-bold text-primary">
                  {calculations.finalDailyFeedKg.toFixed(2)} kg
                </div>
                <div className="text-sm text-muted-foreground">
                  Final daily feed at FR = {inputs.feedingRate}%
                </div>
                <div className="text-sm text-muted-foreground">
                  ABW = {inputs.abwGrams.toFixed(2)}g, SR = {inputs.survivalRate}%, DOC = {inputs.docDays}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold">{Math.round(calculations.liveShrimp).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Live Shrimp</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">{calculations.biomassKg.toFixed(1)} kg</div>
                  <div className="text-xs text-muted-foreground">Biomass</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">{inputs.countPerKg}</div>
                  <div className="text-xs text-muted-foreground">COUNT/KG</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Base feed (before adjustments):</span>
                  <span className="font-medium">{calculations.baseDailyFeedKg.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tray adjustment:</span>
                  <Badge variant={calculations.trayFactor > 1 ? 'default' : calculations.trayFactor < 1 ? 'destructive' : 'secondary'}>
                    {((calculations.trayFactor - 1) * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Environment factor:</span>
                  <Badge variant={calculations.environmentFactor < 1 ? 'destructive' : 'secondary'}>
                    {((calculations.environmentFactor - 1) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Check Tray Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Check Tray Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-secondary/20 rounded-lg">
                  <div className="text-sm font-medium mb-2">Observation Results:</div>
                  <div className="text-sm">{getTrayRecommendation()}</div>
                </div>
                
                <div className="text-sm space-y-2">
                  <div><strong>Coverage:</strong> {inputs.coverage === 'good' ? '✅ Good (≥75%)' : '⚠️ Poor (<75%)'}</div>
                  <div><strong>Feed leftover:</strong> {inputs.feedLeftover}</div>
                  <div><strong>Shrimp activity:</strong> {inputs.shrimpOnTrays}</div>
                  <div><strong>Gut status:</strong> {inputs.gutColor}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Growth Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Growth Tracker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-secondary/20 rounded-lg">
                  <div className="text-lg font-bold">{inputs.countPerKg}</div>
                  <div className="text-xs text-muted-foreground">Current COUNT/KG</div>
                </div>
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <div className="text-lg font-bold text-primary">{calculations.nextWeekCount}</div>
                  <div className="text-xs text-muted-foreground">Expected next week</div>
                </div>
              </div>
              
              <div className="text-sm text-center text-muted-foreground">
                📅 Sample COUNT/KG weekly • Growth should drop 10-20 count/week
              </div>
            </CardContent>
          </Card>

          {/* Environmental Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Environmental Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Temperature:</span>
                  <Badge variant={inputs.temperature >= 24 && inputs.temperature <= 32 ? 'default' : 'destructive'}>
                    {inputs.temperature}°C
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Weather:</span>
                  <Badge variant={inputs.weather === 'clear' ? 'default' : 'secondary'}>
                    {inputs.weather.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Water:</span>
                  <Badge variant={inputs.waterColor === 'normal' ? 'default' : 'secondary'}>
                    {inputs.waterColor.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>DO Status:</span>
                  <Badge variant={inputs.doStatus === 'good' ? 'default' : inputs.doStatus === 'critical' ? 'destructive' : 'secondary'}>
                    {inputs.doStatus}
                  </Badge>
                </div>
              </div>

              {inputs.pondActions !== 'none' && (
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded text-sm">
                  <strong>Action:</strong> {inputs.pondActions.replace('_', ' ')} - Monitor for 24-48h
                </div>
              )}
            </CardContent>
          </Card>

          {/* Farmer Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5" />
                Farmer Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>• If "all finished" for 2 meals → increase +5% each time until "some left"</div>
              <div>• DO &lt;3 mg/L → stop feeding, run aeration until DO &gt;4 mg/L</div>
              <div>• During mass molting → reduce 30-50% for 24-48 hours</div>
              <div>• Always score ≥75% of trays for accuracy</div>
              <div>• COUNT should drop 10-20 per week under good growth</div>
              <div>• Night feeding = 60-70% of daily feed for better FCR</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShrimpAquacultureCalculator;