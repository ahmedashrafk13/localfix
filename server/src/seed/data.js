// Sample content for the LocalFix demo. All people, phone numbers and emails are fictional.
// Emails use the reserved ".test" domain so nothing can ever be delivered to a real inbox.

export const DEMO_PASSWORD = 'Demo@1234';
export const ADMIN_PASSWORD = 'Admin@1234';

export const CATEGORIES = [
  { slug: 'plumbing', name: 'Plumbing', icon: 'Drop', description: 'Leaks, taps, drains, geysers, water tanks and motor fitting.' },
  { slug: 'electrical', name: 'Electrical', icon: 'Lightning', description: 'Wiring, sockets, DB boards, breakers, lights and fans.' },
  { slug: 'ac-repair', name: 'AC Repair & Service', icon: 'Snowflake', description: 'Split and inverter AC service, gas refill, installation and shifting.' },
  { slug: 'car-mechanic', name: 'Car Mechanic', icon: 'Car', description: 'Diagnostics, batteries, brakes, tune-ups and car AC, at your doorstep.' },
  { slug: 'home-cleaning', name: 'Home Cleaning', icon: 'Broom', description: 'Deep cleaning, sofa and carpet shampoo, kitchens and move-in cleans.' },
  { slug: 'carpentry', name: 'Carpentry', icon: 'Hammer', description: 'Doors, locks, cabinets, furniture repair and assembly.' },
  { slug: 'painting', name: 'Painting', icon: 'PaintRoller', description: 'Interior and exterior painting, damp treatment and weather coat.' },
  { slug: 'appliance-repair', name: 'Appliance Repair', icon: 'WashingMachine', description: 'Washing machines, fridges, microwaves, ovens and water dispensers.' },
  { slug: 'pest-control', name: 'Pest Control', icon: 'Bug', description: 'Termites, cockroaches, bed bugs and mosquito spray.' },
  { slug: 'solar-ups', name: 'Solar & UPS', icon: 'SolarPanel', description: 'Solar installation, inverters, UPS batteries and panel cleaning.' },
];

export const ADMIN = {
  key: 'admin',
  name: 'Ahmed Ashraf',
  email: 'admin@localfix.test',
  phone: '0300 0000 100',
  city: 'Islamabad',
  area: 'F-8',
  avatar: 'admin',
};

export const CUSTOMERS = [
  { key: 'c01', name: 'Ayesha Siddiqui', email: 'ayesha@localfix.test', phone: '0300 0000 201', city: 'Islamabad', area: 'F-10', monthsAgo: 5 },
  { key: 'c02', name: 'Bilal Ahmed', email: 'bilal@localfix.test', phone: '0300 0000 202', city: 'Islamabad', area: 'G-11', monthsAgo: 4 },
  { key: 'c03', name: 'Hira Naveed', email: 'hira@localfix.test', phone: '0300 0000 203', city: 'Rawalpindi', area: 'Bahria Town Phase 7', monthsAgo: 3 },
  { key: 'c04', name: 'Usman Tariq', email: 'usman@localfix.test', phone: '0300 0000 204', city: 'Islamabad', area: 'DHA Phase 2', monthsAgo: 4 },
  { key: 'c05', name: 'Mehwish Raza', email: 'mehwish@localfix.test', phone: '0300 0000 205', city: 'Rawalpindi', area: 'Satellite Town', monthsAgo: 2 },
  { key: 'c06', name: 'Faisal Qureshi', email: 'faisal@localfix.test', phone: '0300 0000 206', city: 'Islamabad', area: 'E-11', monthsAgo: 1 },
  { key: 'c07', name: 'Nida Farooq', email: 'nida@localfix.test', phone: '0300 0000 207', city: 'Islamabad', area: 'I-8', monthsAgo: 0.4 },
  { key: 'c08', name: 'Kamran Aziz', email: 'kamran@localfix.test', phone: '0300 0000 208', city: 'Rawalpindi', area: 'Chaklala Scheme III', monthsAgo: 0.2 },
  // A spam account used to demonstrate moderation (it has an open report against it).
  { key: 'c09', name: 'Quick Earning Services', email: 'quickearn@localfix.test', phone: '0300 0000 209', city: 'Islamabad', area: 'Blue Area', monthsAgo: 0.1, noAvatar: true },
];

const week = (from = '09:00', to = '19:00', friday = '13:00', sunday = false) =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, enabled: day === 0 ? sunday : true, from, to: day === 5 ? friday : to }));

export const PROVIDERS = [
  {
    key: 'p01',
    name: 'Tariq Mehmood',
    email: 'tariq@localfix.test',
    phone: '0300 0000 301',
    city: 'Islamabad',
    area: 'G-9',
    categories: ['plumbing'],
    headline: 'Plumber for leaks, bathroom fittings and geysers',
    bio: 'I have been fixing leaks, blocked drains and bathroom fittings across Islamabad for 14 years. I carry common spare parts in my van, so most jobs are finished in one visit. I explain the problem and the price before I start, and I clean up after the job.',
    experienceYears: 14,
    serviceAreas: ['G-9', 'G-10', 'G-11', 'F-10', 'F-11', 'I-8', 'I-10'],
    certifications: [{ title: 'Plumbing Technician (Level 3)', issuer: 'NAVTTC', year: 2012 }],
    startingPrice: 800,
    status: 'verified',
    monthsAgo: 11,
    weekly: week('08:00', '20:00', '13:00', true),
  },
  {
    key: 'p02',
    name: 'Shahid Iqbal',
    email: 'shahid@localfix.test',
    phone: '0300 0000 302',
    city: 'Islamabad',
    area: 'I-10',
    categories: ['electrical'],
    headline: 'Electrician for wiring, DB boards and fault finding',
    bio: 'Certified electrician with 11 years of residential and shop wiring experience. I find the cause of tripping breakers and burning smells with proper testing tools instead of guesswork. All replaced parts are branded and I give a written warranty on workmanship.',
    experienceYears: 11,
    serviceAreas: ['I-8', 'I-10', 'G-9', 'G-10', 'F-10', 'PWD Housing'],
    certifications: [
      { title: 'Electrical Technician Certificate', issuer: 'NAVTTC', year: 2015 },
      { title: 'Wireman Licence', issuer: 'IESCO', year: 2016 },
    ],
    startingPrice: 700,
    status: 'verified',
    monthsAgo: 10,
    weekly: week(),
  },
  {
    key: 'p03',
    name: 'Asad Ullah',
    email: 'asad@localfix.test',
    phone: '0300 0000 303',
    city: 'Islamabad',
    area: 'F-11',
    categories: ['ac-repair', 'appliance-repair'],
    headline: 'Split and inverter AC service, gas refill and installation',
    bio: 'AC technician trained on Gree, Haier, Dawlance and Orient inverter units. I do master service, gas charging with leak testing, PCB diagnosis and installation with proper vacuuming. Summer bookings fill fast, so book your pre-season service early.',
    experienceYears: 9,
    serviceAreas: ['F-10', 'F-11', 'E-11', 'G-11', 'G-13', 'F-8'],
    certifications: [{ title: 'HVAC & Refrigeration Diploma', issuer: 'Govt. Technical Training Institute, Rawalpindi', year: 2016 }],
    startingPrice: 1500,
    status: 'verified',
    monthsAgo: 9,
    weekly: week('09:00', '21:00', '14:00', true),
  },
  {
    key: 'p04',
    name: 'Naveed Akhtar',
    email: 'naveed@localfix.test',
    phone: '0300 0000 304',
    city: 'Rawalpindi',
    area: 'Peshawar Road',
    categories: ['car-mechanic'],
    headline: 'Mobile car mechanic: diagnostics, batteries and brakes',
    bio: 'I come to your home or office with an OBD scanner and tools. Toyota, Honda and Suzuki specialist with 16 years in workshops on Peshawar Road. Battery replacement, brake pads, tune-ups and starting problems are usually fixed on the spot.',
    experienceYears: 16,
    serviceAreas: ['Peshawar Road', 'Westridge', 'Saddar', 'Satellite Town', 'G-13', 'E-11'],
    certifications: [{ title: 'Auto Mechanic Certificate', issuer: 'TEVTA', year: 2009 }],
    startingPrice: 1000,
    status: 'verified',
    monthsAgo: 8,
    weekly: week('10:00', '20:00'),
  },
  {
    key: 'p05',
    name: 'Zeeshan Haider',
    email: 'zeeshan@localfix.test',
    phone: '0300 0000 305',
    city: 'Rawalpindi',
    area: 'Bahria Town Phase 7',
    categories: ['solar-ups', 'electrical'],
    headline: 'Solar systems, inverters and UPS batteries',
    bio: 'Solar and backup power installer. I size systems from your actual electricity bill, install tier-1 panels with proper earthing, and set up hybrid inverters with net-metering-ready wiring. I also diagnose UPS batteries that drain too quickly.',
    experienceYears: 7,
    serviceAreas: ['Bahria Town Phase 7', 'DHA Phase 2', 'Gulberg Greens', 'PWD Housing', 'Adiala Road'],
    certifications: [
      { title: 'Solar PV Installer Training', issuer: 'AEDB', year: 2019 },
      { title: 'Electrical Technician Certificate', issuer: 'NAVTTC', year: 2017 },
    ],
    startingPrice: 1500,
    status: 'verified',
    monthsAgo: 7,
    weekly: week(),
  },
  {
    key: 'p06',
    name: 'Waqas Anjum',
    email: 'waqas@localfix.test',
    phone: '0300 0000 306',
    city: 'Rawalpindi',
    area: 'Satellite Town',
    categories: ['carpentry'],
    headline: 'Furniture repair, kitchen cabinets and doors',
    bio: 'Carpenter with 12 years of experience in kitchen cabinets, wardrobes and door work. I fix loose hinges, jammed locks and swollen doors, and assemble flat-pack furniture neatly. I bring my own hardware or use yours.',
    experienceYears: 12,
    serviceAreas: ['Satellite Town', 'Gulraiz', 'Saddar', 'Chaklala Scheme III', 'I-8'],
    certifications: [],
    startingPrice: 600,
    status: 'verified',
    monthsAgo: 9,
    weekly: week('09:00', '18:00'),
  },
  {
    key: 'p07',
    name: 'Rashid Mehmood',
    email: 'rashid@localfix.test',
    phone: '0300 0000 307',
    city: 'Islamabad',
    area: 'G-11',
    categories: ['painting'],
    headline: 'Interior and exterior painting, damp treatment',
    bio: 'Painting contractor with a team of four. We treat damp walls properly before painting, so peeling does not come back after one season. Emulsion, enamel, weather coat and texture finishes. Furniture is covered and floors protected.',
    experienceYears: 10,
    serviceAreas: ['G-11', 'G-10', 'G-13', 'F-11', 'E-11', 'I-10'],
    certifications: [],
    startingPrice: 2500,
    status: 'verified',
    monthsAgo: 6,
    weekly: week('08:00', '18:00'),
  },
  {
    key: 'p08',
    name: 'Kashif Nawaz',
    email: 'kashif@localfix.test',
    phone: '0300 0000 308',
    city: 'Rawalpindi',
    area: 'Saddar',
    categories: ['plumbing'],
    headline: 'Water tanks, motors and drain unblocking',
    bio: 'Plumber covering Rawalpindi for tank cleaning, water motor installation and blocked drains. I use a drain machine for stubborn blockages instead of breaking tiles.',
    experienceYears: 6,
    serviceAreas: ['Saddar', 'Westridge', 'Chaklala Scheme III', 'Satellite Town', 'Bahria Town Phase 7'],
    certifications: [],
    startingPrice: 600,
    status: 'verified',
    monthsAgo: 5,
    weekly: week('08:00', '20:00'),
  },
  {
    key: 'p09',
    name: 'Adeel Rafiq',
    email: 'adeel@localfix.test',
    phone: '0300 0000 309',
    city: 'Rawalpindi',
    area: 'Chaklala Scheme III',
    categories: ['ac-repair', 'appliance-repair'],
    headline: 'AC and refrigerator technician',
    bio: 'I service and repair split ACs, refrigerators and deep freezers. Gas refills are done with proper leak testing so you do not pay for the same refill twice in a season.',
    experienceYears: 8,
    serviceAreas: ['Chaklala Scheme III', 'Saddar', 'Bahria Town Phase 7', 'DHA Phase 2', 'Gulraiz'],
    certifications: [{ title: 'Refrigeration & Air Conditioning Course', issuer: 'TEVTA', year: 2017 }],
    startingPrice: 1200,
    status: 'verified',
    monthsAgo: 7,
    weekly: week('09:00', '20:00'),
  },
  {
    key: 'p10',
    name: 'Hamza Saleem',
    email: 'hamza@localfix.test',
    phone: '0300 0000 310',
    city: 'Islamabad',
    area: 'E-11',
    categories: ['appliance-repair'],
    headline: 'Washing machines, microwaves, fridges and ovens',
    bio: 'Home appliance repair with genuine parts. I check the fault first and give you the repair price before ordering anything, so you can decide whether a repair is worth it.',
    experienceYears: 5,
    serviceAreas: ['E-11', 'F-10', 'F-11', 'G-11', 'G-13'],
    certifications: [],
    startingPrice: 900,
    status: 'verified',
    monthsAgo: 4,
    weekly: week('10:00', '19:00'),
  },
  {
    key: 'p11',
    name: 'Junaid Aslam',
    email: 'junaid@localfix.test',
    phone: '0300 0000 311',
    city: 'Islamabad',
    area: 'DHA Phase 2',
    categories: ['pest-control'],
    headline: 'Licensed fumigation for termites, cockroaches and bed bugs',
    bio: 'Pest control with government-registered chemicals and a safety briefing for families with children and pets. Termite treatment includes drilling and injection with a written warranty.',
    experienceYears: 9,
    serviceAreas: ['DHA Phase 2', 'Bahria Town Phase 7', 'PWD Housing', 'Gulberg Greens', 'I-8', 'F-10'],
    certifications: [{ title: 'Pesticide Applicator Licence', issuer: 'Punjab Agriculture Department', year: 2018 }],
    startingPrice: 2500,
    status: 'verified',
    monthsAgo: 10,
    weekly: week('09:00', '18:00'),
  },
  {
    key: 'p12',
    name: 'Farhan Siddique',
    email: 'farhan@localfix.test',
    phone: '0300 0000 312',
    city: 'Islamabad',
    area: 'G-13',
    categories: ['car-mechanic'],
    headline: 'Hybrid and EFI specialist, car AC',
    bio: 'Workshop-trained mechanic for petrol, hybrid and EFI engines. I diagnose check-engine lights with a scanner and explain each fault code in plain words. Car AC gas and compressor work too.',
    experienceYears: 13,
    serviceAreas: ['G-13', 'G-11', 'E-11', 'F-11', 'Peshawar Road'],
    certifications: [{ title: 'Toyota Technical Education Program (T-TEP)', issuer: 'Indus Motor Company', year: 2013 }],
    startingPrice: 1200,
    status: 'verified',
    monthsAgo: 6,
    weekly: week('09:00', '19:00'),
  },
  {
    key: 'p13',
    name: 'Sohail Abbas',
    email: 'sohail@localfix.test',
    phone: '0300 0000 313',
    city: 'Islamabad',
    area: 'F-8',
    categories: ['home-cleaning'],
    headline: 'Deep cleaning, sofa and carpet shampoo',
    bio: 'My team of three handles move-in deep cleans, kitchen degreasing and sofa or carpet shampoo with extraction machines. We bring all equipment and cleaning material.',
    experienceYears: 7,
    serviceAreas: ['F-6', 'F-7', 'F-8', 'F-10', 'G-9', 'Blue Area'],
    certifications: [],
    startingPrice: 3000,
    status: 'verified',
    monthsAgo: 8,
    weekly: week('08:00', '18:00'),
  },
  {
    key: 'p14',
    name: 'Moin Akram',
    email: 'moin@localfix.test',
    phone: '0300 0000 314',
    city: 'Rawalpindi',
    area: 'Gulraiz',
    categories: ['electrical'],
    headline: 'House wiring and light fitting',
    bio: 'Electrician for house wiring, light fitting and fan installation. Recently started taking jobs independently after 3 years with a contractor.',
    experienceYears: 3,
    serviceAreas: ['Gulraiz', 'Chaklala Scheme III', 'Satellite Town'],
    certifications: [],
    startingPrice: 500,
    status: 'pending',
    monthsAgo: 0.15,
    weekly: week(),
  },
  {
    key: 'p15',
    name: 'Rubina Kausar',
    email: 'rubina@localfix.test',
    phone: '0300 0000 315',
    city: 'Islamabad',
    area: 'F-7',
    categories: ['home-cleaning'],
    headline: 'Home deep cleaning by an all-women team',
    bio: 'An all-women cleaning team, popular with families who prefer female staff at home. Deep cleaning, kitchens, bathrooms and post-event cleanups. Eco-friendly products on request.',
    experienceYears: 6,
    serviceAreas: ['F-6', 'F-7', 'F-8', 'E-11', 'I-8', 'G-9'],
    certifications: [],
    startingPrice: 2500,
    status: 'verified',
    monthsAgo: 5,
    weekly: week('09:00', '17:00'),
  },
  {
    key: 'p16',
    name: 'Samina Yousaf',
    email: 'samina@localfix.test',
    phone: '0300 0000 316',
    city: 'Islamabad',
    area: 'PWD Housing',
    categories: ['home-cleaning'],
    headline: 'Kitchen degreasing and bathroom cleaning',
    bio: '',
    experienceYears: 2,
    serviceAreas: ['PWD Housing'],
    certifications: [],
    startingPrice: null,
    status: 'unverified',
    monthsAgo: 0.05,
    weekly: week(),
  },
  {
    key: 'p17',
    name: 'Mohsin Raza',
    email: 'mohsin@localfix.test',
    phone: '0300 0000 317',
    city: 'Islamabad',
    area: 'F-10',
    categories: ['plumbing', 'electrical'],
    headline: 'Handyman for plumbing and small electrical jobs',
    bio: 'Two trades, one visit. I handle leaking taps, sink pipes, switch and socket replacement and light fitting, which saves you calling two people for small jobs.',
    experienceYears: 8,
    serviceAreas: ['F-10', 'F-11', 'F-8', 'G-9', 'E-11', 'I-8'],
    certifications: [{ title: 'Plumbing & Electrical Basic Course', issuer: 'NAVTTC', year: 2018 }],
    startingPrice: 600,
    status: 'verified',
    monthsAgo: 6,
    weekly: week('09:00', '21:00'),
  },
  {
    key: 'p18',
    name: 'Abdul Ghaffar',
    email: 'ghaffar@localfix.test',
    phone: '0300 0000 318',
    city: 'Islamabad',
    area: 'I-8',
    categories: ['plumbing'],
    headline: 'Senior plumber, geysers and bathroom renovation',
    bio: 'Twenty years of plumbing work, from single leaks to full bathroom renovations. Gas and electric geyser repair and installation is my speciality.',
    experienceYears: 20,
    serviceAreas: ['I-8', 'I-10', 'F-10', 'G-9', 'G-10', 'PWD Housing'],
    certifications: [],
    startingPrice: 1000,
    status: 'verified',
    monthsAgo: 12,
    weekly: week('08:00', '18:00'),
  },
];

