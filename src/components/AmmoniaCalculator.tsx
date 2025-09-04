import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Droplets, AlertTriangle, Info, TrendingUp } from "lucide-react";

interface CalculatorInputs {
  totalAmmoniaNitrogen: number; // TAN in ppm
  waterTemperature: number; // in Celsius
  pH: number;
  salinity: number; // in ppt (parts per thousand)
  pondType: 'freshwater' | 'brackish' | 'marine';
}

const AmmoniaCalculator = () => {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    totalAmmoniaNitrogen: 0.5,
    waterTemperature: 28,
    pH: 8.0,
    salinity: 15,
    pondType: 'brackish'
  });

  const updateInput = <K extends keyof CalculatorInputs>(field: K, value: CalculatorInputs[K]) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const calculations = useMemo(() => {
    const { totalAmmoniaNitrogen, waterTemperature, pH, salinity, pondType } = inputs;

    // Convert temperature to Kelvin
    const tempKelvin = waterTemperature + 273.15;

    // Calculate pKa for ammonia/ammonium equilibrium
    // pKa varies with temperature and salinity
    let pKa;
    if (pondType === 'freshwater') {
      pKa = 0.09018 + (2729.92 / tempKelvin);
    } else {
      // For brackish/marine water, adjust for salinity effect
      const salinityEffect = salinity * 0.0001;
      pKa = 0.09018 + (2729.92 / tempKelvin) + salinityEffect;
    }

    // Calculate fraction of unionized ammonia (NH3)
    const fraction_nh3 = 1 / (1 + Math.pow(10, (pKa - pH)));

    // Calculate unionized ammonia concentration
    const unionizedAmmonia = totalAmmoniaNitrogen * fraction_nh3;

    // Calculate ionized ammonium concentration
    const ionizedAmmonium = totalAmmoniaNitrogen - unionizedAmmonia;

    // Toxicity assessment
    let toxicityLevel = 'safe';
    let toxicityColor = 'default';
    let toxicityPercentage = 0;

    if (unionizedAmmonia <= 0.02) {
      toxicityLevel = 'safe';
      toxicityColor = 'default';
      toxicityPercentage = (unionizedAmmonia / 0.02) * 25;
    } else if (unionizedAmmonia <= 0.05) {
      toxicityLevel = 'moderate';
      toxicityColor = 'secondary';
      toxicityPercentage = 25 + ((unionizedAmmonia - 0.02) / 0.03) * 25;
    } else if (unionizedAmmonia <= 0.1) {
      toxicityLevel = 'high';
      toxicityColor = 'destructive';
      toxicityPercentage = 50 + ((unionizedAmmonia - 0.05) / 0.05) * 25;
    } else {
      toxicityLevel = 'critical';
      toxicityColor = 'destructive';
      toxicityPercentage = 75 + Math.min(((unionizedAmmonia - 0.1) / 0.1) * 25, 25);
    }

    return {
      unionizedAmmonia: Number(unionizedAmmonia.toFixed(4)),
      ionizedAmmonium: Number(ionizedAmmonium.toFixed(4)),
      fractionNH3: Number((fraction_nh3 * 100).toFixed(2)),
      pKa: Number(pKa.toFixed(2)),
      toxicityLevel,
      toxicityColor,
      toxicityPercentage: Math.min(Math.round(toxicityPercentage), 100)
    };
  }, [inputs]);

  const getToxicityDescription = () => {
    const { unionizedAmmonia } = calculations;
    
    if (unionizedAmmonia <= 0.02) {
      return {
        level: "Safe",
        description: "Ammonia levels are within safe limits for aquaculture",
        action: "Continue normal operations with regular monitoring"
      };
    } else if (unionizedAmmonia <= 0.05) {
      return {
        level: "Moderate Risk",
        description: "Elevated ammonia levels may cause stress to aquatic animals",
        action: "Increase water exchange, reduce feeding, check biofilter"
      };
    } else if (unionizedAmmonia <= 0.1) {
      return {
        level: "High Risk",
        description: "Dangerous ammonia levels causing significant stress and mortality risk",
        action: "Immediate action required: increase aeration, water exchange, reduce stocking density"
      };
    } else {
      return {
        level: "Critical",
        description: "Lethal ammonia levels - immediate intervention required",
        action: "Emergency protocol: massive water exchange, stop feeding, increase aeration immediately"
      };
    }
  };

  const getRecommendations = () => {
    const { unionizedAmmonia } = calculations;
    const { pH, waterTemperature } = inputs;
    const recommendations = [];

    if (unionizedAmmonia > 0.02) {
      recommendations.push("Increase water exchange rate to dilute ammonia concentration");
      recommendations.push("Reduce or stop feeding temporarily to decrease ammonia production");
      recommendations.push("Increase aeration to promote nitrification");
      recommendations.push("Check and clean biofilter if present");
    }

    if (pH > 8.5) {
      recommendations.push("Consider pH reduction as high pH increases toxic ammonia fraction");
      recommendations.push("Use organic acids or CO2 injection to lower pH");
    }

    if (waterTemperature > 30) {
      recommendations.push("Reduce water temperature if possible - heat increases ammonia toxicity");
      recommendations.push("Increase aeration as warm water holds less dissolved oxygen");
    }

    if (inputs.totalAmmoniaNitrogen > 1.0) {
      recommendations.push("Check for dead animals or uneaten feed causing ammonia spike");
      recommendations.push("Consider emergency harvesting if levels remain high");
      recommendations.push("Test for other water quality parameters (nitrite, dissolved oxygen)");
    }

    return recommendations;
  };

  const getFactorsAffectingAmmonia = () => {
    return [
      {
        factor: "pH Level",
        effect: "Higher pH increases toxic NH3 fraction",
        optimal: "7.5 - 8.5 for most species"
      },
      {
        factor: "Temperature",
        effect: "Higher temperature increases NH3 toxicity",
        optimal: "26-30°C for tropical species"
      },
      {
        factor: "Salinity",
        effect: "Higher salinity slightly reduces NH3 fraction",
        optimal: "Species dependent"
      },
      {
        factor: "Dissolved Oxygen",
        effect: "Low DO reduces nitrification, increases ammonia",
        optimal: "> 5 ppm for most species"
      }
    ];
  };

  const getSafetyLimits = () => {
    return [
      { species: "Shrimp (Penaeus vannamei)", safe: "< 0.02", stress: "0.02-0.05", lethal: "> 0.1" },
      { species: "Tilapia", safe: "< 0.05", stress: "0.05-0.2", lethal: "> 0.5" },
      { species: "Catfish", safe: "< 0.03", stress: "0.03-0.1", lethal: "> 0.3" },
      { species: "Carp", safe: "< 0.025", stress: "0.025-0.08", lethal: "> 0.2" }
    ];
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Ammonia (NH₃) Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inputs" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="inputs">Water Parameters</TabsTrigger>
              <TabsTrigger value="results">Ammonia Levels</TabsTrigger>
              <TabsTrigger value="recommendations">Action Plan</TabsTrigger>
              <TabsTrigger value="reference">Reference Guide</TabsTrigger>
            </TabsList>
            
            <TabsContent value="inputs" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="totalAmmoniaNitrogen">Total Ammonia Nitrogen - TAN (ppm)</Label>
                      <Input
                        id="totalAmmoniaNitrogen"
                        type="number"
                        step="0.01"
                        value={inputs.totalAmmoniaNitrogen}
                        onChange={(e) => updateInput('totalAmmoniaNitrogen', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="waterTemperature">Water Temperature (°C)</Label>
                      <Input
                        id="waterTemperature"
                        type="number"
                        step="0.1"
                        value={inputs.waterTemperature}
                        onChange={(e) => updateInput('waterTemperature', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pH">pH</Label>
                      <Input
                        id="pH"
                        type="number"
                        step="0.1"
                        value={inputs.pH}
                        onChange={(e) => updateInput('pH', Number(e.target.value))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Environment Type</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="salinity">Salinity (ppt)</Label>
                      <Input
                        id="salinity"
                        type="number"
                        step="0.1"
                        value={inputs.salinity}
                        onChange={(e) => updateInput('salinity', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pond Type</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['freshwater', 'brackish', 'marine'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => updateInput('pondType', type)}
                            className={`p-2 text-sm rounded-lg border transition-colors ${
                              inputs.pondType === type
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-secondary hover:bg-secondary/80 border-border'
                            }`}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Salinity Guide:</strong></p>
                      <p>• Freshwater: 0-0.5 ppt</p>
                      <p>• Brackish: 0.5-30 ppt</p>
                      <p>• Marine: 30-35 ppt</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ammonia Analysis Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                        <span className="font-medium">Total Ammonia-N (TAN):</span>
                        <Badge variant="secondary">{inputs.totalAmmoniaNitrogen} ppm</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                        <span className="font-medium text-destructive">Unionized Ammonia (NH₃):</span>
                        <Badge variant={calculations.toxicityColor as any}>{calculations.unionizedAmmonia} ppm</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                        <span className="font-medium">Ionized Ammonium (NH₄⁺):</span>
                        <Badge variant="secondary">{calculations.ionizedAmmonium} ppm</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                        <span className="font-medium">NH₃ Percentage:</span>
                        <Badge variant="secondary">{calculations.fractionNH3}%</Badge>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold mb-2">Toxicity Level</h3>
                        <Badge 
                          variant={calculations.toxicityColor as any} 
                          className="text-lg px-4 py-2"
                        >
                          {getToxicityDescription().level}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Risk Level</span>
                          <span>{calculations.toxicityPercentage}%</span>
                        </div>
                        <Progress value={calculations.toxicityPercentage} className="h-3" />
                      </div>
                    </div>
                  </div>

                  <Alert variant={calculations.toxicityLevel === 'safe' ? 'default' : 'destructive'}>
                    {calculations.toxicityLevel === 'safe' ? (
                      <Info className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertTitle>{getToxicityDescription().level}</AlertTitle>
                    <AlertDescription className="mt-2">
                      <p>{getToxicityDescription().description}</p>
                      <p className="font-medium mt-2">Action: {getToxicityDescription().action}</p>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-6">
              {getRecommendations().length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Immediate Actions Required</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getRecommendations().map((recommendation, index) => (
                        <Alert key={index}>
                          <TrendingUp className="h-4 w-4" />
                          <AlertDescription>{recommendation}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Factors Affecting Ammonia Toxicity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getFactorsAffectingAmmonia().map((item, index) => (
                      <div key={index} className="p-4 bg-secondary/50 rounded-lg">
                        <h4 className="font-medium">{item.factor}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{item.effect}</p>
                        <p className="text-sm font-medium text-primary mt-1">Optimal: {item.optimal}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Prevention Strategies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm">Maintain proper stocking density to avoid overloading biofilter</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm">Feed appropriate amounts and remove uneaten feed promptly</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm">Maintain adequate aeration and water circulation</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm">Regular water quality testing (daily during critical periods)</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm">Maintain healthy biofilter with beneficial bacteria</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm">Use probiotics to enhance nitrogen cycle efficiency</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reference" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Species-Specific Safety Limits (NH₃ ppm)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Species</th>
                          <th className="text-left p-2">Safe</th>
                          <th className="text-left p-2">Stress</th>
                          <th className="text-left p-2">Lethal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSafetyLimits().map((limit, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2 font-medium">{limit.species}</td>
                            <td className="p-2">
                              <Badge variant="default" className="text-xs">{limit.safe}</Badge>
                            </td>
                            <td className="p-2">
                              <Badge variant="secondary" className="text-xs">{limit.stress}</Badge>
                            </td>
                            <td className="p-2">
                              <Badge variant="destructive" className="text-xs">{limit.lethal}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Understanding the Calculation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <p><strong>Formula Used:</strong></p>
                    <p className="font-mono bg-secondary/50 p-2 rounded">
                      NH₃ = TAN × (1 / (1 + 10^(pKa - pH)))
                    </p>
                    <p className="text-muted-foreground">
                      Where pKa is temperature and salinity dependent
                    </p>
                  </div>
                  <div className="text-sm space-y-2">
                    <p><strong>Current Calculation Parameters:</strong></p>
                    <p>pKa (calculated): {calculations.pKa}</p>
                    <p>NH₃ fraction: {calculations.fractionNH3}%</p>
                    <p>NH₄⁺ fraction: {(100 - calculations.fractionNH3).toFixed(2)}%</p>
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

export default AmmoniaCalculator;