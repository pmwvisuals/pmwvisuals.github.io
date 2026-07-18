export const PADDLE_CONFIG = {
  clientToken: "live_e1acf603a496c5dc11e7662eb81",
  environment: "production",
  successPath: "premium-success.html",
  prices: {
    Pro: {
      monthly: "pri_01kxsfyk134yk1y741d0vcm45c",
      yearly: "pri_01kxsfyktcfcqnckvgjchebghv"
    },
    Advance: {
      monthly: "pri_01kxsfymg1vph3sg7dw4amqcq6",
      yearly: "pri_01kxsfymt7297wfdk1a4s5vgsv"
    },
    Elite: {
      monthly: "pri_01kxsfynf6yx2790jnrheb3hp4",
      yearly: "pri_01kxsfynvy8602e8pyyx255wvc"
    }
  }
};

export const PRICING_TIERS = [
  {
    name: "Pro",
    description: "A simple paid plan for more downloads and everyday creative tools.",
    featured: false,
    features: [
      "HD wallpaper downloads",
      "More daily conversions",
      "Access to pro premium releases",
      "Personal use license",
      "Cancel anytime"
    ],
    priceId: PADDLE_CONFIG.prices.Pro,
    yearlyValue: {
      monthlyTotal: "$35.88",
      yearlyTotal: "$29.99",
      savePercent: 16
    }
  },
  {
    name: "Advance",
    description: "The best choice for regular PMW Visuals users and creators.",
    featured: true,
    features: [
      "High-resolution wallpaper downloads",
      "Premium wallpaper collections",
      "Unlimited converter access",
      "No ads on premium areas",
      "Monthly wallpaper requests"
    ],
    priceId: PADDLE_CONFIG.prices.Advance,
    yearlyValue: {
      monthlyTotal: "$71.88",
      yearlyTotal: "$59.99",
      savePercent: 17
    }
  },
  {
    name: "Elite",
    description: "Built for heavier creative use, client work, and commercial projects.",
    featured: false,
    features: [
      "Original quality downloads",
      "Commercial use license",
      "All premium wallpaper collections",
      "Video asset access",
      "Priority support"
    ],
    priceId: PADDLE_CONFIG.prices.Elite,
    yearlyValue: {
      monthlyTotal: "$119.88",
      yearlyTotal: "$119.88",
      savePercent: 0
    }
  }
];
