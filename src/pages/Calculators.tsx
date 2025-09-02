import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Fish } from "lucide-react";
import { useTranslation } from "react-i18next";
import ShrimpAquacultureCalculator from "@/components/ShrimpAquacultureCalculator";

const Calculators = () => {
  const { t } = useTranslation();
  const [activeCalculator, setActiveCalculator] = React.useState<string | null>(null);

  const calculators = [
    {
      id: 'shrimp-feed',
      title: 'Shrimp Feed Calculator',
      description: 'Calculate precise daily feed and get actionable recommendations',
      icon: Fish,
      component: ShrimpAquacultureCalculator
    }
  ];

  if (activeCalculator) {
    const calculator = calculators.find(c => c.id === activeCalculator);
    if (calculator) {
      const CalculatorComponent = calculator.component;
      return (
        <div className="container mx-auto p-4 pb-20 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => setActiveCalculator(null)}
              className="flex items-center gap-2"
            >
              ← Back to Calculators
            </Button>
            <h1 className="text-2xl font-bold">{calculator.title}</h1>
          </div>
          <CalculatorComponent />
        </div>
      );
    }
  }

  return (
    <div className="container mx-auto p-4 pb-20 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">{t("quickActions.calculators")}</h1>
      </div>

      <div className="grid gap-6">
        {calculators.map((calculator) => {
          const IconComponent = calculator.icon;
          return (
            <Card key={calculator.id} className="glass-card shadow-card cursor-pointer interactive-hover" onClick={() => setActiveCalculator(calculator.id)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <IconComponent className="h-6 w-6 text-primary" />
                  {calculator.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{calculator.description}</p>
                <Button className="w-full">
                  Open Calculator
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Calculators;