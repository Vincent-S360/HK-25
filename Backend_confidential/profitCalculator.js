// Smart Profit Calculator for SALAHE
// Calculates profit margin and ROI based on seeds, fertilizers, irrigation costs, and market rates

// Using native fetch (Node.js 18+) - if using older Node, install node-fetch or axios

// Crop database with default cost estimates (per acre)
const CROP_COST_DATABASE = {
  // Cereals
  'rice': { seedCost: 2000, fertilizerCost: 5000, irrigationCost: 4000, laborCost: 6000, otherCost: 3000, yieldPerAcre: 25, unit: 'quintal' },
  'paddy': { seedCost: 2000, fertilizerCost: 5000, irrigationCost: 4000, laborCost: 6000, otherCost: 3000, yieldPerAcre: 25, unit: 'quintal' },
  'wheat': { seedCost: 1800, fertilizerCost: 4500, irrigationCost: 3500, laborCost: 5000, otherCost: 2500, yieldPerAcre: 20, unit: 'quintal' },
  'maize': { seedCost: 1500, fertilizerCost: 4000, irrigationCost: 3000, laborCost: 4000, otherCost: 2000, yieldPerAcre: 18, unit: 'quintal' },
  'jowar': { seedCost: 1200, fertilizerCost: 3500, irrigationCost: 2500, laborCost: 3500, otherCost: 1800, yieldPerAcre: 15, unit: 'quintal' },
  'ragi': { seedCost: 1000, fertilizerCost: 3000, irrigationCost: 2000, laborCost: 3000, otherCost: 1500, yieldPerAcre: 12, unit: 'quintal' },
  
  // Pulses
  'dal': { seedCost: 2500, fertilizerCost: 3000, irrigationCost: 2000, laborCost: 3500, otherCost: 2000, yieldPerAcre: 8, unit: 'quintal' },
  'toor': { seedCost: 2500, fertilizerCost: 3000, irrigationCost: 2000, laborCost: 3500, otherCost: 2000, yieldPerAcre: 8, unit: 'quintal' },
  'chana': { seedCost: 2200, fertilizerCost: 2800, irrigationCost: 1800, laborCost: 3200, otherCost: 1800, yieldPerAcre: 10, unit: 'quintal' },
  'moong': { seedCost: 2000, fertilizerCost: 2500, irrigationCost: 1500, laborCost: 2800, otherCost: 1500, yieldPerAcre: 6, unit: 'quintal' },
  
  // Oilseeds
  'groundnut': { seedCost: 4000, fertilizerCost: 3500, irrigationCost: 3000, laborCost: 4500, otherCost: 2500, yieldPerAcre: 12, unit: 'quintal' },
  'sunflower': { seedCost: 3500, fertilizerCost: 4000, irrigationCost: 3500, laborCost: 4000, otherCost: 2000, yieldPerAcre: 10, unit: 'quintal' },
  'soybean': { seedCost: 3000, fertilizerCost: 3800, irrigationCost: 3200, laborCost: 3800, otherCost: 2200, yieldPerAcre: 15, unit: 'quintal' },
  
  // Vegetables
  'tomato': { seedCost: 5000, fertilizerCost: 8000, irrigationCost: 6000, laborCost: 12000, otherCost: 5000, yieldPerAcre: 200, unit: 'quintal' },
  'onion': { seedCost: 3000, fertilizerCost: 6000, irrigationCost: 5000, laborCost: 8000, otherCost: 4000, yieldPerAcre: 180, unit: 'quintal' },
  'potato': { seedCost: 12000, fertilizerCost: 7000, irrigationCost: 6000, laborCost: 10000, otherCost: 5000, yieldPerAcre: 150, unit: 'quintal' },
  'brinjal': { seedCost: 2500, fertilizerCost: 5000, irrigationCost: 4500, laborCost: 7000, otherCost: 3000, yieldPerAcre: 120, unit: 'quintal' },
  'chilli': { seedCost: 3000, fertilizerCost: 5500, irrigationCost: 5000, laborCost: 8500, otherCost: 3500, yieldPerAcre: 50, unit: 'quintal' },
  'cucumber': { seedCost: 2000, fertilizerCost: 4000, irrigationCost: 4500, laborCost: 6000, otherCost: 2500, yieldPerAcre: 140, unit: 'quintal' },
  
  // Commercial crops
  'sugarcane': { seedCost: 8000, fertilizerCost: 12000, irrigationCost: 15000, laborCost: 18000, otherCost: 7000, yieldPerAcre: 500, unit: 'quintal' },
  'cotton': { seedCost: 3000, fertilizerCost: 6000, irrigationCost: 5000, laborCost: 10000, otherCost: 4000, yieldPerAcre: 8, unit: 'quintal' },
  'coffee': { seedCost: 15000, fertilizerCost: 12000, irrigationCost: 8000, laborCost: 20000, otherCost: 10000, yieldPerAcre: 6, unit: 'quintal' },
  'tea': { seedCost: 12000, fertilizerCost: 10000, irrigationCost: 7000, laborCost: 18000, otherCost: 8000, yieldPerAcre: 4, unit: 'quintal' }
};

