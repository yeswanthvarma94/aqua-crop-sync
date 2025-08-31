import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  TrendingDown,
  Droplets,
  Beaker
} from "lucide-react";
import { useTranslation } from "react-i18next";

const Calculators = () => {
  const { t } = useTranslation();
  
  // Calculator selection state
  const [selectedCalculator, setSelectedCalculator] = useState("");
  
  // Cultivation Performance Calculator State
  const [initialStocking, setInitialStocking] = useState(100000);
  const [abw, setAbw] = useState(15);
  const [feedingRate, setFeedingRate] = useState([4]);
  const [survivalRate, setSurvivalRate] = useState([85]);
  const [dailyFeed, setDailyFeed] = useState(50);
  const [cumulativeFeed, setCumulativeFeed] = useState(500);
  
  // Daily Feed Calculator State
  const [dfInitialStocking, setDfInitialStocking] = useState(100000);
  const [dfAbw, setDfAbw] = useState(15);
  const [dfFeedingRate, setDfFeedingRate] = useState([4]);
  const [dfSurvivalRate, setDfSurvivalRate] = useState([85]);
  
  // Product Amount Calculator State
  const [productType, setProductType] = useState("solid");
  const [pondArea, setPondArea] = useState(1000);
  const [waterLevel, setWaterLevel] = useState(1.2);
  const [dosage, setDosage] = useState(2);
  const [dosageUnit, setDosageUnit] = useState("ppm");
  
  // Ammonia Calculator State
  const [temperature, setTemperature] = useState(30);
  const [ph, setPh] = useState(8.0);
  const [tan, setTan] = useState(0.5);
  
  // Check Tray Calculator State
  const [estimatedPopulation, setEstimatedPopulation] = useState(85000);
  const [sizeMode, setSizeMode] = useState("abw");
  const [animalSize, setAnimalSize] = useState(15);
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [nextMeal, setNextMeal] = useState(1);
  const [lastMealAmount, setLastMealAmount] = useState(45);
  const [trayObservation, setTrayObservation] = useState("");

  // Calculation functions
  const calculateCultivationPerformance = () => {
    const biomass = dailyFeed / (feedingRate[0] / 100);
    const population = (biomass * 1000) / abw;
    const fcr = cumulativeFeed / biomass;
    const calculatedSurvivalRate = (population / initialStocking) * 100;
    
    return { biomass, population, fcr, calculatedSurvivalRate };
  };

  const calculateDailyFeed = () => {
    return (dfInitialStocking * dfAbw * dfFeedingRate[0] * dfSurvivalRate[0]) / (100 * 100 * 1000);
  };

  const calculateProductAmount = () => {
    return (pondArea * waterLevel * dosage) / 1000;
  };

  const calculateAmmonia = () => {
    // Calculate pKa based on temperature
    const pKa = 0.09018 + (2729.92 / (temperature + 273.15));
    const nh3 = tan / (1 + Math.pow(10, pKa - ph));
    return nh3;
  };

  const getCheckTrayRecommendation = () => {
    switch (trayObservation) {
      case "empty":
        return { 
          text: t("calculators.checkTray.recommendations.increase"),
          color: "bg-green-500",
          icon: TrendingUp
        };
      case "slight":
        return { 
          text: t("calculators.checkTray.recommendations.maintain"),
          color: "bg-blue-500",
          icon: CheckCircle
        };
      case "moderate":
        return { 
          text: t("calculators.checkTray.recommendations.decrease"),
          color: "bg-yellow-500",
          icon: TrendingDown
        };
      case "heavy":
        return { 
          text: t("calculators.checkTray.recommendations.significant_decrease"),
          color: "bg-red-500",
          icon: XCircle
        };
      default:
        return { 
          text: "Select tray observation for recommendation",
          color: "bg-gray-500",
          icon: Info
        };
    }
  };

  const getFCRStatus = (fcr: number) => {
    if (fcr <= 1.2) return { color: "bg-green-500", text: t("calculators.status.excellent"), icon: CheckCircle };
    if (fcr <= 1.5) return { color: "bg-yellow-500", text: t("calculators.status.good"), icon: AlertTriangle };
    if (fcr <= 2.0) return { color: "bg-orange-500", text: t("calculators.status.caution"), icon: AlertTriangle };
    return { color: "bg-red-500", text: t("calculators.status.poor"), icon: XCircle };
  };

  const getAmmoniaStatus = (nh3: number) => {
    if (nh3 <= 0.02) return { color: "bg-green-500", text: t("calculators.ammonia.safe"), icon: CheckCircle };
    if (nh3 <= 0.05) return { color: "bg-yellow-500", text: t("calculators.ammonia.caution"), icon: AlertTriangle };
    return { color: "bg-red-500", text: t("calculators.ammonia.danger"), icon: XCircle };
  };

  const calculatorOptions = [
    { value: "cultivation", label: t("calculators.cultivationPerformance.title"), icon: Scale },
    { value: "daily-feed", label: t("calculators.dailyFeed.title"), icon: Utensils },
    { value: "product-amount", label: t("calculators.productAmount.title"), icon: Beaker },
    { value: "ammonia", label: t("calculators.ammonia.title"), icon: Droplets },
    { value: "check-tray", label: t("calculators.checkTray.title"), icon: Fish }
  ];

  const renderCalculatorContent = () => {
    switch (selectedCalculator) {
      case "cultivation":
        const cultivationResults = calculateCultivationPerformance();
        const fcrStatus = getFCRStatus(cultivationResults.fcr);
        
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                {t("calculators.cultivationPerformance.title")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("calculators.cultivationPerformance.description")}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="initial-stocking">{t("calculators.cultivationPerformance.initialStocking")}</Label>
                    <Input
                      id="initial-stocking"
                      type="number"
                      value={initialStocking}
                      onChange={(e) => setInitialStocking(Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="abw">{t("calculators.cultivationPerformance.abw")}</Label>
                    <Input
                      id="abw"
                      type="number"
                      step="0.1"
                      value={abw}
                      onChange={(e) => setAbw(Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label>{t("calculators.cultivationPerformance.feedingRate")}: {feedingRate[0]}%</Label>
                    <Slider
                      value={feedingRate}
                      onValueChange={setFeedingRate}
                      max={10}
                      min={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="daily-feed">{t("calculators.cultivationPerformance.dailyFeed")}</Label>
                    <Input
                      id="daily-feed"
                      type="number"
                      step="0.1"
                      value={dailyFeed}
                      onChange={(e) => setDailyFeed(Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cumulative-feed">{t("calculators.cultivationPerformance.cumulativeFeed")}</Label>
                    <Input
                      id="cumulative-feed"
                      type="number"
                      step="0.1"
                      value={cumulativeFeed}
                      onChange={(e) => setCumulativeFeed(Number(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
                    <CardContent className="pt-6 space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{cultivationResults.biomass.toFixed(1)} kg</div>
                        <p className="text-sm text-muted-foreground">{t("calculators.cultivationPerformance.biomass")}</p>
                      </div>
                      
                      <Separator />
                      
                      <div className="text-center">
                        <div className="text-xl font-semibold">{Math.round(cultivationResults.population).toLocaleString()}</div>
                        <p className="text-sm text-muted-foreground">{t("calculators.cultivationPerformance.population")}</p>
                      </div>
                      
                      <Separator />
                      
                      <div className="text-center">
                        <div className="text-xl font-semibold">{cultivationResults.fcr.toFixed(2)}</div>
                        <p className="text-sm text-muted-foreground">{t("calculators.cultivationPerformance.fcr")}</p>
                        <Badge className={`${fcrStatus.color} text-white mt-2`}>
                          <fcrStatus.icon className="w-3 h-3 mr-1" />
                          {fcrStatus.text}
                        </Badge>
                      </div>
                      
                      <Separator />
                      
                      <div className="text-center">
                        <div className="text-xl font-semibold">{cultivationResults.calculatedSurvivalRate.toFixed(1)}%</div>
                        <p className="text-sm text-muted-foreground">Calculated {t("calculators.cultivationPerformance.survivalRate")}</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-xs">
                    <div className="space-y-1">
                      <div><strong>{t("calculators.cultivationPerformance.biomassFormula")}</strong></div>
                      <div><strong>{t("calculators.cultivationPerformance.populationFormula")}</strong></div>
                      <div><strong>{t("calculators.cultivationPerformance.fcrFormula")}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "daily-feed":
        const dailyFeedResult = calculateDailyFeed();
        
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                {t("calculators.dailyFeed.title")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("calculators.dailyFeed.description")}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="df-initial-stocking">{t("calculators.cultivationPerformance.initialStocking")}</Label>
                    <Input
                      id="df-initial-stocking"
                      type="number"
                      value={dfInitialStocking}
                      onChange={(e) => setDfInitialStocking(Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="df-abw">{t("calculators.cultivationPerformance.abw")}</Label>
                    <Input
                      id="df-abw"
                      type="number"
                      step="0.1"
                      value={dfAbw}
                      onChange={(e) => setDfAbw(Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label>{t("calculators.cultivationPerformance.feedingRate")}: {dfFeedingRate[0]}%</Label>
                    <Slider
                      value={dfFeedingRate}
                      onValueChange={setDfFeedingRate}
                      max={10}
                      min={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label>{t("calculators.cultivationPerformance.survivalRate")}: {dfSurvivalRate[0]}%</Label>
                    <Slider
                      value={dfSurvivalRate}
                      onValueChange={setDfSurvivalRate}
                      max={100}
                      min={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">
                          {dailyFeedResult.toFixed(2)} kg/day
                        </div>
                        <p className="text-sm text-muted-foreground">{t("calculators.dailyFeed.result")}</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-xs">
                    <strong>{t("calculators.dailyFeed.formula")}</strong>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "product-amount":
        const productAmountResult = calculateProductAmount();
        
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5 text-primary" />
                {t("calculators.productAmount.title")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("calculators.productAmount.description")}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>{t("calculators.productAmount.productType")}</Label>
                    <Select value={productType} onValueChange={setProductType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">{t("calculators.productAmount.solid")}</SelectItem>
                        <SelectItem value="powder">{t("calculators.productAmount.powder")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="pond-area">{t("calculators.productAmount.pondArea")}</Label>
                    <Input
                      id="pond-area"
                      type="number"
                      value={pondArea}
                      onChange={(e) => setPondArea(Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="water-level">{t("calculators.productAmount.waterLevel")}</Label>
                    <Input
                      id="water-level"
                      type="number"
                      step="0.1"
                      value={waterLevel}
                      onChange={(e) => setWaterLevel(Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="dosage">{t("calculators.productAmount.dosage")}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="dosage"
                        type="number"
                        step="0.1"
                        value={dosage}
                        onChange={(e) => setDosage(Number(e.target.value))}
                        className="flex-1"
                      />
                      <Select value={dosageUnit} onValueChange={setDosageUnit}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ppm">{t("calculators.productAmount.ppm")}</SelectItem>
                          <SelectItem value="mgL">{t("calculators.productAmount.mgL")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">
                          {productAmountResult.toFixed(2)} kg
                        </div>
                        <p className="text-sm text-muted-foreground">{t("calculators.productAmount.result")}</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-xs">
                    <strong>{t("calculators.productAmount.formula")}</strong>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "ammonia":
        const ammoniaResult = calculateAmmonia();
        const ammoniaStatus = getAmmoniaStatus(ammoniaResult);
        
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-primary" />
                {t("calculators.ammonia.title")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("calculators.ammonia.description")}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="temperature">{t("calculators.ammonia.temperature")}</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="ph">{t("calculators.ammonia.ph")}</Label>
                    <Input
                      id="ph"
                      type="number"
                      step="0.1"
                      value={ph}
                      onChange={(e) => setPh(Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tan">{t("calculators.ammonia.tan")}</Label>
                    <Input
                      id="tan"
                      type="number"
                      step="0.01"
                      value={tan}
                      onChange={(e) => setTan(Number(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">
                          {ammoniaResult.toFixed(4)} mg/L
                        </div>
                        <p className="text-sm text-muted-foreground">{t("calculators.ammonia.result")}</p>
                        
                        <Badge className={`${ammoniaStatus.color} text-white mt-4`}>
                          <ammoniaStatus.icon className="w-3 h-3 mr-1" />
                          {ammoniaStatus.text}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-xs">
                    <strong>{t("calculators.ammonia.formula")}</strong>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "check-tray":
        const trayRecommendation = getCheckTrayRecommendation();
        
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fish className="h-5 w-5 text-primary" />
                {t("calculators.checkTray.title")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("calculators.checkTray.description")}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="estimated-population">{t("calculators.checkTray.estimatedPopulation")}</Label>
                    <Input
                      id="estimated-population"
                      type="number"
                      value={estimatedPopulation}
                      onChange={(e) => setEstimatedPopulation(Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label>{t("calculators.checkTray.avgAnimalSize")}</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={sizeMode === "abw" ? "default" : "outline"}
                        onClick={() => setSizeMode("abw")}
                        size="sm"
                      >
                        {t("calculators.checkTray.abwMode")}
                      </Button>
                      <Button
                        variant={sizeMode === "count" ? "default" : "outline"}
                        onClick={() => setSizeMode("count")}
                        size="sm"
                      >
                        {t("calculators.checkTray.countMode")}
                      </Button>
                    </div>
                    <Input
                      type="number"
                      step="0.1"
                      value={animalSize}
                      onChange={(e) => setAnimalSize(Number(e.target.value))}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label>{t("calculators.checkTray.mealsPerDay")}</Label>
                    <div className="flex gap-2 mt-2">
                      {[3, 4, 5].map((meals) => (
                        <Button
                          key={meals}
                          variant={mealsPerDay === meals ? "default" : "outline"}
                          onClick={() => setMealsPerDay(meals)}
                          size="sm"
                        >
                          {meals}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label>{t("calculators.checkTray.nextMeal")}</Label>
                    <div className="flex gap-2 mt-2">
                      {Array.from({ length: mealsPerDay }, (_, i) => i + 1).map((meal) => (
                        <Button
                          key={meal}
                          variant={nextMeal === meal ? "default" : "outline"}
                          onClick={() => setNextMeal(meal)}
                          size="sm"
                        >
                          {meal}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="last-meal-amount">{t("calculators.checkTray.lastMealAmount")}</Label>
                    <Input
                      id="last-meal-amount"
                      type="number"
                      step="0.1"
                      value={lastMealAmount}
                      onChange={(e) => setLastMealAmount(Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label>{t("calculators.checkTray.trayObservation")}</Label>
                    <Select value={trayObservation} onValueChange={setTrayObservation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select observation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="empty">{t("calculators.checkTray.observations.empty")}</SelectItem>
                        <SelectItem value="slight">{t("calculators.checkTray.observations.slight")}</SelectItem>
                        <SelectItem value="moderate">{t("calculators.checkTray.observations.moderate")}</SelectItem>
                        <SelectItem value="heavy">{t("calculators.checkTray.observations.heavy")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Badge className={`${trayRecommendation.color} text-white mb-4`}>
                          <trayRecommendation.icon className="w-4 h-4 mr-2" />
                          {trayRecommendation.text}
                        </Badge>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Population:</span>
                            <span className="font-medium">{estimatedPopulation.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Size:</span>
                            <span className="font-medium">
                              {animalSize} {sizeMode === "abw" ? "g" : "pcs/kg"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Last meal:</span>
                            <span className="font-medium">{lastMealAmount} kg</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("calculators.selectCalculator")}</h3>
                <p className="text-muted-foreground">
                  Choose a calculator from the dropdown above to get started.
                </p>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="container mx-auto p-4 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          {t("calculators.title")}
        </h1>
        <p className="text-muted-foreground mb-4">
          {t("calculators.subtitle")}
        </p>
        
        <div className="max-w-md">
          <Label htmlFor="calculator-select">{t("calculators.selectCalculator")}</Label>
          <Select value={selectedCalculator} onValueChange={setSelectedCalculator}>
            <SelectTrigger>
              <SelectValue placeholder={t("calculators.selectCalculator")} />
            </SelectTrigger>
            <SelectContent>
              {calculatorOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {renderCalculatorContent()}

      {selectedCalculator && (
        <div className="mt-6">
          <Card className="bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Important Disclaimer
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {t("calculators.disclaimer")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Calculators;