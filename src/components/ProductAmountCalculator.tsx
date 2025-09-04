import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Beaker, Calculator, Info, AlertTriangle } from "lucide-react";

interface CalculatorInputs {
  pondArea: number;
  waterDepth: number;
  productType: 'solid' | 'liquid';
  applicationMethod: 'broadcast' | 'spot' | 'mixed_feed';
  dosageRate: number;
  concentration: number; // for liquid products
  targetParameter: string;
  currentValue: number;
  targetValue: number;
}

const ProductAmountCalculator = () => {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    pondArea: 1000,
    waterDepth: 1.2,
    productType: 'solid',
    applicationMethod: 'broadcast',
    dosageRate: 1, // ppm or kg/ha
    concentration: 10, // % for liquid products
    targetParameter: 'pH',
    currentValue: 7.5,
    targetValue: 8.0
  });

  const updateInput = <K extends keyof CalculatorInputs>(field: K, value: CalculatorInputs[K]) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const calculations = useMemo(() => {
    const { 
      pondArea, waterDepth, productType, applicationMethod, 
      dosageRate, concentration, currentValue, targetValue 
    } = inputs;

    // Water volume calculation
    const waterVolume = pondArea * waterDepth; // in m³
    const waterVolumeLiters = waterVolume * 1000;

    // Basic product amount calculations
    let baseAmount = 0;
    let unit = 'kg';

    if (productType === 'solid') {
      // For solid products (powder, granules)
      if (applicationMethod === 'broadcast') {
        baseAmount = (pondArea / 10000) * dosageRate; // convert m² to hectares
      } else if (applicationMethod === 'mixed_feed') {
        baseAmount = dosageRate; // direct kg amount
      } else {
        baseAmount = (waterVolumeLiters / 1000000) * dosageRate; // ppm calculation
      }
    } else {
      // For liquid products
      const activeIngredientNeeded = (waterVolumeLiters / 1000000) * dosageRate;
      baseAmount = (activeIngredientNeeded * 100) / concentration;
      unit = 'L';
    }

    // Parameter-based adjustments
    let adjustmentFactor = 1;
    if (currentValue && targetValue) {
      const difference = Math.abs(targetValue - currentValue);
      if (inputs.targetParameter === 'pH') {
        adjustmentFactor = difference * 0.5; // Rough pH adjustment factor
      } else if (inputs.targetParameter === 'alkalinity') {
        adjustmentFactor = difference / 50; // Alkalinity adjustment
      } else if (inputs.targetParameter === 'hardness') {
        adjustmentFactor = difference / 100; // Hardness adjustment
      }
    }

    const adjustedAmount = baseAmount * Math.max(adjustmentFactor, 0.1);

    // Application calculations
    const applicationsPerWeek = applicationMethod === 'mixed_feed' ? 14 : 1; // twice daily for feed mixing
    const weeklyAmount = adjustedAmount * applicationsPerWeek;
    const monthlyAmount = weeklyAmount * 4.3;

    // Cost estimation (approximate)
    const costPerUnit = productType === 'solid' ? 200 : 150; // ₹/kg or ₹/L
    const applicationCost = adjustedAmount * costPerUnit;

    return {
      waterVolume: Number(waterVolume.toFixed(2)),
      waterVolumeLiters: Number(waterVolumeLiters.toFixed(0)),
      baseAmount: Number(baseAmount.toFixed(3)),
      adjustedAmount: Number(adjustedAmount.toFixed(3)),
      weeklyAmount: Number(weeklyAmount.toFixed(2)),
      monthlyAmount: Number(monthlyAmount.toFixed(2)),
      applicationCost: Number(applicationCost.toFixed(2)),
      unit,
      adjustmentFactor: Number(adjustmentFactor.toFixed(2))
    };
  }, [inputs]);

  const getApplicationInstructions = () => {
    const { productType, applicationMethod } = inputs;
    const instructions = [];

    if (productType === 'solid') {
      if (applicationMethod === 'broadcast') {
        instructions.push("Mix the powder/granules with dry sand for even distribution");
        instructions.push("Broadcast evenly across the pond surface during calm weather");
        instructions.push("Apply in the morning or evening to avoid high temperatures");
      } else if (applicationMethod === 'mixed_feed') {
        instructions.push("Mix thoroughly with feed before feeding");
        instructions.push("Ensure even distribution throughout the feed");
        instructions.push("Use within 4 hours of mixing to maintain effectiveness");
      } else {
        instructions.push("Dissolve in water before application");
        instructions.push("Apply along pond edges and let water circulation distribute");
      }
    } else {
      instructions.push("Dilute liquid product in clean water before application");
      instructions.push("Apply using sprayer or watering can for even distribution");
      instructions.push("Avoid application during bright sunlight");
      instructions.push("Ensure proper aeration during and after application");
    }

    return instructions;
  };

  const getSafetyRecommendations = () => {
    return [
      "Always read and follow manufacturer's instructions",
      "Wear protective equipment (gloves, mask, goggles)",
      "Do not exceed recommended dosage rates",
      "Monitor water quality parameters after application",
      "Keep products away from children and animals",
      "Store in cool, dry place away from direct sunlight"
    ];
  };

  const getCommonProducts = () => {
    return {
      solid: [
        { name: "Lime (CaO)", dosage: "50-100 kg/ha", purpose: "pH adjustment, disinfection" },
        { name: "Gypsum (CaSO4)", dosage: "25-50 kg/ha", purpose: "Water hardness, soil conditioning" },
        { name: "Zeolite", dosage: "10-20 kg/ha", purpose: "Ammonia absorption, water clarity" },
        { name: "Probiotics", dosage: "1-2 kg/ha", purpose: "Water quality, disease prevention" },
      ],
      liquid: [
        { name: "Liquid Lime", dosage: "2-5 L/ha", purpose: "pH adjustment, easy application" },
        { name: "Mineral Supplement", dosage: "1-3 L/ha", purpose: "Water mineral balance" },
        { name: "Organic Acid", dosage: "0.5-1 L/ha", purpose: "pH reduction, disease control" },
        { name: "Liquid Probiotic", dosage: "1-2 L/ha", purpose: "Biological water treatment" },
      ]
    };
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-primary" />
            Product Amount Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inputs" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="inputs">Product Details</TabsTrigger>
              <TabsTrigger value="results">Amount Needed</TabsTrigger>
              <TabsTrigger value="instructions">Application</TabsTrigger>
              <TabsTrigger value="products">Common Products</TabsTrigger>
            </TabsList>
            
            <TabsContent value="inputs" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pond Specifications</CardTitle>
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
                      <Label htmlFor="waterDepth">Average Water Depth (m)</Label>
                      <Input
                        id="waterDepth"
                        type="number"
                        step="0.1"
                        value={inputs.waterDepth}
                        onChange={(e) => updateInput('waterDepth', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Product Type</Label>
                      <Select value={inputs.productType} onValueChange={(value: 'solid' | 'liquid') => updateInput('productType', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Solid (Powder/Granules)</SelectItem>
                          <SelectItem value="liquid">Liquid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Application Method</Label>
                      <Select value={inputs.applicationMethod} onValueChange={(value: 'broadcast' | 'spot' | 'mixed_feed') => updateInput('applicationMethod', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="broadcast">Broadcast Application</SelectItem>
                          <SelectItem value="spot">Spot Treatment</SelectItem>
                          <SelectItem value="mixed_feed">Mixed with Feed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Product Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dosageRate">
                        Dosage Rate ({inputs.productType === 'solid' ? 'kg/ha or ppm' : 'L/ha or ppm'})
                      </Label>
                      <Input
                        id="dosageRate"
                        type="number"
                        step="0.1"
                        value={inputs.dosageRate}
                        onChange={(e) => updateInput('dosageRate', Number(e.target.value))}
                      />
                    </div>
                    {inputs.productType === 'liquid' && (
                      <div className="space-y-2">
                        <Label htmlFor="concentration">Active Ingredient Concentration (%)</Label>
                        <Input
                          id="concentration"
                          type="number"
                          step="0.1"
                          value={inputs.concentration}
                          onChange={(e) => updateInput('concentration', Number(e.target.value))}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Target Parameter</Label>
                      <Select value={inputs.targetParameter} onValueChange={(value) => updateInput('targetParameter', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pH">pH Level</SelectItem>
                          <SelectItem value="alkalinity">Alkalinity</SelectItem>
                          <SelectItem value="hardness">Water Hardness</SelectItem>
                          <SelectItem value="ammonia">Ammonia Control</SelectItem>
                          <SelectItem value="disease">Disease Prevention</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {inputs.targetParameter !== 'other' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="currentValue">Current Value</Label>
                          <Input
                            id="currentValue"
                            type="number"
                            step="0.1"
                            value={inputs.currentValue}
                            onChange={(e) => updateInput('currentValue', Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="targetValue">Target Value</Label>
                          <Input
                            id="targetValue"
                            type="number"
                            step="0.1"
                            value={inputs.targetValue}
                            onChange={(e) => updateInput('targetValue', Number(e.target.value))}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pond Volume</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Water Volume:</span>
                      <Badge variant="secondary">{calculations.waterVolume} m³</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Volume in Liters:</span>
                      <Badge variant="secondary">{calculations.waterVolumeLiters.toLocaleString()} L</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Product Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Base Amount:</span>
                      <Badge variant="outline">{calculations.baseAmount} {calculations.unit}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <span className="font-medium text-primary">Adjusted Amount:</span>
                      <Badge variant="default">{calculations.adjustedAmount} {calculations.unit}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Adjustment Factor:</span>
                      <Badge variant="secondary">{calculations.adjustmentFactor}x</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Usage Estimates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Weekly Amount:</span>
                      <Badge variant="secondary">{calculations.weeklyAmount} {calculations.unit}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Monthly Amount:</span>
                      <Badge variant="secondary">{calculations.monthlyAmount} {calculations.unit}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cost Estimate</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Application Cost:</span>
                      <Badge variant="secondary">₹{calculations.applicationCost}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      *Estimated cost based on average market prices
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="instructions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Application Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getApplicationInstructions().map((instruction, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-sm">{instruction}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    Safety Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getSafetyRecommendations().map((recommendation, index) => (
                      <Alert key={index} variant="default">
                        <Info className="h-4 w-4" />
                        <AlertDescription>{recommendation}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Solid Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getCommonProducts().solid.map((product, index) => (
                        <div key={index} className="p-3 bg-secondary/50 rounded-lg">
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">Dosage: {product.dosage}</p>
                          <p className="text-sm text-muted-foreground">Purpose: {product.purpose}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Liquid Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getCommonProducts().liquid.map((product, index) => (
                        <div key={index} className="p-3 bg-secondary/50 rounded-lg">
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">Dosage: {product.dosage}</p>
                          <p className="text-sm text-muted-foreground">Purpose: {product.purpose}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductAmountCalculator;