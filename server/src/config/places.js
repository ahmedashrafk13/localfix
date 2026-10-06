// Launch region (proposal: "launch in one city, then expand"): the Islamabad and Rawalpindi twin cities.
// Coordinates are approximate area centres, used to pre-place the map pin when posting a request.
export const CITIES = [
  {
    name: 'Islamabad',
    center: { lat: 33.6938, lng: 73.0652 },
    areas: [
      { name: 'Blue Area', lat: 33.7104, lng: 73.0603 },
      { name: 'Bani Gala', lat: 33.716, lng: 73.153 },
      { name: 'DHA Phase 2', lat: 33.531, lng: 73.155 },
      { name: 'E-11', lat: 33.699, lng: 72.974 },
      { name: 'F-6', lat: 33.7294, lng: 73.0758 },
      { name: 'F-7', lat: 33.7213, lng: 73.0567 },
      { name: 'F-8', lat: 33.7105, lng: 73.0372 },
      { name: 'F-10', lat: 33.6955, lng: 73.013 },
      { name: 'F-11', lat: 33.6844, lng: 72.9878 },
      { name: 'G-9', lat: 33.688, lng: 73.027 },
      { name: 'G-10', lat: 33.6779, lng: 73.0136 },
      { name: 'G-11', lat: 33.6688, lng: 72.9969 },
      { name: 'G-13', lat: 33.651, lng: 72.966 },
      { name: 'Gulberg Greens', lat: 33.602, lng: 73.165 },
      { name: 'I-8', lat: 33.6693, lng: 73.0748 },
      { name: 'I-10', lat: 33.6475, lng: 73.042 },
      { name: 'PWD Housing', lat: 33.572, lng: 73.145 },
    ],
  },
  {
    name: 'Rawalpindi',
    center: { lat: 33.5973, lng: 73.0479 },
    areas: [
      { name: 'Adiala Road', lat: 33.56, lng: 73.03 },
      { name: 'Bahria Town Phase 7', lat: 33.531, lng: 73.095 },
      { name: 'Chaklala Scheme III', lat: 33.583, lng: 73.092 },
      { name: 'Gulraiz', lat: 33.623, lng: 73.111 },
      { name: 'Peshawar Road', lat: 33.615, lng: 73.015 },
      { name: 'Saddar', lat: 33.5973, lng: 73.0479 },
      { name: 'Satellite Town', lat: 33.638, lng: 73.068 },
      { name: 'Westridge', lat: 33.605, lng: 73.024 },
    ],
  },
];

export const CITY_NAMES = CITIES.map((c) => c.name);

export function findArea(city, area) {
  const c = CITIES.find((x) => x.name === city);
  return c?.areas.find((a) => a.name === area) || null;
}
