import axios from 'axios';

const getApiKey = () => process.env.GOOGLE_MAPS_API_KEY;

export const GoogleMapsService = {
  /**
   * Search for places near a location
   * @param lat Latitude
   * @param lng Longitude
   * @param radius Radius in meters (max 50000)
   * @param type Type of place (e.g. 'restaurant', 'cafe', 'store')
   */
  nearbySearch: async (lat: number, lng: number, radius: number, type: string) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured in .env');
    }

    try {
      // Maps API types are specific, mapping common names to Google types
      const mapping: Record<string, { type: string, keyword: string }> = {
        'Restoran': { type: 'restaurant', keyword: 'restaurant food' },
        'Coffee Shop & Cafe': { type: 'cafe', keyword: 'coffee cafe coffee_shop' },
        'Retail & Toko': { type: 'store', keyword: 'toko retail shop' },
        'Apotek & Klinik': { type: 'pharmacy', keyword: 'apotek klinik' },
        'Bengkel & Otomotif': { type: 'car_repair', keyword: 'bengkel otomotif' },
        'Hotel & Penginapan': { type: 'lodging', keyword: 'hotel penginapan' },
        'Barber & Salon': { type: 'beauty_salon', keyword: 'barber salon' }
      };

      const searchConfig = mapping[type] || { type: 'establishment', keyword: type };
      console.log(`🔍 [MAPS] Searching for Type: ${searchConfig.type}, Keyword: ${searchConfig.keyword}`);

      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
        {
          params: {
            location: `${lat},${lng}`,
            radius: radius,
            type: searchConfig.type,
            keyword: searchConfig.keyword,
            key: apiKey
          }
        }
      );

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Maps API Error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
      }

      // Map and filter Google results to our format
      const results = response.data.results.map((place: any) => ({
        name: place.name,
        address: place.vicinity,
        placeId: place.place_id,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        rating: place.rating || 0,
        userRatingsTotal: place.user_ratings_total || 0,
        types: place.types || [],
        aiScore: Math.min(100, Math.round(((place.rating || 3.5) / 5) * 80 + Math.min(20, (place.user_ratings_total || 0) / 10)))
      }));

      // STRICT FILTERING
      const filtered = results.filter((p: any) => {
        let keep = true;
        if (searchConfig.type === 'restaurant') {
           keep = p.types.includes('restaurant') || p.types.includes('food') || p.types.includes('cafe');
        } else if (searchConfig.type === 'cafe') {
           keep = p.types.includes('cafe') || p.types.includes('bakery') || p.name.toLowerCase().includes('coffee') || p.name.toLowerCase().includes('kopi');
        } else if (searchConfig.type === 'pharmacy') {
           keep = p.types.includes('pharmacy') || p.types.includes('health') || p.types.includes('drugstore');
        }
        
        if (!keep) console.log(`🚫 [MAPS] Filtering out: ${p.name} (Types: ${p.types.join(', ')})`);
        return keep;
      });

      console.log(`✅ [MAPS] Final results count: ${filtered.length}`);
      return filtered;
    } catch (error: any) {
      console.error('Google Maps Service Error:', error.message);
      throw error;
    }
  },

  /**
   * Get detailed info for a specific place (including phone and website)
   */
  getPlaceDetails: async (placeId: string) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not configured');

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json`,
        {
          params: {
            place_id: placeId,
            fields: 'name,formatted_phone_number,international_phone_number,website,url',
            key: apiKey
          }
        }
      );

      return response.data.result;
    } catch (error: any) {
      console.error('Google Place Details Error:', error.message);
      throw error;
    }
  }
};