// Default market prices per quintal (can be overridden by real-time API)
const DEFAULT_MARKET_PRICES = {
  'rice': 2500, 'paddy': 2500, 'wheat': 2200, 'maize': 2000, 'jowar': 2800, 'ragi': 3000,
  'dal': 8000, 'toor': 8500, 'chana': 6500, 'moong': 9000,
  'groundnut': 6500, 'sunflower': 5500, 'soybean': 4800,
  'tomato': 2000, 'onion': 2500, 'potato': 1800, 'brinjal': 3000, 'chilli': 15000, 'cucumber': 2500,
  'sugarcane': 320, 'cotton': 7000, 'coffee': 45000, 'tea': 25000
};

/**
 * Fetch real-time market prices from API
 * Falls back to default prices if API fails
 */
async function fetchMarketPrice(cropName, location = 'Karnataka') {
  try {
    // TODO: Replace with actual market data API (e.g., eNAM, Agmarknet, or custom API)
    // For now, using mock structure that can be replaced
    
    // Example API structure (uncomment and configure with real API):
    /*
    const url = `https://api.marketprices.example.com/v1/prices?crop=${encodeURIComponent(cropName.toLowerCase())}&state=${encodeURIComponent(location)}&format=json`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    const data = await response.json();
    return data.currentPrice;
    */
    
    // For now, return default price with small random variation to simulate market fluctuations
    const basePrice = DEFAULT_MARKET_PRICES[cropName.toLowerCase()] || 3000;
    // Simulate ±5% market variation
    const variation = basePrice * 0.05 * (Math.random() > 0.5 ? 1 : -1);
    return Math.round(basePrice + variation);
  } catch (error) {
    console.warn(`Market API fetch failed for ${cropName}, using default price:`, error.message);
    return DEFAULT_MARKET_PRICES[cropName.toLowerCase()] || 3000;
  }
}

/**
 * Get crop cost data - uses database values or calculates from user input
 */
function getCropCosts(cropName, userInput = {}) {
  const cropLower = cropName.toLowerCase();
  const dbData = CROP_COST_DATABASE[cropLower];
  
  if (!dbData) {
    // Return estimated defaults if crop not in database
    return {
      seedCost: userInput.seedCost || 2500,
      fertilizerCost: userInput.fertilizerCost || 4000,
      irrigationCost: userInput.irrigationCost || 3000,
      laborCost: userInput.laborCost || 5000,
      otherCost: userInput.otherCost || 2000,
      yieldPerAcre: userInput.yieldPerAcre || 15,
      unit: userInput.unit || 'quintal'
    };
  }
  
  // Override with user-provided values if available
  return {
    seedCost: userInput.seedCost || dbData.seedCost,
    fertilizerCost: userInput.fertilizerCost || dbData.fertilizerCost,
    irrigationCost: userInput.irrigationCost || dbData.irrigationCost,
    laborCost: userInput.laborCost || dbData.laborCost,
    otherCost: userInput.otherCost || dbData.otherCost,
    yieldPerAcre: userInput.yieldPerAcre || dbData.yieldPerAcre,
    unit: dbData.unit
  };
}

/**
 * Calculate total investment cost per acre
 */
function calculateTotalCost(costs, areaInAcres = 1) {
  const totalCostPerAcre = costs.seedCost + costs.fertilizerCost + 
                          costs.irrigationCost + costs.laborCost + costs.otherCost;
  return totalCostPerAcre * areaInAcres;
}

/**
 * Calculate revenue based on yield and market price
 */
function calculateRevenue(yieldPerAcre, marketPrice, areaInAcres = 1) {
  const totalYield = yieldPerAcre * areaInAcres;
  return totalYield * marketPrice;
}

/**
 * Calculate profit margin and ROI
 */
function calculateProfitMetrics(totalCost, revenue) {
  const profit = revenue - totalCost;
  const profitMargin = totalCost > 0 ? ((profit / totalCost) * 100) : 0;
  const roi = totalCost > 0 ? ((profit / totalCost) * 100) : 0;
  
  return {
    profit: Math.round(profit),
    profitMargin: Math.round(profitMargin * 100) / 100,
    roi: Math.round(roi * 100) / 100
  };
}

