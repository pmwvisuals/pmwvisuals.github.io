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
    description: "For everyday wallpaper downloads and moderate image-tool use.",
    featured: false,
    features: [
      "Full-resolution wallpaper downloads",
      "Premium wallpaper collection access",
      "50 image compressions per day",
      "20 image resizes per day",
      "Unlimited image, video and audio conversions",
      "Batch image compression",
      "Batch image resizing",
      "Large image processing above free limits",
      "Image and audio metadata removal",
      "Private on-device file processing"
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
    description: "For regular creators who need unlimited resizing and higher compression limits.",
    featured: true,
    features: [
      "Full-resolution wallpaper downloads",
      "Premium wallpaper collection access",
      "100 image compressions per day",
      "Unlimited image resizing",
      "Unlimited image, video and audio conversions",
      "Batch image compression",
      "Batch image resizing",
      "Large image processing above free limits",
      "Image and audio metadata removal",
      "Private on-device file processing"
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
    description: "For heavy workflows that need unlimited access across PMW's media and image tools.",
    featured: false,
    features: [
      "Full-resolution wallpaper downloads",
      "Premium wallpaper collection access",
      "Unlimited image compression",
      "Unlimited image resizing",
      "Unlimited image, video and audio conversions",
      "Batch image compression",
      "Batch image resizing",
      "Large image processing above free limits",
      "Image and audio metadata removal",
      "Private on-device file processing"
    ],
    priceId: PADDLE_CONFIG.prices.Elite,
    yearlyValue: {
      monthlyTotal: "$119.88",
      yearlyTotal: "$119.88",
      savePercent: 0
    }
  }
];
