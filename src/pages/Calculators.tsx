import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FlaskConical, Calculator, Thermometer, Scale, Droplets, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Import calculation functions
import {
  calculateOptimalTrayCount,
  calculateGutFillingTime,
  calculateCurrentBiomass,
  calculateSizeSpecificFeedingRate,
  calculateFeedingRecommendation,
  calculateFCR,
  calculateWaterQualityAdjustment,
  calculateGrowthProjection
} from "@/lib/calculations";

const Calculators = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // State for different calculators
  const [trayInputs, setTrayInputs] = useState({
    totalArea: 5000,
    activeArea: 4500
  });
  
  const [feedingInputs, setFeedingInputs] = useState({
    shrimpWeight: 15,
    temperature: 30,
    initialStock: 100000,
    survivalRate: 0.8,
    daysOld: 45
  });
  
  const [waterInputs, setWaterInputs] = useState({
    temperature: 30,
    dissolvedOxygen: 5.5,
    ammonia: 0.2,
    nitrite: 0.1,
    ph: 8.0
  });
  
  const [fcrInputs, setFcrInputs] = useState({
    totalFeedGiven: 1200,
    initialBiomass: 500,
    finalBiomass: 1000
  });

  // Calculate results
  const trayResults = calculateOptimalTrayCount({
    totalArea: trayInputs.totalArea,
    activeArea: trayInputs.activeArea
  });
  
  const temperatureResults = calculateGutFillingTime(feedingInputs.temperature);
  
  const biomassResults = calculateCurrentBiomass({
    initialStock: feedingInputs.initialStock,
    currentSurvivalRate: feedingInputs.survivalRate / 100,
    averageBodyWeight: feedingInputs.shrimpWeight,
    daysOld: feedingInputs.daysOld
  });
  
  const feedingRateResults = calculateSizeSpecificFeedingRate(feedingInputs.shrimpWeight);
  
  const feedingRecommendation = calculateFeedingRecommendation(
    {
      initialStock: feedingInputs.initialStock,
      currentSurvivalRate: feedingInputs.survivalRate / 100,
      averageBodyWeight: feedingInputs.shrimpWeight,
      daysOld: feedingInputs.daysOld
    },
    feedingInputs.temperature,
    {
      waterQuality: 1.0,
      weather: 1.0,
      molting: false,
      dissolvedOxygen: 1.0
    }
  );
  
  const waterQualityResults = calculateWaterQualityAdjustment({
    temperature: waterInputs.temperature,
    dissolvedOxygen: waterInputs.dissolvedOxygen,
    ammonia: waterInputs.ammonia,
    nitrite: waterInputs.nitrite,
    ph: waterInputs.ph
  });
  
  const fcrResults = calculateFCR(
    fcrInputs.totalFeedGiven,
    fcrInputs.initialBiomass,
    fcrInputs.finalBiomass
  );
  
  const growthProjection = calculateGrowthProjection(
    {
      initialStock: feedingInputs.initialStock,
      currentSurvivalRate: feedingInputs.survivalRate / 100,
      averageBodyWeight: feedingInputs.shrimpWeight,
      daysOld: feedingInputs.daysOld
    },
    25, // target harvest weight
    fcrResults.fcr
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-screen-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">{t("quickActions.calculators")}</h2>
            </div>
            <Button size="sm" variant="secondary" onClick={() => navigate("/")}>
              {t("nav.home")}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pb-24 pt-4">
        <Tabs defaultValue="tray-setup" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="tray-setup" className="text-xs">
              <Scale className="h-3 w-3 mr-1" />
              Tray Setup
            </TabsTrigger>
            <TabsTrigger value="feeding" className="text-xs">
              <Calculator className="h-3 w-3 mr-1" />
              Feeding
            </TabsTrigger>
            <TabsTrigger value="temperature" className="text-xs">
              <Thermometer className="h-3 w-3 mr-1" />
              Temperature
            </TabsTrigger>
            <TabsTrigger value="water-quality" className="text-xs">
              <Droplets className="h-3 w-3 mr-1" />
              Water Quality
            </TabsTrigger>
            <TabsTrigger value="fcr" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              FCR
            </TabsTrigger>
            <TabsTrigger value="growth" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Growth
            </TabsTrigger>
          </TabsList>

          {/* Tray Setup Calculator */}
          <TabsContent value="tray-setup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Check Tray Setup Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="totalArea">Total Pond Area (m²)</Label>
                    <Input
                      id="totalArea"
                      type="number"
                      value={trayInputs.totalArea}
                      onChange={(e) => setTrayInputs(prev => ({
                        ...prev,
                        totalArea: Number(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="activeArea">Active Area (m²)</Label>
                    <Input
                      id="activeArea"
                      type="number"
                      value={trayInputs.activeArea}
                      onChange={(e) => setTrayInputs(prev => ({
                        ...prev,
                        activeArea: Number(e.target.value)
                      }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{trayResults.minimum}</div>
                    <div className="text-sm text-muted-foreground">Minimum Trays</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{trayResults.optimal}</div>
                    <div className="text-sm text-muted-foreground">Optimal Trays</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{trayResults.maximum}</div>
                    <div className="text-sm text-muted-foreground">Maximum Trays</div>
                  </div>
                </div>
                
                <Alert>
                  <AlertDescription>
                    Industry standard: 2-4 trays per 4,000-5,000 m². Optimal density: 1 tray per 2,000-2,500 m².
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feeding Calculator */}
          <TabsContent value="feeding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Feeding Recommendation Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shrimpWeight">Average Body Weight (g)</Label>
                    <Input
                      id="shrimpWeight"
                      type="number"
                      value={feedingInputs.shrimpWeight}
                      onChange={(e) => setFeedingInputs(prev => ({
                        ...prev,
                        shrimpWeight: Number(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="temperature">Water Temperature (°C)</Label>
                    <Input
                      id="temperature"
                      type="number"
                      value={feedingInputs.temperature}
                      onChange={(e) => setFeedingInputs(prev => ({
                        ...prev,
                        temperature: Number(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="initialStock">Initial Stock</Label>
                    <Input
                      id="initialStock"
                      type="number"
                      value={feedingInputs.initialStock}
                      onChange={(e) => setFeedingInputs(prev => ({
                        ...prev,
                        initialStock: Number(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="survivalRate">Survival Rate (%)</Label>
                    <Input
                      id="survivalRate"
                      type="number"
                      value={feedingInputs.survivalRate}
                      onChange={(e) => setFeedingInputs(prev => ({
                        ...prev,
                        survivalRate: Number(e.target.value)
                      }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Current Biomass</div>
                      <div className="text-xl font-bold">{biomassResults.totalBiomass} kg</div>
                      <Badge variant={biomassResults.confidence === 'high' ? 'default' : biomassResults.confidence === 'medium' ? 'secondary' : 'destructive'}>
                        {biomassResults.confidence} confidence
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Feeding Rate</div>
                      <div className="text-xl font-bold">{feedingRateResults.feedingRatePercent}%</div>
                      <div className="text-xs text-muted-foreground">{feedingRateResults.category}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{feedingRecommendation.totalDailyFeed} kg</div>
                      <div className="text-sm text-muted-foreground">Total Daily Feed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{feedingRecommendation.trayFeed} kg</div>
                      <div className="text-sm text-muted-foreground">Tray Feed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{feedingRecommendation.broadcastFeed} kg</div>
                      <div className="text-sm text-muted-foreground">Broadcast Feed</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Temperature Calculator */}
          <TabsContent value="temperature" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  Temperature-Based Feeding Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="temp">Water Temperature (°C)</Label>
                  <Input
                    id="temp"
                    type="number"
                    value={feedingInputs.temperature}
                    onChange={(e) => setFeedingInputs(prev => ({
                      ...prev,
                      temperature: Number(e.target.value)
                    }))}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">{temperatureResults.gutFillingMinutes} min</div>
                    <div className="text-sm text-muted-foreground">Gut Filling Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-orange-600">{temperatureResults.fecesExcretionMinutes} min</div>
                    <div className="text-sm text-muted-foreground">Feces Excretion</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{Math.round(temperatureResults.feedingEfficiency * 100)}%</div>
                    <div className="text-sm text-muted-foreground">Feeding Efficiency</div>
                  </div>
                </div>
                
                <Alert>
                  <AlertDescription>
                    Optimal feeding temperature: 29-31°C. Growth rate decreases 8-10% per 1°C temperature reduction.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Water Quality Calculator */}
          <TabsContent value="water-quality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  Water Quality Adjustment Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="do">Dissolved Oxygen (mg/L)</Label>
                    <Input
                      id="do"
                      type="number"
                      step="0.1"
                      value={waterInputs.dissolvedOxygen}
                      onChange={(e) => setWaterInputs(prev => ({
                        ...prev,
                        dissolvedOxygen: Number(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ammonia">Ammonia (mg/L)</Label>
                    <Input
                      id="ammonia"
                      type="number"
                      step="0.1"
                      value={waterInputs.ammonia}
                      onChange={(e) => setWaterInputs(prev => ({
                        ...prev,
                        ammonia: Number(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nitrite">Nitrite (mg/L)</Label>
                    <Input
                      id="nitrite"
                      type="number"
                      step="0.1"
                      value={waterInputs.nitrite}
                      onChange={(e) => setWaterInputs(prev => ({
                        ...prev,
                        nitrite: Number(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ph">pH</Label>
                    <Input
                      id="ph"
                      type="number"
                      step="0.1"
                      value={waterInputs.ph}
                      onChange={(e) => setWaterInputs(prev => ({
                        ...prev,
                        ph: Number(e.target.value)
                      }))}
                    />
                  </div>
                </div>
                
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span>Feed Adjustment Factor</span>
                    <Badge variant={waterQualityResults.severity === 'good' ? 'default' : waterQualityResults.severity === 'caution' ? 'secondary' : 'destructive'}>
                      {waterQualityResults.severity}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-primary">{Math.round(waterQualityResults.adjustmentFactor * 100)}%</div>
                  
                  {waterQualityResults.recommendations.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-sm font-medium">Recommendations:</div>
                      {waterQualityResults.recommendations.map((rec, index) => (
                        <Alert key={index}>
                          <AlertDescription className="text-xs">{rec}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FCR Calculator */}
          <TabsContent value="fcr" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Feed Conversion Ratio (FCR) Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="totalFeed">Total Feed Given (kg)</Label>
                    <Input
                      id="totalFeed"
                      type="number"
                      value={fcrInputs.totalFeedGiven}
                      onChange={(e) => setFcrInputs(prev => ({
                        ...prev,
                        totalFeedGiven: Number(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="initialBiomass">Initial Biomass (kg)</Label>
                    <Input
                      id="initialBiomass"
                      type="number"
                      value={fcrInputs.initialBiomass}
                      onChange={(e) => setFcrInputs(prev => ({
                        ...prev,
                        initialBiomass: Number(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="finalBiomass">Final Biomass (kg)</Label>
                    <Input
                      id="finalBiomass"
                      type="number"
                      value={fcrInputs.finalBiomass}
                      onChange={(e) => setFcrInputs(prev => ({
                        ...prev,
                        finalBiomass: Number(e.target.value)
                      }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{fcrResults.fcr}</div>
                    <div className="text-sm text-muted-foreground">FCR</div>
                    <Badge variant={
                      fcrResults.fcrCategory === 'excellent' ? 'default' :
                      fcrResults.fcrCategory === 'good' ? 'secondary' :
                      fcrResults.fcrCategory === 'average' ? 'outline' :
                      'destructive'
                    }>
                      {fcrResults.fcrCategory}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{fcrResults.biomassGained} kg</div>
                    <div className="text-sm text-muted-foreground">Biomass Gained</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{Math.round(fcrResults.efficiency * 100)}%</div>
                    <div className="text-sm text-muted-foreground">Efficiency</div>
                  </div>
                </div>
                
                <Alert>
                  <AlertDescription>
                    Target FCR: 1.1-1.2 for optimal profitability. Alert threshold: FCR &gt; 1.5 indicates overfeeding or poor conditions.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Growth Projection Calculator */}
          <TabsContent value="growth" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Growth Projection Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{growthProjection.daysToHarvest} days</div>
                    <div className="text-sm text-muted-foreground">Days to Harvest (25g)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{growthProjection.harvestBiomass} kg</div>
                    <div className="text-sm text-muted-foreground">Projected Harvest</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-600">{growthProjection.expectedFCR}</div>
                  <div className="text-sm text-muted-foreground">Expected FCR at Harvest</div>
                </div>
                
                <Alert>
                  <AlertDescription>
                    Projections based on current growth trends and environmental conditions. Actual results may vary.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Calculators;