// Request templates per category: [title, description, budgetMin, budgetMax]
export const REQUEST_TEMPLATES = {
  plumbing: [
    ['Kitchen sink pipe leaking under the cabinet', 'Water drips from the joint under my kitchen sink every time the tap runs. The cabinet base is getting soaked and the wood has started to swell. Please replace the joint or the pipe.', 1000, 3000],
    ['Bathroom mixer tap dripping all night', 'The hot and cold mixer in the main bathroom drips constantly even when fully closed. I think the cartridge needs replacing. Brand is Faisal Sanitary, about 4 years old.', 800, 2500],
    ['Shower drain blocked, water backing up', 'The shower floor drain is completely blocked and water stays on the floor for an hour. Tried a drain cleaner but it did not help. Need it cleared without breaking tiles if possible.', 1500, 4000],
    ['Gas geyser not lighting up', 'Our 35-gallon gas geyser pilot light keeps going off and there is no hot water in the morning. Gas pressure in the kitchen is fine. Need someone to check the thermocouple.', 1500, 5000],
  ],
  electrical: [
    ['Burning smell from bedroom socket', 'There is a burning plastic smell from one wall socket in the bedroom and the plate is slightly brown. I have switched off that circuit for now. Need it checked and replaced safely.', 800, 2500],
    ['Main breaker trips every evening', 'The main breaker trips almost every evening around 8 pm when the iron or kettle is on together with the AC. Need the load checked and the DB box inspected.', 1500, 5000],
    ['Install 6 LED panel lights and 2 ceiling fans', 'New lounge and dining area. I have bought 6 LED panel lights and 2 ceiling fans (GFC). Need installation with proper wiring. False ceiling is already done.', 3000, 6000],
  ],
  'ac-repair': [
    ['Split AC not cooling, only the fan runs', '1.5 ton Haier split AC. The indoor fan runs but the outdoor unit does not start, so there is no cooling. Possibly the capacitor. Need it fixed before the weekend.', 1500, 5000],
    ['General service for 3 split ACs before summer', 'Three split ACs (two 1.5 ton, one 1 ton) need a full master service: indoor and outdoor washing, filter cleaning and gas pressure check.', 4500, 7500],
    ['Inverter AC showing error E1', 'Gree 1.5 ton DC inverter AC shows E1 on the display and turns off after a few minutes. It is 3 years old. Need diagnosis and repair.', 2000, 8000],
    ['Shift split AC to another room', 'Need a 1 ton split AC removed from the guest room and installed in the kids room on the same floor. Pipe length about 3 metres. Please include gas top-up if needed.', 4000, 8000],
  ],
  'car-mechanic': [
    ['Car will not start in the morning, clicking sound', 'Suzuki Cultus 2018. In the morning the starter only clicks and the car does not crank. Lights are dim. Probably the battery but not sure. Car is parked at home.', 1000, 15000],
    ['Brake pads squeaking on Corolla 2016', 'Front brakes make a squeaking noise and the pedal feels soft. Need front brake pads replaced and the brake oil checked. Can be done at my home.', 3000, 7000],
    ['Engine check light on, Honda City 2019', 'Check engine light came on yesterday. Car drives normally but fuel average seems lower. Need an OBD scan and diagnosis.', 1500, 4000],
  ],
  'home-cleaning': [
    ['Deep cleaning of a 3-bedroom house before move-in', 'Moving into a 3-bedroom upper portion next week. Need full deep cleaning: kitchen, 3 bathrooms, windows, cabinets inside and out, floors. House is empty.', 8000, 15000],
    ['Sofa and carpet shampoo, 7-seater sofa', 'Need a 7-seater fabric sofa (3+2+1+1) and one 8x10 carpet shampooed and dried. Light stains from kids.', 4000, 8000],
    ['Kitchen deep clean and degreasing', 'Kitchen cabinets, exhaust hood and tiles behind the stove have heavy oil buildup. Need a proper degreasing clean.', 3000, 6000],
  ],
  carpentry: [
    ['Kitchen cabinet doors hanging loose', 'Four kitchen cabinet doors are hanging at an angle and two hinges are broken. Need the hinges replaced with soft-close ones and doors aligned.', 1500, 4000],
    ['Main door lock jammed and door rubbing the floor', 'Wooden main door has swollen and rubs the floor. The lock is also jammed and hard to turn. Need the door planed and the lock replaced.', 2000, 5000],
    ['Assemble a wardrobe and a study table', 'Bought a flat-pack 3-door wardrobe and a study table online. Need both assembled and the wardrobe fixed to the wall for safety.', 2000, 4500],
  ],
  painting: [
    ['Damp patches and peeling paint on bedroom wall', 'The bedroom wall next to the bathroom has damp patches and the paint is peeling off in flakes. Need the cause treated and the wall repainted.', 5000, 15000],
    ['Paint 2 rooms and lounge, about 1,200 sq ft', 'Need two bedrooms and the lounge repainted with emulsion. Walls are in decent condition, only small cracks to fill. Paint brand suggestions welcome.', 25000, 45000],
    ['Weather coat for exterior boundary wall', 'Boundary wall of a 10 marla house needs weather shield paint. Old paint is faded and has some algae on the north side.', 15000, 30000],
  ],
  'appliance-repair': [
    ['Automatic washing machine not draining', 'Haier front-load washing machine stops mid-cycle with water still inside. Display shows E21. Need the drain pump or filter checked.', 1500, 6000],
    ['Fridge not cooling in the lower section', 'Dawlance refrigerator: the freezer is fine but the lower section is not cooling. Food is spoiling. Need diagnosis today if possible.', 2000, 8000],
    ['Microwave sparks when heating', 'Microwave oven makes sparks inside when heating food, even with nothing metal inside. Model is about 5 years old.', 1000, 4000],
  ],
  'pest-control': [
    ['Termites found in wooden door frames', 'Found termite mud tubes on two door frames on the ground floor. Need full termite treatment with drilling and a warranty.', 10000, 25000],
    ['Cockroach treatment for kitchen and bathrooms', 'Cockroaches in the kitchen and both bathrooms, especially at night. Need gel or spray treatment that is safe with small children at home.', 3000, 6000],
    ['Bed bug fumigation for 2 bedrooms', 'Bed bugs in two bedrooms after guests stayed. Need fumigation and advice on what to do with mattresses.', 5000, 10000],
  ],
  'solar-ups': [
    ['UPS batteries drain in 1 hour during load shedding', 'Two 12V tubular batteries on a 1.5 kVA UPS now last only about an hour. They are 2 years old. Need them tested and advice on whether to replace.', 1000, 3000],
    ['Install 5 kW solar system on rooftop', 'Want a 5 kW hybrid solar system for a 10 marla house with a flat roof. Monthly bill is around Rs 35,000 in summer. Need a quote with panel and inverter brands.', 650000, 900000],
    ['Solar panel cleaning and inverter check', '12 solar panels on the roof have dust buildup and production has dropped. Need cleaning and an inverter settings check.', 2500, 5000],
  ],
};

