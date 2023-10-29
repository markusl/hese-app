import { Product, UnavailabileProducts, RestaurantInfo } from './heseTypes';
import { allRestaurants } from './restaurants';

const countryCodeFinland = '246';

// Used to fetch the updated list of restaurants (currently hard-coded in restaurants.ts)
// const restaurantsApi = 'https://app.hesburger.fi/api/v2/restaurants?countryCode=246';
const productApi = 'https://app.hesburger.fi/api/v3/products?productId=';
const unavailabilitiesApi = 'https://app.hesburger.fi/api/v2/products/unavailabilities?restaurantId=';

// The Ice Cream item selected for checking the status
const iceCreamItem = '61bcb34c-cf04-1031-8dbb-005056890043';

// The Shake item selected for checking the status
const shakeItem = 'c3c11e4c-3bab-1038-bf85-005056890043';

// Minimum set of headers that the API works with
const headers = {
  'device-id': 'f2da6c10-13c1-449f-843e-913c64cec9ba',
  'user-agent': 'Hesburger/1.49.0 (191) (iOS; iOS iPhone 14.0.1; Scale/2.0; F4613)'
};

// Gets the unavailability status for a selected item
const getAvailability = async (restaurant: RestaurantInfo, productId: string) => {
  const url = unavailabilitiesApi + restaurant.id;
  try {
    const unavailabilities = await (await fetch(url, {
      headers,
    })).json() as UnavailabileProducts;
    const unavailabilityItem = Object.keys(unavailabilities.products).find((k) => k === productId);
    const isAvailable = unavailabilityItem ? !unavailabilities.products[productId].temporarilyOutOfStock : true;
    const isInSelection = unavailabilityItem ? !unavailabilities.products[productId].notInSelection : true;
    return {
      isClosed: false,
      isAvailable,
      isInSelection,
    };
  } catch(e) {
    console.error(`Error fetching availabilities for ${restaurant.id} ${restaurant.name}`);
    return {
      isClosed: true,
      isAvailable: false,
      isInSelection: false,
    };
  }
}

// Collects the availabilities for a given product across all given restaurants
const getAvailabilities = async (restaurants: RestaurantInfo[], productId: string) => {
  const url = productApi + productId;
  const products = await (await fetch(url, {
    headers
  })).json() as [Product];
  const product = products[0];
  return await Promise.all(restaurants.map(async (restaurant) => {
    const { isClosed, isAvailable, isInSelection } = await getAvailability(restaurant, productId);
    return {
      restaurantId: restaurant.id,
      isClosed,
      product: {
        isAvailable,
        isInSelection,
        ...product,
      }
    };
  }));
}

// Choose restaurants from a given country only
const filterRestaurantsByCountry = (countryCode: string): RestaurantInfo[] => {
  return allRestaurants
    .filter((restaurant) => restaurant.address.countryCode === countryCode)
    .map((restaurant) => ({
      name: restaurant.name,
      id: restaurant.id,
      address: { ...restaurant.address },
    }));
}

const getHeseIceCreamStatus = async (restaurants: RestaurantInfo[]) => {
  const cities = Array.from(new Set(restaurants.map((r) => r.address.city)));

  const iceCreamAvailabilities = await getAvailabilities(restaurants, iceCreamItem);
  const shakeAvailabilities = await getAvailabilities(restaurants, shakeItem);

  const cityStatuses = cities.map((city) => {
    const restaurantsInCity = restaurants.filter((r) => r.address.city === city);
    return restaurantsInCity.map((restaurant) => {
      const hasIceCream = iceCreamAvailabilities.filter((a) => a.restaurantId === restaurant.id);
      const hasShake = shakeAvailabilities.filter((a) => a.restaurantId === restaurant.id);

      return ({
        hasIceCream: hasIceCream[0],
        hasShake: hasShake[0],
        isClosed: hasIceCream[0].isClosed,
        ...restaurant,
      });
    })
  });

  const brokenIceCreamTotal = iceCreamAvailabilities.filter((a) => !a.product.isAvailable);
  const iceCreamInSelection = iceCreamAvailabilities.filter((a) => a.product.isInSelection);
  const iceCreamNotInSelection = iceCreamAvailabilities.filter((a) => !a.product.isInSelection);

  return {
    brokenIceCreamTotal: brokenIceCreamTotal.length,
    iceCreamInSelection: iceCreamInSelection.length,
    iceCreamNotInSelection: iceCreamNotInSelection.length,
    cityStatuses,
    updated: new Date().toLocaleString('fi-FI', { timeZone: 'Europe/Helsinki' }),
  };
};

export const getHeseIceCreamStatusFinland = () =>
  getHeseIceCreamStatus(filterRestaurantsByCountry(countryCodeFinland));
