import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Fish, TrendingUp, Beaker, Droplets } from "lucide-react";
import { useTranslation } from "react-i18next";
import ShrimpAquacultureCalculator from "@/components/ShrimpAquacultureCalculator";
import CultivationPerformanceCalculator from "@/components/CultivationPerformanceCalculator";
import DailyFeedCalculator from "@/components/DailyFeedCalculator";
import ProductAmountCalculator from "@/components/ProductAmountCalculator";
import AmmoniaCalculator from "@/components/AmmoniaCalculator";

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
    },
    {
      id: 'cultivation-performance',
      title: 'Cultivation Performance',
      description: 'Analyze FCR, growth rate, survival rate, and productivity metrics',
      icon: TrendingUp,
      component: CultivationPerformanceCalculator
    },
    {
      id: 'daily-feed',
      title: 'Daily Feed Calculator',
      description: 'Calculate daily feed requirements with environmental adjustments',
      icon: Fish,
      component: DailyFeedCalculator
    },
    {
      id: 'product-amount',
      title: 'Product Amount Calculator',
      description: 'Calculate dosage for pond treatments and water conditioning',
      icon: Beaker,
      component: ProductAmountCalculator
    },
    {
      id: 'ammonia-calculator',
      title: 'Ammonia (NH₃) Calculator',
      description: 'Calculate toxic ammonia levels based on water parameters',
      icon: Droplets,
      component: AmmoniaCalculator
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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {calculators.map((calculator) => {
          const IconComponent = calculator.icon;
          return (
            <Card key={calculator.id} className="glass-card shadow-card cursor-pointer interactive-hover h-full" onClick={() => setActiveCalculator(calculator.id)}>
              <CardContent className="p-6 text-center h-full flex flex-col">
                <div className="flex flex-col items-center space-y-4 flex-grow">
                  <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IconComponent className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{calculator.title}</h3>
                    <p className="text-sm text-muted-foreground">{calculator.description}</p>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline">
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