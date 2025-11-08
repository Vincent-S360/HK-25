const axios = require('axios');
const cheerio = require('cheerio');

// Common Karnataka crops with their average market prices (in Rs per quintal)
const KARNATAKA_CROP_PRICES = {
  'rice': { min: 2800, max: 3200, avg: 3000 },
  'paddy': { min: 2600, max: 3000, avg: 2800 },
  'wheat': { min: 2200, max: 2600, avg: 2400 },
  'ragi': { min: 3200, max: 3600, avg: 3400 },
  'jowar': { min: 2800, max: 3200, avg: 3000 },
  'bajra': { min: 2400, max: 2800, avg: 2600 },
  'maize': { min: 1800, max: 2200, avg: 2000 },
  'groundnut': { min: 5500, max: 6500, avg: 6000 },
  'sunflower': { min: 5500, max: 6500, avg: 6000 },
  'cotton': { min: 5500, max: 7000, avg: 6250 },
  'tur': { min: 7000, max: 8000, avg: 7500 },
  'urad': { min: 6000, max: 7000, avg: 6500 },
  'moong': { min: 7000, max: 8000, avg: 7500 },
  'sugarcane': { min: 300, max: 350, avg: 325 }, // per quintal
  'onion': { min: 1500, max: 2500, avg: 2000 },
  'tomato': { min: 1500, max: 2500, avg: 2000 },
  'potato': { min: 1200, max: 1800, avg: 1500 },
  'chili': { min: 12000, max: 15000, avg: 13500 },
  'turmeric': { min: 8000, max: 10000, avg: 9000 },
  'arecanut': { min: 50000, max: 70000, avg: 60000 },
  'ginger': { min: 8000, max: 12000, avg: 10000 },
  'coffee': { min: 15000, max: 20000, avg: 17500 },
  'coconut': { min: 2500, max: 3500, avg: 3000 },
  'banana': { min: 1000, max: 1500, avg: 1250 },
  'mango': { min: 4000, max: 6000, avg: 5000 },
  'grapes': { min: 3000, max: 5000, avg: 4000 },
  'cashewnut': { min: 80000, max: 100000, avg: 90000 },
  'cardamom': { min: 100000, max: 150000, avg: 125000 },
  'pepper': { min: 40000, max: 50000, avg: 45000 }
};

// Major markets in Karnataka
const KARNATAKA_MARKETS = [
  'Bangalore', 'Mysore', 'Hubli', 'Dharwad', 'Belgaum', 'Gulbarga', 
  'Raichur', 'Bellary', 'Shimoga', 'Davangere', 'Tumkur', 'Hassan',
  'Mandya', 'Chitradurga', 'Bidar', 'Bagalkot', 'Bijapur', 'Kolar',
  'Chikkamagaluru', 'Udupi', 'Dakshina Kannada', 'Kodagu', 'Chamarajanagar',
  'Gadag', 'Haveri', 'Koppal', 'Yadgir'
];

async function getMarketPrices(cropName) {
  try {
    const prices = [];
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });

    // Try to fetch real-time data from Agmarknet API
    try {
      const response = await axios.get('https://data.gov.in/api/1/datastore/query', {
        params: {
          'resource_id': '9ef84268-d588-465a-a308-a864a43d0070',
          'api-key': '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b',
          'filters[state]': 'Karnataka',
          'filters[commodity]': cropName,
          'sort[arrival_date]': 'desc',
          'limit': 100
        },
        timeout: 10000
      });

      if (response.data && response.data.records) {
        response.data.records.forEach(record => {
          prices.push({
            place: record.district,
            price: record.modal_price,
            variety: record.variety,
            date: record.arrival_date
          });
        });
      }
    } catch (error) {
      console.log(`Agmarknet API fetch failed: ${error.message}`);
    }

    // If no real-time data found, use fallback prices with market variations
    if (prices.length === 0) {
      const cropData = KARNATAKA_CROP_PRICES[cropName.toLowerCase()];
      if (cropData) {
        // Generate realistic price variations across different markets
        KARNATAKA_MARKETS.forEach((market, index) => {
          // Add some variation based on market location
          const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
          const basePrice = cropData.avg;
          const marketPrice = Math.round(basePrice * (1 + variation));
          
          prices.push({
            place: market,
            price: marketPrice.toString(),
            variety: 'Common',
            date: dateStr,
            source: 'estimated'
          });
        });
      }
    }

    // Remove duplicates and sort by price
    const priceMap = new Map();
    prices.forEach(p => {
      const key = `${p.place}-${p.price}`;
      if (!priceMap.has(key)) {
        priceMap.set(key, p);
      }
    });

    const uniquePrices = Array.from(priceMap.values())
      .sort((a, b) => parseInt(b.price) - parseInt(a.price))
      .slice(0, 10); // Return top 10 prices

    return {
      success: true,
      crop: cropName,
      prices: uniquePrices,
      date: dateStr,
      source: uniquePrices.length > 0 ? (uniquePrices[0].source === 'estimated' ? 'estimated' : 'live') : 'none'
    };
  } catch (err) {
    console.error("Error fetching market prices:", err);
    
    // Ultimate fallback: return estimated prices for common crops
    const cropData = KARNATAKA_CROP_PRICES[cropName.toLowerCase()];
    if (cropData) {
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });

      const fallbackPrices = [
        {
          place: 'Bangalore',
          price: cropData.avg.toString(),
          variety: 'Common',
          date: dateStr,
          source: 'estimated'
        }
      ];

      return {
        success: true,
        crop: cropName,
        prices: fallbackPrices,
        date: dateStr,
        source: 'estimated'
      };
    }

    return { 
      success: false, 
      message: "Unable to fetch market data for this crop.",
      crop: cropName 
    };
  }
}

module.exports = { getMarketPrices };