/**
 * Main profit calculation function
 */
async function calculateProfit(params) {
  const {
    cropName,
    areaInAcres = 1,
    seedCost,
    fertilizerCost,
    irrigationCost,
    laborCost,
    otherCost,
    yieldPerAcre,
    marketPrice,
    location = 'Karnataka'
  } = params;
  
  if (!cropName) {
    throw new Error('Crop name is required');
  }
  
  // Get crop costs
  const costs = getCropCosts(cropName, {
    seedCost,
    fertilizerCost,
    irrigationCost,
    laborCost,
    otherCost,
    yieldPerAcre
  });
  
  // Fetch market price if not provided
  let finalMarketPrice = marketPrice;
  if (!finalMarketPrice) {
    finalMarketPrice = await fetchMarketPrice(cropName, location);
  }
  
  // Calculate metrics
  const totalCost = calculateTotalCost(costs, areaInAcres);
  const revenue = calculateRevenue(costs.yieldPerAcre, finalMarketPrice, areaInAcres);
  const metrics = calculateProfitMetrics(totalCost, revenue);
  
  // Calculate per-unit costs and returns
  const costPerUnit = totalCost / (costs.yieldPerAcre * areaInAcres);
  const returnPerUnit = finalMarketPrice;
  
  return {
    cropName: cropName,
    areaInAcres: areaInAcres,
    costs: {
      seedCost: costs.seedCost * areaInAcres,
      fertilizerCost: costs.fertilizerCost * areaInAcres,
      irrigationCost: costs.irrigationCost * areaInAcres,
      laborCost: costs.laborCost * areaInAcres,
      otherCost: costs.otherCost * areaInAcres,
      totalCost: totalCost
    },
    production: {
      yieldPerAcre: costs.yieldPerAcre,
      totalYield: costs.yieldPerAcre * areaInAcres,
      unit: costs.unit
    },
    market: {
      pricePerUnit: finalMarketPrice,
      totalRevenue: revenue
    },
    profit: {
      netProfit: metrics.profit,
      profitMargin: metrics.profitMargin,
      roi: metrics.roi,
      costPerUnit: Math.round(costPerUnit),
      returnPerUnit: returnPerUnit
    },
    recommendation: getRecommendation(metrics.roi, metrics.profitMargin)
  };
}

/**
 * Generate recommendation based on ROI and profit margin
 */
function getRecommendation(roi, profitMargin) {
  if (roi > 50 && profitMargin > 40) {
    return {
      level: 'excellent',
      message: 'This crop shows excellent profit potential. Highly recommended for planting.',
      riskLevel: 'low'
    };
  } else if (roi > 25 && profitMargin > 20) {
    return {
      level: 'good',
      message: 'This crop has good profit potential. Recommended for planting.',
      riskLevel: 'low-medium'
    };
  } else if (roi > 10 && profitMargin > 10) {
    return {
      level: 'moderate',
      message: 'This crop shows moderate profit potential. Consider planting with proper planning.',
      riskLevel: 'medium'
    };
  } else if (roi > 0 && profitMargin > 0) {
    return {
      level: 'low',
      message: 'This crop has low profit potential. Consider alternative crops or optimize costs.',
      riskLevel: 'medium-high'
    };
  } else {
    return {
      level: 'not_viable',
      message: 'This crop may result in losses at current costs and market prices. Not recommended.',
      riskLevel: 'high'
    };
  }
}

/**
 * Compare multiple crops for decision making
 */
async function compareCrops(cropsData, location = 'Karnataka') {
  const comparisons = await Promise.all(
    cropsData.map(cropData => calculateProfit({ ...cropData, location }))
  );
  
  // Sort by ROI (descending)
  comparisons.sort((a, b) => b.profit.roi - a.profit.roi);
  
  return {
    comparisons: comparisons,
    bestCrop: comparisons[0],
    summary: {
      totalCropsCompared: comparisons.length,
      averageROI: Math.round(
        comparisons.reduce((sum, c) => sum + c.profit.roi, 0) / comparisons.length
      ),
      highestROI: comparisons[0].profit.roi,
      lowestROI: comparisons[comparisons.length - 1].profit.roi
    }
  };
}

module.exports = {
  calculateProfit,
  compareCrops,
  fetchMarketPrice,
  getCropCosts,
  CROP_COST_DATABASE,
  DEFAULT_MARKET_PRICES
};