export const OFFER_NOTES = {
  plumbing: [
    'I will bring a new joint and Teflon tape. Price includes labour and standard fittings.',
    'Includes a drain machine if needed. No tile breaking unless absolutely necessary.',
    'Price covers inspection and repair. Branded cartridge charged at market rate if required.',
  ],
  electrical: [
    'Includes a branded socket and wire testing of the full circuit.',
    'I will check the load on each line and rebalance the DB box. Breakers charged separately if needed.',
    'Installation with proper earthing. Price covers all labour.',
  ],
  'ac-repair': [
    'Master service with indoor and outdoor washing and gas pressure check.',
    'Price includes capacitor replacement if that is the fault. Gas refill is extra only if a leak test passes.',
    'Full installation with vacuuming, copper pipe charged per foot if extra is needed.',
  ],
  'car-mechanic': [
    'OBD scan included. I will explain each fault code before any repair.',
    'Price includes labour for brake pads. Genuine pads available at cost.',
    'Battery test on the spot. If replacement is needed I can bring a new battery.',
  ],
  'home-cleaning': [
    'Team of 3 with all equipment and cleaning material. About 6 hours.',
    'Extraction machine shampoo, quick-dry fans included.',
    'Degreasing with food-safe products, includes exhaust hood filter cleaning.',
  ],
  carpentry: [
    'Soft-close hinges included in the price. Doors aligned and screws tightened.',
    'I will plane the door, adjust hinges and fit a new lock of your choice.',
    'Assembly with wall anchoring for safety.',
  ],
  painting: [
    'Includes damp treatment and two coats of emulsion. Paint at cost or you can buy it.',
    'Team of 4, three days. Furniture covered and floors protected.',
    'Weather shield with algae wash and primer.',
  ],
  'appliance-repair': [
    'Diagnosis included. Repair price confirmed before any part is ordered.',
    'Includes gas leak check and thermostat test.',
    'Drain pump and filter cleaning, part replacement extra if needed.',
  ],
  'pest-control': [
    'Child and pet safe gel treatment with a 3-month follow-up.',
    'Drilling and injection treatment with a 1-year written warranty.',
    'Two-visit fumigation, 10 days apart, with a mattress care guide.',
  ],
  'solar-ups': [
    'Battery load test and water level check. Advice on replacement if needed.',
    'Tier-1 mono panels with a hybrid inverter, includes structure and wiring.',
    'Panel washing with soft brushes and inverter settings optimisation.',
  ],
};

