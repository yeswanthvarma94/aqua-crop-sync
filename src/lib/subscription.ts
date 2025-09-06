import { supabase } from "@/integrations/supabase/client";

export type Plan = "Free" | "Pro" | "Enterprise";

const PLAN_KEY = "aqualedger.plan";

export const loadPlan = (): Plan => {
  const raw = localStorage.getItem(PLAN_KEY);
  if (raw === "Pro" || raw === "Enterprise" || raw === "Free") return raw;
  return "Free";
};

export const savePlan = (p: Plan) => localStorage.setItem(PLAN_KEY, p);

// Initialize new users with Free plan
export const initializeFreePlan = () => {
  if (!localStorage.getItem(PLAN_KEY)) {
    savePlan("Free");
  }
};

export const getPlanLimits = (plan: Plan) => {
  switch (plan) {
    case "Enterprise":
      return { locations: Infinity, tanksPerLocation: Infinity, team: true };
    case "Pro":
      return { locations: 3, tanksPerLocation: 4, team: false };
    case "Free":
    default:
      return { locations: 1, tanksPerLocation: 2, team: false };
  }
};

export const checkLocationLimit = async (accountId: string, plan: Plan): Promise<{ canCreate: boolean; message?: string }> => {
  const limits = getPlanLimits(plan);
  
  if (limits.locations === Infinity) {
    return { canCreate: true };
  }

  const { data: farms, error } = await supabase
    .from("farms")
    .select("id")
    .eq("account_id", accountId);

  if (error) {
    return { canCreate: false, message: "Error checking location limit" };
  }

  const currentCount = farms?.length || 0;
  
  if (currentCount >= limits.locations) {
    return { 
      canCreate: false, 
      message: `You've reached your limit of ${limits.locations} farm${limits.locations > 1 ? 's' : ''}. Upgrade to ${plan === 'Free' ? 'Pro' : 'Enterprise'} plan to add more.`
    };
  }

  return { canCreate: true };
};

export const checkTankLimit = async (accountId: string, farmId: string, plan: Plan): Promise<{ canCreate: boolean; message?: string }> => {
  const limits = getPlanLimits(plan);
  
  if (limits.tanksPerLocation === Infinity) {
    return { canCreate: true };
  }

  const { data: tanks, error } = await supabase
    .from("tanks")
    .select("id")
    .eq("account_id", accountId)
    .eq("farm_id", farmId);

  if (error) {
    return { canCreate: false, message: "Error checking tank limit" };
  }

  const currentCount = tanks?.length || 0;
  
  if (currentCount >= limits.tanksPerLocation) {
    return { 
      canCreate: false, 
      message: `You've reached your limit of ${limits.tanksPerLocation} tank${limits.tanksPerLocation > 1 ? 's' : ''} per farm. Upgrade to ${plan === 'Free' ? 'Pro' : 'Enterprise'} plan to add more.`
    };
  }

  return { canCreate: true };
};