import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, TrendingUp, AlertTriangle, Info } from "lucide-react";

interface CalculatorInputs {
  // Initial stocking data
  initialPondArea: number;
  initialStockingDensity: number;
  initialTotalPL: number;
  initialABW: number;
  
  // Current data
  currentABW: number;
  currentSurvivalRate: number;
  daysOfCulture: number;
  
  // Feed data
  totalFeedGiven: number;
  feedCost: number;
}

const CultivationPerformanceCalculator = () => {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    initialPondArea: 1000,
    initialStockingDensity: 60,
    initialTotalPL: 60000,
    initialABW: 0.001,
    currentABW: 12,
    currentSurvivalRate: 85,
    daysOfCulture: 90,
    totalFeedGiven: 2500,
    feedCost: 85
  });

  const updateInput = (field: keyof CalculatorInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const calculations = useMemo(() => {
    const { 
      initialPondArea, initialStockingDensity, initialTotalPL, initialABW,
      currentABW, currentSurvivalRate, daysOfCulture, totalFeedGiven, feedCost
    } = inputs;

    // Basic calculations
    const currentPopulation = initialTotalPL * (currentSurvivalRate / 100);
    const currentBiomass = (currentPopulation * currentABW) / 1000; // in kg
    const totalBiomassGain = currentBiomass - ((initialTotalPL * initialABW) / 1000);
    
    // Performance metrics
    const fcr = totalFeedGiven / totalBiomassGain;
    const adg = (currentABW - initialABW) / daysOfCulture; // Average Daily Gain
    const sgr = ((Math.log(currentABW) - Math.log(initialABW)) / daysOfCulture) * 100; // Specific Growth Rate
    
    // Productivity metrics
    const yieldPerHectare = (currentBiomass / initialPondArea) * 10000; // kg/hectare
    const biomassPerM2 = currentBiomass / initialPondArea; // kg/m²
    
    // Economic metrics
    const totalFeedCost = totalFeedGiven * feedCost;
    const feedCostPerKg = totalFeedCost / currentBiomass;

    return {
      currentPopulation: Math.round(currentPopulation),
      currentBiomass: Number(currentBiomass.toFixed(2)),
      totalBiomassGain: Number(totalBiomassGain.toFixed(2)),
      fcr: Number(fcr.toFixed(2)),
      adg: Number(adg.toFixed(3)),
      sgr: Number(sgr.toFixed(2)),
      yieldPerHectare: Number(yieldPerHectare.toFixed(2)),
      biomassPerM2: Number(biomassPerM2.toFixed(2)),
      totalFeedCost: Number(totalFeedCost.toFixed(2)),
      feedCostPerKg: Number(feedCostPerKg.toFixed(2))
    };
  }, [inputs]);

  const getPerformanceAnalysis = () => {
    const { currentSurvivalRate } = inputs;
    const { fcr, sgr, yieldPerHectare } = calculations;
    
    const analysis = [];
    
    if (calculations.fcr < 1.5) {
      analysis.push({ type: 'success', message: 'Excellent FCR - Feed efficiency is very good' });
    } else if (calculations.fcr > 2.0) {
      analysis.push({ type: 'warning', message: 'High FCR - Consider optimizing feeding strategy' });
    }
    
    if (currentSurvivalRate > 80) {
      analysis.push({ type: 'success', message: 'Good survival rate - Pond management is effective' });
    } else if (currentSurvivalRate < 60) {
      analysis.push({ type: 'error', message: 'Low survival rate - Check water quality and disease management' });
    }
    
    if (calculations.sgr > 8) {
      analysis.push({ type: 'success', message: 'Excellent growth rate - Shrimp are growing well' });
    } else if (calculations.sgr < 5) {
      analysis.push({ type: 'warning', message: 'Slow growth - Consider feed quality and environmental factors' });
    }
    
    return analysis;
  };

  const recommendations = useMemo(() => {
    const analysis = getPerformanceAnalysis();
    const recs = [];
    
    if (calculations.fcr > 1.8) {
      recs.push("Optimize feeding schedule and reduce waste to improve FCR");
      recs.push("Check feed quality and storage conditions");
    }
    
    if (inputs.currentSurvivalRate < 70) {
      recs.push("Improve water quality management and disease prevention");
      recs.push("Consider probiotic supplementation");
    }
    
    if (calculations.sgr < 6) {
      recs.push("Increase feeding frequency or improve feed quality");
      recs.push("Check water temperature and dissolved oxygen levels");
    }
    
    if (calculations.yieldPerHectare < 3000) {
      recs.push("Consider increasing stocking density for next cycle");
      recs.push("Improve pond preparation and water management");
    }
    
    return recs;
  }, [calculations, inputs]);

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Cultivation Performance Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inputs" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inputs">Input Data</TabsTrigger>
              <TabsTrigger value="results">Performance Results</TabsTrigger>
              <TabsTrigger value="analysis">Analysis & Tips</TabsTrigger>
            </TabsList>
            
            <TabsContent value="inputs" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Initial Stocking Data</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="initialPondArea">Pond Area (m²)</Label>
                      <Input
                        id="initialPondArea"
                        type="number"
                        value={inputs.initialPondArea}
                        onChange={(e) => updateInput('initialPondArea', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="initialStockingDensity">Stocking Density (PL/m²)</Label>
                      <Input
                        id="initialStockingDensity"
                        type="number"
                        value={inputs.initialStockingDensity}
                        onChange={(e) => updateInput('initialStockingDensity', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="initialTotalPL">Total PL Stocked</Label>
                      <Input
                        id="initialTotalPL"
                        type="number"
                        value={inputs.initialTotalPL}
                        onChange={(e) => updateInput('initialTotalPL', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="initialABW">Initial ABW (g)</Label>
                      <Input
                        id="initialABW"
                        type="number"
                        step="0.001"
                        value={inputs.initialABW}
                        onChange={(e) => updateInput('initialABW', Number(e.target.value))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                      <Label htmlFor="currentSurvivalRate">Survival Rate (%)</Label>
                      <Input
                        id="currentSurvivalRate"
                        type="number"
                        value={inputs.currentSurvivalRate}
                        onChange={(e) => updateInput('currentSurvivalRate', Number(e.target.value))}
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
                      <Label htmlFor="totalFeedGiven">Total Feed Given (kg)</Label>
                      <Input
                        id="totalFeedGiven"
                        type="number"
                        value={inputs.totalFeedGiven}
                        onChange={(e) => updateInput('totalFeedGiven', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feedCost">Feed Cost (₹/kg)</Label>
                      <Input
                        id="feedCost"
                        type="number"
                        value={inputs.feedCost}
                        onChange={(e) => updateInput('feedCost', Number(e.target.value))}
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
                    <CardTitle className="text-lg">Growth Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Current Population:</span>
                      <Badge variant="secondary">{calculations.currentPopulation.toLocaleString()} pieces</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Current Biomass:</span>
                      <Badge variant="secondary">{calculations.currentBiomass} kg</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">ADG (Average Daily Gain):</span>
                      <Badge variant="secondary">{calculations.adg} g/day</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">SGR (Specific Growth Rate):</span>
                      <Badge variant="secondary">{calculations.sgr}%/day</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Efficiency Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">FCR (Feed Conversion Ratio):</span>
                      <Badge variant={calculations.fcr < 1.5 ? "default" : calculations.fcr > 2.0 ? "destructive" : "secondary"}>
                        {calculations.fcr}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Yield per Hectare:</span>
                      <Badge variant="secondary">{calculations.yieldPerHectare} kg/ha</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Biomass per m²:</span>
                      <Badge variant="secondary">{calculations.biomassPerM2} kg/m²</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Feed Cost per kg:</span>
                      <Badge variant="secondary">₹{calculations.feedCostPerKg}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6">
              <div className="space-y-4">
                {getPerformanceAnalysis().map((item, index) => (
                  <Alert key={index} variant={item.type === 'error' ? 'destructive' : 'default'}>
                    {item.type === 'success' && <Info className="h-4 w-4" />}
                    {item.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                    {item.type === 'error' && <AlertTriangle className="h-4 w-4" />}
                    <AlertDescription>{item.message}</AlertDescription>
                  </Alert>
                ))}
              </div>

              {recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Standards</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <p><strong>FCR (Feed Conversion Ratio):</strong></p>
                    <p className="text-muted-foreground ml-4">• Excellent: &lt; 1.5 | Good: 1.5-1.8 | Fair: 1.8-2.0 | Poor: &gt; 2.0</p>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><strong>Survival Rate:</strong></p>
                    <p className="text-muted-foreground ml-4">• Excellent: &gt; 80% | Good: 70-80% | Fair: 60-70% | Poor: &lt; 60%</p>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><strong>SGR (Specific Growth Rate):</strong></p>
                    <p className="text-muted-foreground ml-4">• Excellent: &gt; 8%/day | Good: 6-8%/day | Fair: 4-6%/day | Poor: &lt; 4%/day</p>
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

export default CultivationPerformanceCalculator;