export const REVIEW_COMMENTS = {
  5: [
    'Arrived on time, explained the problem clearly and fixed it in under an hour. Very clean work.',
    'Excellent. Gave a fair price on LocalFix and did not ask for extra money after the job.',
    'Very professional and polite. Will definitely book again.',
    'Fixed a problem two other people could not. Highly recommended.',
    'Quick, neat and honest. Showed me the old part he replaced.',
    'Came within 40 minutes of accepting the offer. Great service.',
  ],
  4: [
    'Good work and fair price. Arrived about 20 minutes late but called ahead.',
    'Job done properly. Had to buy one part from the market, which took a bit of time.',
    'Solid work, a bit of dust left behind but overall happy.',
  ],
  3: ['The job got done, but it took two visits and communication could be better.'],
  2: ['Fixed the issue but was an hour late and did not call. The price was fine.'],
};

export const CHAT_SCRIPTS = {
  negotiate: [
    ['customer', 'Hi, thanks for the offer. Can you come a little earlier, around 11?'],
    ['provider', 'Yes, I can be there by 11. I am finishing a job nearby.'],
    ['customer', 'Great. Is there any room on the price? Another offer is a bit lower.'],
    ['provider', 'I can do a small discount since you are close by. I will update the offer.'],
  ],
  job: [
    ['provider', 'Thank you for choosing me. I am on my way and will reach in about 30 minutes.'],
    ['customer', 'Okay, the gate is the black one next to the mosque.'],
    ['provider', 'Reached. Ringing the bell now.'],
    ['customer', 'Coming down, thanks.'],
  ],
  question: [
    ['provider', 'Hi, before I send an offer, can you share which floor this is and whether parking is available?'],
    ['customer', 'It is the first floor. You can park right outside the gate.'],
    ['provider', 'Thanks, sending my offer now.'],
  ],
};

