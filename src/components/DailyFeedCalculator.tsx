import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Fish, Calculator, Info } from "lucide-react";

interface CalculatorInputs {
  pondArea: number;
  stockingDensity: number;
  currentABW: number;
  survivalRate: number;
  feedingRatePercent: number;
  daysOfCulture: number;
  waterTemp: number;
  dissolvedOxygen: number;
}

const DailyFeedCalculator = () => {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    pondArea: 1000,
    stockingDensity: 60,
    currentABW: 12,
    survivalRate: 85,
    feedingRatePercent: 4,
    daysOfCulture: 90,
    waterTemp: 28,
    dissolvedOxygen: 6
  });

  const updateInput = (field: keyof CalculatorInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const calculations = useMemo(() => {
    const { 
      pondArea, stockingDensity, currentABW, survivalRate, 
      feedingRatePercent, waterTemp, dissolvedOxygen 
    } = inputs;

    // Basic calculations
    const totalStocked = pondArea * stockingDensity;
    const currentPopulation = totalStocked * (survivalRate / 100);
    const currentBiomass = (currentPopulation * currentABW) / 1000; // in kg
    
    // Feed calculations
    const baseDailyFeed = currentBiomass * (feedingRatePercent / 100);
    
    // Environmental adjustments
    let tempAdjustment = 1;
    if (waterTemp < 25) tempAdjustment = 0.8;
    else if (waterTemp > 32) tempAdjustment = 0.7;
    
    let doAdjustment = 1;
    if (dissolvedOxygen < 4) doAdjustment = 0.6;
    else if (dissolvedOxygen < 5) doAdjustment = 0.8;
    
    const adjustedDailyFeed = baseDailyFeed * tempAdjustment * doAdjustment;
    
    // Feed distribution (4 times per day)
    const feedPerSession = adjustedDailyFeed / 4;
    
    // Weekly and monthly estimates
    const weeklyFeed = adjustedDailyFeed * 7;
    const monthlyFeed = adjustedDailyFeed * 30;

    return {
      totalStocked: Math.round(totalStocked),
      currentPopulation: Math.round(currentPopulation),
      currentBiomass: Number(currentBiomass.toFixed(2)),
      baseDailyFeed: Number(baseDailyFeed.toFixed(2)),
      adjustedDailyFeed: Number(adjustedDailyFeed.toFixed(2)),
      feedPerSession: Number(feedPerSession.toFixed(2)),
      weeklyFeed: Number(weeklyFeed.toFixed(2)),
      monthlyFeed: Number(monthlyFeed.toFixed(2)),
      tempAdjustment: Number((tempAdjustment * 100).toFixed(0)),
      doAdjustment: Number((doAdjustment * 100).toFixed(0))
    };
  }, [inputs]);

  const getFeedingRecommendations = () => {
    const { waterTemp, dissolvedOxygen, currentABW, daysOfCulture } = inputs;
    const recommendations = [];

    if (waterTemp < 25) {
      recommendations.push("Low water temperature detected. Reduce feeding frequency and monitor shrimp activity.");
    } else if (waterTemp > 32) {
      recommendations.push("High water temperature detected. Increase aeration and reduce feeding rate.");
    }

    if (dissolvedOxygen < 4) {
      recommendations.push("Critical DO levels! Increase aeration immediately and reduce feeding by 40%.");
    } else if (dissolvedOxygen < 5) {
      recommendations.push("Low DO levels. Monitor closely and consider reducing feeding by 20%.");
    }

    if (currentABW < 5 && daysOfCulture > 60) {
      recommendations.push("Slow growth detected. Check feed quality and consider supplementary feeding.");
    }

    if (daysOfCulture < 30) {
      recommendations.push("Early culture phase: Use smaller pellet size and feed more frequently.");
    } else if (daysOfCulture > 90) {
      recommendations.push("Late culture phase: Reduce feeding rate to 2-3% of biomass to improve FCR.");
    }

    return recommendations;
  };

  const getFeedingSchedule = () => {
    const { adjustedDailyFeed, feedPerSession } = calculations;
    
    return [
      { time: "06:00 AM", amount: feedPerSession, percentage: 25 },
      { time: "11:00 AM", amount: feedPerSession, percentage: 25 },
      { time: "04:00 PM", amount: feedPerSession, percentage: 25 },
      { time: "08:00 PM", amount: feedPerSession, percentage: 25 }
    ];
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fish className="h-5 w-5 text-primary" />
            Daily Feed Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inputs" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="inputs">Pond Data</TabsTrigger>
              <TabsTrigger value="results">Feed Amount</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="tips">Tips</TabsTrigger>
            </TabsList>
            
            <TabsContent value="inputs" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pond Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pondArea">Pond Area (m²)</Label>
                      <Input
                        id="pondArea"
                        type="number"
                        value={inputs.pondArea}
                        onChange={(e) => updateInput('pondArea', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stockingDensity">Stocking Density (PL/m²)</Label>
                      <Input
                        id="stockingDensity"
                        type="number"
                        value={inputs.stockingDensity}
                        onChange={(e) => updateInput('stockingDensity', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentABW">Current ABW (g)</Label>
                      <Input
                        id="currentABW"
                        type="number"
                        step="0.1"
                        value={inputs.currentABW}
                        onChange={(e) => updateInput('currentABW', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="survivalRate">Survival Rate (%)</Label>
                      <Input
                        id="survivalRate"
                        type="number"
                        value={inputs.survivalRate}
                        onChange={(e) => updateInput('survivalRate', Number(e.target.value))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Culture & Environment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="feedingRatePercent">Feeding Rate (% of biomass)</Label>
                      <Input
                        id="feedingRatePercent"
                        type="number"
                        step="0.1"
                        value={inputs.feedingRatePercent}
                        onChange={(e) => updateInput('feedingRatePercent', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="daysOfCulture">Days of Culture (DOC)</Label>
                      <Input
                        id="daysOfCulture"
                        type="number"
                        value={inputs.daysOfCulture}
                        onChange={(e) => updateInput('daysOfCulture', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="waterTemp">Water Temperature (°C)</Label>
                      <Input
                        id="waterTemp"
                        type="number"
                        value={inputs.waterTemp}
                        onChange={(e) => updateInput('waterTemp', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dissolvedOxygen">Dissolved Oxygen (ppm)</Label>
                      <Input
                        id="dissolvedOxygen"
                        type="number"
                        step="0.1"
                        value={inputs.dissolvedOxygen}
                        onChange={(e) => updateInput('dissolvedOxygen', Number(e.target.value))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Population & Biomass</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Total Stocked:</span>
                      <Badge variant="secondary">{calculations.totalStocked.toLocaleString()} PL</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Current Population:</span>
                      <Badge variant="secondary">{calculations.currentPopulation.toLocaleString()} pieces</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Current Biomass:</span>
                      <Badge variant="secondary">{calculations.currentBiomass} kg</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Feed Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Base Daily Feed:</span>
                      <Badge variant="outline">{calculations.baseDailyFeed} kg</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <span className="font-medium text-primary">Adjusted Daily Feed:</span>
                      <Badge variant="default">{calculations.adjustedDailyFeed} kg</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Weekly Feed:</span>
                      <Badge variant="secondary">{calculations.weeklyFeed} kg</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Monthly Feed:</span>
                      <Badge variant="secondary">{calculations.monthlyFeed} kg</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Environmental Adjustments</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                    <span className="font-medium">Temperature Adjustment:</span>
                    <Badge variant={calculations.tempAdjustment < 100 ? "destructive" : "default"}>
                      {calculations.tempAdjustment}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                    <span className="font-medium">DO Adjustment:</span>
                    <Badge variant={calculations.doAdjustment < 100 ? "destructive" : "default"}>
                      {calculations.doAdjustment}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Daily Feeding Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getFeedingSchedule().map((session, index) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-secondary/50 rounded-lg">
                        <div>
                          <span className="font-medium">{session.time}</span>
                          <span className="text-sm text-muted-foreground ml-2">({session.percentage}%)</span>
                        </div>
                        <Badge variant="secondary">{session.amount} kg</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-primary">
                      <strong>Total Daily Feed:</strong> {calculations.adjustedDailyFeed} kg
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tips" className="space-y-6">
              <div className="space-y-4">
                {getFeedingRecommendations().map((tip, index) => (
                  <Alert key={index}>
                    <Info className="h-4 w-4" />
                    <AlertDescription>{tip}</AlertDescription>
                  </Alert>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Feeding Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <p><strong>Feeding Rate by DOC:</strong></p>
                    <p className="text-muted-foreground ml-4">• DOC 1-30: 8-12% of biomass</p>
                    <p className="text-muted-foreground ml-4">• DOC 31-60: 5-8% of biomass</p>
                    <p className="text-muted-foreground ml-4">• DOC 61-90: 3-5% of biomass</p>
                    <p className="text-muted-foreground ml-4">• DOC 90+: 2-3% of biomass</p>
                  </div>
                  <div className="text-sm space-y-2">
                    <p><strong>Environmental Factors:</strong></p>
                    <p className="text-muted-foreground ml-4">• Reduce feeding when temperature &lt; 25°C or &gt; 32°C</p>
                    <p className="text-muted-foreground ml-4">• Reduce feeding when DO &lt; 5 ppm</p>
                    <p className="text-muted-foreground ml-4">• Stop feeding when DO &lt; 3 ppm</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyFeedCalculator;