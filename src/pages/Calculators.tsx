import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  Scale, 
  Fish, 
  Utensils, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Info,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useTranslation } from "react-i18next";

const Calculators = () => {
  const { t } = useTranslation();
  
  // Biomass Calculator State
  const [initialStock, setInitialStock] = useState(10000);
  const [survivalRate, setSurvivalRate] = useState([80]);
  const [avgBodyWeight, setAvgBodyWeight] = useState(15);
  
  // FCR Calculator State
  const [totalFeedGiven, setTotalFeedGiven] = useState(100);
  const [harvestedWeight, setHarvestedWeight] = useState(80);
  
  // Daily Feed Calculator State
  const [feedingRate, setFeedingRate] = useState([4]);
  
  // Tray Score State
  const [trayScore, setTrayScore] = useState(2);
  
  // Calculate results
  const biomass = (initialStock * (survivalRate[0] / 100) * avgBodyWeight) / 1000;
  const shrimpCount = Math.round((biomass * 1000) / avgBodyWeight);
  const fcr = harvestedWeight > 0 ? totalFeedGiven / harvestedWeight : 0;
  const dailyFeed = (initialStock * avgBodyWeight / 1000 * feedingRate[0] / 100 * survivalRate[0] / 100);
  
  const getFCRStatus = (fcr: number) => {
    if (fcr <= 1.2) return { color: "bg-green-500", text: "Excellent", icon: CheckCircle };
    if (fcr <= 1.5) return { color: "bg-yellow-500", text: "Good", icon: AlertTriangle };
    return { color: "bg-red-500", text: "Needs Attention", icon: XCircle };
  };
  
  const getTrayAdvice = (score: number) => {
    switch (score) {
      case 3: return { text: "Shrimp ate everything! You can increase feed by 10%", icon: TrendingUp, color: "text-green-600" };
      case 2: return { text: "Perfect! Less than 10% leftover. Keep current feeding rate", icon: CheckCircle, color: "text-green-600" };
      case 1: return { text: "Some leftover feed (10-20%). Keep monitoring", icon: AlertTriangle, color: "text-yellow-600" };
      case 0: return { text: "Too much leftover! Reduce feed by 10%", icon: TrendingDown, color: "text-red-600" };
      default: return { text: "Score your tray to get advice", icon: Info, color: "text-gray-600" };
    }
  };
  
  const fcrStatus = getFCRStatus(fcr);
  const trayAdvice = getTrayAdvice(trayScore);

  return (
    <div className="container mx-auto p-4 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          AquaBrahma Calculator - Farmer's Edition
        </h1>
        <p className="text-muted-foreground">
          Simple tools to help you manage your shrimp farm better. All calculations are estimates to guide your decisions.
        </p>
      </div>

      <Tabs defaultValue="biomass" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="biomass" className="flex items-center gap-1">
            <Scale size={16} />
            <span className="hidden sm:inline">Biomass</span>
          </TabsTrigger>
          <TabsTrigger value="fcr" className="flex items-center gap-1">
            <TrendingUp size={16} />
            <span className="hidden sm:inline">FCR</span>
          </TabsTrigger>
          <TabsTrigger value="daily-feed" className="flex items-center gap-1">
            <Utensils size={16} />
            <span className="hidden sm:inline">Daily Feed</span>
          </TabsTrigger>
          <TabsTrigger value="tray-guide" className="flex items-center gap-1">
            <Fish size={16} />
            <span className="hidden sm:inline">Tray Guide</span>
          </TabsTrigger>
        </TabsList>

        {/* Biomass & Shrimp Count Calculator */}
        <TabsContent value="biomass">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Biomass & Shrimp Count Calculator
              </CardTitle>
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>What this tells you:</strong> How much shrimp weight is in your pond and approximately how many shrimp you have.
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <strong>Formula:</strong> Biomass (kg) = Baby shrimp added × Survival rate × Shrimp weight per piece ÷ 1000
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="initial-stock">How many baby shrimp did you add?</Label>
                    <Input
                      id="initial-stock"
                      type="number"
                      value={initialStock}
                      onChange={(e) => setInitialStock(Number(e.target.value))}
                      placeholder="e.g., 10,000"
                    />
                  </div>
                  
                  <div>
                    <Label>Survival rate: {survivalRate[0]}%</Label>
                    <div className="mt-2">
                      <Slider
                        value={survivalRate}
                        onValueChange={setSurvivalRate}
                        max={100}
                        min={50}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="avg-weight">Average weight per shrimp (grams)</Label>
                    <Input
                      id="avg-weight"
                      type="number"
                      step="0.1"
                      value={avgBodyWeight}
                      onChange={(e) => setAvgBodyWeight(Number(e.target.value))}
                      placeholder="e.g., 15.5"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">
                          {biomass.toFixed(1)} kg
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">Total Biomass</p>
                        
                        <Separator className="my-4" />
                        
                        <div className="text-2xl font-semibold text-secondary-foreground mb-2">
                          ≈ {shrimpCount.toLocaleString()} shrimp
                        </div>
                        <p className="text-xs text-muted-foreground">Estimated count</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      <strong>Example:</strong> If you started with 10,000 baby shrimp at 2g each, and 80% survived, 
                      your biomass would be: 10,000 × 80% × 2g ÷ 1000 = 16 kg
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FCR Calculator */}
        <TabsContent value="fcr">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Feed Conversion Ratio (FCR)
              </CardTitle>
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>What this tells you:</strong> How efficiently your feed turns into shrimp weight. Lower numbers are better!
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <strong>Formula:</strong> FCR = Total feed given (kg) ÷ Harvested shrimp weight (kg)
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="total-feed">Total feed given so far (kg)</Label>
                    <Input
                      id="total-feed"
                      type="number"
                      step="0.1"
                      value={totalFeedGiven}
                      onChange={(e) => setTotalFeedGiven(Number(e.target.value))}
                      placeholder="e.g., 100"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="harvested-weight">Expected harvest weight (kg)</Label>
                    <Input
                      id="harvested-weight"
                      type="number"
                      step="0.1"
                      value={harvestedWeight}
                      onChange={(e) => setHarvestedWeight(Number(e.target.value))}
                      placeholder="e.g., 80"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use your current biomass estimate
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-primary mb-2">
                          {fcr.toFixed(2)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">FCR Score</p>
                        
                        <Badge className={`${fcrStatus.color} text-white mb-4`}>
                          <fcrStatus.icon className="w-3 h-3 mr-1" />
                          {fcrStatus.text}
                        </Badge>
                        
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Excellent:</span>
                            <span>1.0 - 1.2</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Good:</span>
                            <span>1.2 - 1.5</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Needs work:</span>
                            <span>&gt; 1.5</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                    <p className="text-xs text-green-800 dark:text-green-200">
                      <strong>Think of it this way:</strong> If your FCR is 1.2, it means you need 1.2 kg of feed to get 1 kg of shrimp. 
                      The closer to 1.0, the more efficient your feeding!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Feed Calculator */}
        <TabsContent value="daily-feed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                Daily Feed Calculator
              </CardTitle>
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>What this tells you:</strong> How much feed to give your shrimp each day based on their current weight and your pond conditions.
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <strong>Formula:</strong> Daily feed = Baby shrimp × Current weight × Feeding rate × Survival rate
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Baby shrimp added</Label>
                      <Input value={initialStock.toLocaleString()} disabled />
                    </div>
                    <div>
                      <Label>Current weight (g)</Label>
                      <Input value={avgBodyWeight} disabled />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Feeding rate: {feedingRate[0]}% of body weight</Label>
                    <div className="mt-2">
                      <Slider
                        value={feedingRate}
                        onValueChange={setFeedingRate}
                        max={8}
                        min={2}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>2%</span>
                        <span>8%</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 p-2 bg-secondary/20 rounded text-xs">
                      <strong>Guidelines by shrimp size:</strong>
                      <div className="mt-1 space-y-1">
                        <div>2-5g: 7-8% • 5-10g: 5-7% • 10-15g: 4-5%</div>
                        <div>15-20g: 3-4% • 20-25g: 3% • 25g+: 2.5%</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Survival rate: {survivalRate[0]}%</Label>
                    <Input value={`${survivalRate[0]}%`} disabled />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">
                          {dailyFeed.toFixed(2)} kg/day
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">Total daily feed needed</p>
                        
                        <Separator className="my-4" />
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Morning feed (40%):</span>
                            <span className="font-medium">{(dailyFeed * 0.4).toFixed(2)} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Afternoon feed (60%):</span>
                            <span className="font-medium">{(dailyFeed * 0.6).toFixed(2)} kg</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg">
                    <p className="text-xs text-purple-800 dark:text-purple-200">
                      <strong>Pro tip:</strong> Split your daily feed into 2-4 portions. Give more feed in the afternoon 
                      when water temperature is optimal (29-31°C).
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tray Feedback Guide */}
        <TabsContent value="tray-guide">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fish className="h-5 w-5 text-primary" />
                Feeding Tray Guide
              </CardTitle>
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>What this tells you:</strong> Check your feeding trays 1-2 hours after feeding to see if you're giving the right amount.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>What did you see in your tray?</Label>
                    <div className="mt-3 space-y-3">
                      <Button
                        variant={trayScore === 3 ? "default" : "outline"}
                        className="w-full justify-start h-auto p-4"
                        onClick={() => setTrayScore(3)}
                      >
                        <div className="text-left">
                          <div className="font-medium">Score 3: Empty tray, lots of shrimp activity</div>
                          <div className="text-xs text-muted-foreground">All feed eaten, shrimp still looking for more</div>
                        </div>
                      </Button>
                      
                      <Button
                        variant={trayScore === 2 ? "default" : "outline"}
                        className="w-full justify-start h-auto p-4"
                        onClick={() => setTrayScore(2)}
                      >
                        <div className="text-left">
                          <div className="font-medium">Score 2: Almost empty, some leftover (&lt;10%)</div>
                          <div className="text-xs text-muted-foreground">Perfect! Just right amount of feed</div>
                        </div>
                      </Button>
                      
                      <Button
                        variant={trayScore === 1 ? "default" : "outline"}
                        className="w-full justify-start h-auto p-4"
                        onClick={() => setTrayScore(1)}
                      >
                        <div className="text-left">
                          <div className="font-medium">Score 1: Some leftover feed (10-20%)</div>
                          <div className="text-xs text-muted-foreground">Slightly too much, but okay</div>
                        </div>
                      </Button>
                      
                      <Button
                        variant={trayScore === 0 ? "default" : "outline"}
                        className="w-full justify-start h-auto p-4"
                        onClick={() => setTrayScore(0)}
                      >
                        <div className="text-left">
                          <div className="font-medium">Score 0: Lots of leftover (&gt;20%)</div>
                          <div className="text-xs text-muted-foreground">Too much feed, low shrimp activity</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <trayAdvice.icon className={`w-12 h-12 mx-auto mb-3 ${trayAdvice.color}`} />
                        <div className="text-lg font-semibold mb-2">
                          Tray Score: {trayScore}
                        </div>
                        <p className={`text-sm ${trayAdvice.color} font-medium`}>
                          {trayAdvice.text}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">What to look for</span>
                      </div>
                      <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
                        <li>• Long fecal strands = healthy digestion</li>
                        <li>• Active swimming around tray</li>
                        <li>• Shrimp gathering at tray during feeding</li>
                      </ul>
                    </div>
                    
                    <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800 dark:text-red-200">Warning signs</span>
                      </div>
                      <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                        <li>• Short or broken fecal strands</li>
                        <li>• Low activity around feeding time</li>
                        <li>• White or cloudy water near tray</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <Card className="mt-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                Important Disclaimer
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                These numbers are <strong>approximate</strong>, based on the data you entered. 
                Actual results can vary depending on shrimp health, water quality, weather, and feed quality. 
                Use this guide to help make decisions—not as exact measurements. Always check your trays and 
                adjust based on what you see in your pond.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simple Tips */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Two Simple Tips for Better Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold mt-0.5">1</div>
              <p className="text-sm">
                <strong>Try the sliders above</strong> - Watch how your results change when you move the survival rate 
                and feeding rate sliders. This helps you understand what affects your farm the most.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold mt-0.5">2</div>
              <p className="text-sm">
                <strong>Check trays every feeding</strong> - If trays are empty, shrimp may need more feed tomorrow. 
                If there's lots left over, reduce the amount. This small check helps you stay on track.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Calculators;