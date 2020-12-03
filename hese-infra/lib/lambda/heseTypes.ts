export interface Restaurant {
  id: number;
  uuid: string;
  name: string;
  info: string;
  phoneNumber: string;
  email: string;
  openOnEventsOnly: boolean;
  timeZone: string;
  stripeAccountCountryCode: string;
  address: {
    streetAddress: string;
    city: string;
    longitude: number;
    countryCode: string;
  };
  serviceTypes: number[];
  openingHours: {
    openingDay: number;
    openingTime: string;
    closingDay: number;
    closingTime: string;
  }[];
  openingHoursExceptions:
  {
    openInInterval: boolean;
    starts: string;
    ends: string;
  }[];
  openingHoursPeriods:
  {
    opens: string;
    closes: string;
  }[];
}
export interface RestaurantInfo {
  id: number;
  name: string;
  address: {
    streetAddress: string;
    city: string;
    longitude: number;
    countryCode: string;
  };
}
export interface UnavailableItem {
  temporarilyOutOfStock: boolean;
  ageRestricted: boolean;
  notInSelection: boolean;
}
export interface Unavailability {
  [key: string]: UnavailableItem;
}
export interface UnavailabileProducts {
  products: Unavailability;
}

export interface Product {
  productId: string;
  productNumber: string;
  name: string;
  isOrderable: boolean;
  hasInfoApi: boolean;
  availabilityRequired: boolean;
  alcoholProduct: boolean;
  hideOutsideSaletime: boolean;
}