export const TIPS = [
  {
    cover: 1,
    category: 'ac-repair',
    daysAgo: 6,
    title: 'Service your AC before the first heatwave',
    excerpt: 'A pre-summer service takes about an hour per unit and prevents most mid-June breakdowns. Here is what a proper service includes.',
    body: `Most AC breakdowns in Islamabad and Rawalpindi happen in the first hot week of the season, when every technician is fully booked. A service in March or April avoids the rush and catches small faults early.

## What a proper service includes
- Indoor unit: filter wash, coil cleaning and drain pipe flush, so water does not drip inside the room.
- Outdoor unit: pressure wash of the condenser coil. Dust on this coil is the most common reason for weak cooling.
- Gas pressure check with a gauge. A healthy system should not need a refill every year. If it does, ask for a leak test before paying for gas.
- Capacitor and fan check. A weak capacitor is cheap to replace and is a frequent cause of "fan runs but no cooling".

## Simple things you can do yourself
Clean the indoor filters every two weeks during summer. They slide out from under the front panel and only need water. Keep the outdoor unit clear of plants, boxes and covers so it can release heat.

## Signs you need a technician
Ice on the indoor pipes, water dripping inside, a clicking outdoor unit that never starts, or an error code on an inverter AC. Note the code before calling, because it speeds up diagnosis.

Post an "AC Repair & Service" request on LocalFix with the number and size of your units, and compare offers from verified technicians near you.`,
  },
  {
    cover: 2,
    category: 'plumbing',
    daysAgo: 13,
    title: 'Five small checks that prevent big plumbing leaks',
    excerpt: 'Most water damage starts as a slow drip nobody noticed. These checks take ten minutes a month.',
    body: `A slow leak under a sink can soak a cabinet for weeks before anyone notices. A monthly ten-minute walk-around catches most problems while they are still cheap to fix.

## The monthly checklist
- Open the cabinets under kitchen and bathroom sinks and feel the pipes and the cabinet floor for moisture.
- Look at the base of the toilet and the wall behind it for stains.
- Check the water meter or tank level at night when no water is in use. If the level drops, there is a hidden leak.
- Listen for a toilet that keeps refilling. A worn flapper can waste hundreds of litres a day.
- Check geyser and water tank overflow pipes for constant dripping.

## Keep drains flowing
Do not pour cooking oil down the kitchen sink. It sets inside the pipe and traps food waste. Use a strainer in shower drains to catch hair, which causes most bathroom blockages.

## When to call a plumber
Call quickly if you see water stains on a ceiling, hear running water with every tap closed, or notice a musty smell inside cabinets. Close the main valve if water is spreading, and know where that valve is before you need it.

On LocalFix you can attach photos of the leak to your request, which helps plumbers give an accurate price before they visit.`,
  },
  {
    cover: 3,
    category: 'electrical',
    daysAgo: 21,
    title: 'Home electrical safety: warning signs you should not ignore',
    excerpt: 'Warm sockets, flickering lights and frequent tripping are early warnings. Here is what each one usually means.',
    body: `Electrical faults rarely appear without warning. Recognising the early signs keeps your family safe and usually makes the repair smaller.

## Warning signs
- A burning or hot plastic smell near a socket or switch. Switch off that circuit at the breaker and do not use it until it is checked.
- Sockets or plates that are warm to the touch, or have brown marks.
- Lights that flicker when a heavy appliance such as an iron or kettle starts.
- A breaker that trips repeatedly. Breakers trip to protect the wiring. Replacing them with higher-rated ones without checking the load is dangerous.

## Everyday habits that help
Avoid running several heavy appliances from one extension board. Do not hide extension cords under carpets, where heat cannot escape. Replace damaged plugs instead of taping them.

## Before summer
Air conditioners add a large load. If your house wiring is more than 15 years old, ask an electrician to check the main supply cable and the distribution board before the season starts.

Always choose a qualified electrician. Verified providers on LocalFix list their certifications on their profile so you can check before you hire.`,
  },
  {
    cover: 4,
    category: 'car-mechanic',
    daysAgo: 30,
    title: 'Car maintenance basics every driver should know',
    excerpt: 'Battery, tyres, oil and brakes cover most roadside problems. A simple routine keeps your car reliable.',
    body: `Most roadside breakdowns come from four things: the battery, tyres, engine oil and brakes. Checking them regularly costs little and avoids being stuck on the road.

## Battery
A starter that clicks but does not crank usually means a weak battery or loose terminals. Car batteries typically last two to four years. If your car struggles on cold mornings, get the battery load-tested before it fails completely.

## Tyres
Check tyre pressure once a month when the tyres are cold, using the figures printed inside the driver's door. Under-inflated tyres wear faster and increase fuel use.

## Engine oil
Change oil and the oil filter at the interval in your car's manual, usually every 5,000 to 10,000 km depending on the oil type. Check the dipstick level every few weeks.

## Brakes
Squeaking, grinding or a soft pedal mean the brakes need attention now. Brake pads are inexpensive. Damaged discs are not.

## Check-engine light
A steady light means the car has stored a fault code. Have it scanned soon. A flashing light means stop driving and get help.

Mobile mechanics on LocalFix can come to your home with a scanner and the common parts, so you do not lose a day at the workshop.`,
  },
  {
    cover: 5,
    category: 'pest-control',
    daysAgo: 38,
    title: 'Keeping pests out of your home through the monsoon',
    excerpt: 'Humidity and standing water bring cockroaches, mosquitoes and termites indoors. Prevention is cheaper than treatment.',
    body: `The monsoon brings humidity and standing water, which is exactly what cockroaches, mosquitoes and termites need. A few habits make your home much less attractive to them.

## Cut off food and water
Store food in sealed containers and do not leave dishes in the sink overnight. Fix dripping taps, because cockroaches need water more than food.

## Close the entry points
Seal gaps around pipes under sinks and use drain covers in bathrooms at night. Fit mesh on windows used for ventilation.

## Mosquitoes
Empty water from flower pots, coolers, buckets and old tyres every few days. Mosquito larvae need only a small amount of still water.

## Termites
Look for thin mud tubes on walls and door frames, hollow-sounding wood, and small piles of wings near windows after rain. Termite damage spreads quietly, so treat it professionally as soon as you see signs.

## Choosing a pest control service
Ask which chemicals will be used, whether they are registered for household use, and how long children and pets should stay out of treated rooms. A good provider gives you this information without being asked.`,
  },
  {
    cover: 6,
    category: 'solar-ups',
    daysAgo: 45,
    title: 'How to keep your solar panels producing at their best',
    excerpt: 'Dust can noticeably reduce panel output in our climate. Here is a simple cleaning and checking routine.',
    body: `Solar panels have no moving parts, but they are not maintenance-free. Dust, bird droppings and shading all reduce how much electricity they produce.

## Clean regularly
In dusty months, clean panels every two to four weeks. Use plain water and a soft brush or sponge, early in the morning or in the evening when the panels are cool. Avoid detergents and pressure washers, which can damage the coating.

## Watch your production
Most inverters show daily production on a display or app. Note a typical sunny-day figure after cleaning. If production drops noticeably on similar days, the panels need cleaning or something else needs checking.

## Check for shading
Trees grow and new buildings appear. Even partial shade on one panel can reduce the output of a whole string.

## Inverter and batteries
Keep the inverter in a shaded, ventilated place. If you have batteries, check that the inverter's battery settings match the battery type, because wrong charging settings shorten battery life.

## Safety
Do not walk on panels, and avoid working on roofs without proper footing. For anything electrical, call a qualified installer.`,
  },
];

export const CONTACT_MESSAGES = [
  { name: 'Sadia Hameed', email: 'sadia.h@example.com', topic: 'provider', message: 'I run a small AC repair shop in G-13. How long does provider verification take, and what documents do I need?', daysAgo: 1 },
  { name: 'Omer Farid', email: 'omer.farid@example.com', topic: 'account', message: 'I signed up with the wrong email address. Can I change it, or should I create a new account?', daysAgo: 2 },
  { name: 'Huma Shah', email: 'huma.shah@example.com', topic: 'general', message: 'Do you plan to cover Lahore soon? I would love to use LocalFix there.', daysAgo: 4, closed: true },
];

export const SEARCH_QUERIES = ['ac service', 'plumber', 'geyser', 'solar', 'ups battery', 'termite', 'electrician', 'sofa cleaning', 'washing machine', 'car battery', 'paint', 'leak'];
