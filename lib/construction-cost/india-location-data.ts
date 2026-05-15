export type IndiaStateOption = {
  value: string;
  label: string;
  defaultCity: string;
  cities: {
    value: string;
    label: string;
  }[];
};

export const INDIA_STATE_OPTIONS: IndiaStateOption[] = [
  {
    value: "andhra_pradesh",
    label: "Andhra Pradesh",
    defaultCity: "visakhapatnam",
    cities: [
      { value: "visakhapatnam", label: "Visakhapatnam" },
      { value: "vijayawada", label: "Vijayawada" },
      { value: "guntur", label: "Guntur" },
      { value: "tirupati", label: "Tirupati" },
      { value: "kurnool", label: "Kurnool" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "arunachal_pradesh",
    label: "Arunachal Pradesh",
    defaultCity: "itanagar",
    cities: [
      { value: "itanagar", label: "Itanagar" },
      { value: "naharlagun", label: "Naharlagun" },
      { value: "pasighat", label: "Pasighat" },
      { value: "tawang", label: "Tawang" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "assam",
    label: "Assam",
    defaultCity: "guwahati",
    cities: [
      { value: "guwahati", label: "Guwahati" },
      { value: "dibrugarh", label: "Dibrugarh" },
      { value: "silchar", label: "Silchar" },
      { value: "jorhat", label: "Jorhat" },
      { value: "tezpur", label: "Tezpur" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "bihar",
    label: "Bihar",
    defaultCity: "patna",
    cities: [
      { value: "patna", label: "Patna" },
      { value: "gaya", label: "Gaya" },
      { value: "muzaffarpur", label: "Muzaffarpur" },
      { value: "bhagalpur", label: "Bhagalpur" },
      { value: "darbhanga", label: "Darbhanga" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "chhattisgarh",
    label: "Chhattisgarh",
    defaultCity: "raipur",
    cities: [
      { value: "raipur", label: "Raipur" },
      { value: "bilaspur_chhattisgarh", label: "Bilaspur" },
      { value: "durg", label: "Durg" },
      { value: "bhilai", label: "Bhilai" },
      { value: "korba", label: "Korba" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "goa",
    label: "Goa",
    defaultCity: "panaji",
    cities: [
      { value: "panaji", label: "Panaji" },
      { value: "margao", label: "Margao" },
      { value: "vasco_da_gama", label: "Vasco da Gama" },
      { value: "mapusa", label: "Mapusa" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "gujarat",
    label: "Gujarat",
    defaultCity: "ahmedabad",
    cities: [
      { value: "ahmedabad", label: "Ahmedabad" },
      { value: "surat", label: "Surat" },
      { value: "vadodara", label: "Vadodara" },
      { value: "rajkot", label: "Rajkot" },
      { value: "gandhinagar", label: "Gandhinagar" },
      { value: "jamnagar", label: "Jamnagar" },
      { value: "bhavnagar", label: "Bhavnagar" },
      { value: "junagadh", label: "Junagadh" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "haryana",
    label: "Haryana",
    defaultCity: "gurugram",
    cities: [
      { value: "gurugram", label: "Gurugram" },
      { value: "faridabad", label: "Faridabad" },
      { value: "panipat", label: "Panipat" },
      { value: "ambala", label: "Ambala" },
      { value: "hisar", label: "Hisar" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "himachal_pradesh",
    label: "Himachal Pradesh",
    defaultCity: "shimla",
    cities: [
      { value: "shimla", label: "Shimla" },
      { value: "mandi", label: "Mandi" },
      { value: "dharamshala", label: "Dharamshala" },
      { value: "solan", label: "Solan" },
      { value: "kullu", label: "Kullu" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "jharkhand",
    label: "Jharkhand",
    defaultCity: "ranchi",
    cities: [
      { value: "ranchi", label: "Ranchi" },
      { value: "jamshedpur", label: "Jamshedpur" },
      { value: "dhanbad", label: "Dhanbad" },
      { value: "bokaro", label: "Bokaro" },
      { value: "deoghar", label: "Deoghar" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "karnataka",
    label: "Karnataka",
    defaultCity: "bangalore",
    cities: [
      { value: "bangalore", label: "Bengaluru / Bangalore" },
      { value: "mysuru", label: "Mysuru" },
      { value: "mangaluru", label: "Mangaluru" },
      { value: "hubballi_dharwad", label: "Hubballi-Dharwad" },
      { value: "belagavi", label: "Belagavi" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "kerala",
    label: "Kerala",
    defaultCity: "kochi",
    cities: [
      { value: "kochi", label: "Kochi" },
      { value: "thiruvananthapuram", label: "Thiruvananthapuram" },
      { value: "kozhikode", label: "Kozhikode" },
      { value: "thrissur", label: "Thrissur" },
      { value: "kannur", label: "Kannur" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "madhya_pradesh",
    label: "Madhya Pradesh",
    defaultCity: "bhopal",
    cities: [
      { value: "bhopal", label: "Bhopal" },
      { value: "indore", label: "Indore" },
      { value: "jabalpur", label: "Jabalpur" },
      { value: "gwalior", label: "Gwalior" },
      { value: "ujjain", label: "Ujjain" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "maharashtra",
    label: "Maharashtra",
    defaultCity: "mumbai",
    cities: [
      { value: "mumbai", label: "Mumbai" },
      { value: "pune", label: "Pune" },
      { value: "nagpur", label: "Nagpur" },
      { value: "nashik", label: "Nashik" },
      { value: "thane", label: "Thane" },
      { value: "aurangabad", label: "Aurangabad / Chhatrapati Sambhajinagar" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "manipur",
    label: "Manipur",
    defaultCity: "imphal",
    cities: [
      { value: "imphal", label: "Imphal" },
      { value: "thoubal", label: "Thoubal" },
      { value: "bishnupur_manipur", label: "Bishnupur" },
      { value: "churachandpur", label: "Churachandpur" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "meghalaya",
    label: "Meghalaya",
    defaultCity: "shillong",
    cities: [
      { value: "shillong", label: "Shillong" },
      { value: "tura", label: "Tura" },
      { value: "jowai", label: "Jowai" },
      { value: "nongpoh", label: "Nongpoh" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "mizoram",
    label: "Mizoram",
    defaultCity: "aizawl",
    cities: [
      { value: "aizawl", label: "Aizawl" },
      { value: "lunglei", label: "Lunglei" },
      { value: "champhai", label: "Champhai" },
      { value: "serchhip", label: "Serchhip" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "nagaland",
    label: "Nagaland",
    defaultCity: "kohima",
    cities: [
      { value: "kohima", label: "Kohima" },
      { value: "dimapur", label: "Dimapur" },
      { value: "mokokchung", label: "Mokokchung" },
      { value: "mon", label: "Mon" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "odisha",
    label: "Odisha",
    defaultCity: "bhubaneswar",
    cities: [
      { value: "bhubaneswar", label: "Bhubaneswar" },
      { value: "cuttack", label: "Cuttack" },
      { value: "rourkela", label: "Rourkela" },
      { value: "sambalpur", label: "Sambalpur" },
      { value: "puri", label: "Puri" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "punjab",
    label: "Punjab",
    defaultCity: "ludhiana",
    cities: [
      { value: "ludhiana", label: "Ludhiana" },
      { value: "amritsar", label: "Amritsar" },
      { value: "jalandhar", label: "Jalandhar" },
      { value: "patiala", label: "Patiala" },
      { value: "bathinda", label: "Bathinda" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "rajasthan",
    label: "Rajasthan",
    defaultCity: "jaipur",
    cities: [
      { value: "jaipur", label: "Jaipur" },
      { value: "jodhpur", label: "Jodhpur" },
      { value: "udaipur", label: "Udaipur" },
      { value: "kota", label: "Kota" },
      { value: "ajmer", label: "Ajmer" },
      { value: "bikaner", label: "Bikaner" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "sikkim",
    label: "Sikkim",
    defaultCity: "gangtok",
    cities: [
      { value: "gangtok", label: "Gangtok" },
      { value: "namchi", label: "Namchi" },
      { value: "gyalshing", label: "Gyalshing" },
      { value: "mangan", label: "Mangan" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "tamil_nadu",
    label: "Tamil Nadu",
    defaultCity: "chennai",
    cities: [
      { value: "chennai", label: "Chennai" },
      { value: "coimbatore", label: "Coimbatore" },
      { value: "madurai", label: "Madurai" },
      { value: "tiruchirappalli", label: "Tiruchirappalli" },
      { value: "salem", label: "Salem" },
      { value: "tirunelveli", label: "Tirunelveli" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "telangana",
    label: "Telangana",
    defaultCity: "hyderabad",
    cities: [
      { value: "hyderabad", label: "Hyderabad" },
      { value: "warangal", label: "Warangal" },
      { value: "nizamabad", label: "Nizamabad" },
      { value: "karimnagar", label: "Karimnagar" },
      { value: "khammam", label: "Khammam" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "tripura",
    label: "Tripura",
    defaultCity: "agartala",
    cities: [
      { value: "agartala", label: "Agartala" },
      { value: "udaipur_tripura", label: "Udaipur" },
      { value: "dharmanagar", label: "Dharmanagar" },
      { value: "kailashahar", label: "Kailashahar" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "uttar_pradesh",
    label: "Uttar Pradesh",
    defaultCity: "lucknow",
    cities: [
      { value: "lucknow", label: "Lucknow" },
      { value: "kanpur", label: "Kanpur" },
      { value: "varanasi", label: "Varanasi" },
      { value: "agra", label: "Agra" },
      { value: "prayagraj", label: "Prayagraj" },
      { value: "noida", label: "Noida" },
      { value: "ghaziabad", label: "Ghaziabad" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "uttarakhand",
    label: "Uttarakhand",
    defaultCity: "dehradun",
    cities: [
      { value: "dehradun", label: "Dehradun" },
      { value: "haridwar", label: "Haridwar" },
      { value: "nainital", label: "Nainital" },
      { value: "haldwani", label: "Haldwani" },
      { value: "rishikesh", label: "Rishikesh" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "west_bengal",
    label: "West Bengal",
    defaultCity: "cooch_behar",
    cities: [
      { value: "cooch_behar", label: "Cooch Behar" },
      { value: "alipurduar", label: "Alipurduar" },
      { value: "jalpaiguri", label: "Jalpaiguri" },
      { value: "siliguri", label: "Siliguri" },
      { value: "darjeeling", label: "Darjeeling" },
      { value: "malda", label: "Malda" },
      { value: "raiganj", label: "Raiganj" },
      { value: "kolkata", label: "Kolkata" },
      { value: "howrah", label: "Howrah" },
      { value: "durgapur", label: "Durgapur" },
      { value: "asansol", label: "Asansol" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "andaman_nicobar",
    label: "Andaman and Nicobar Islands",
    defaultCity: "port_blair",
    cities: [
      { value: "port_blair", label: "Port Blair" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "chandigarh",
    label: "Chandigarh",
    defaultCity: "chandigarh_city",
    cities: [
      { value: "chandigarh_city", label: "Chandigarh" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "dadra_nagar_haveli_daman_diu",
    label: "Dadra and Nagar Haveli and Daman and Diu",
    defaultCity: "daman",
    cities: [
      { value: "daman", label: "Daman" },
      { value: "diu", label: "Diu" },
      { value: "silvassa", label: "Silvassa" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "delhi_ncr",
    label: "Delhi NCR",
    defaultCity: "delhi_ncr",
    cities: [
      { value: "delhi_ncr", label: "Delhi NCR" },
      { value: "new_delhi", label: "New Delhi" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "jammu_kashmir",
    label: "Jammu and Kashmir",
    defaultCity: "srinagar",
    cities: [
      { value: "srinagar", label: "Srinagar" },
      { value: "jammu", label: "Jammu" },
      { value: "anantnag", label: "Anantnag" },
      { value: "baramulla", label: "Baramulla" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "ladakh",
    label: "Ladakh",
    defaultCity: "leh",
    cities: [
      { value: "leh", label: "Leh" },
      { value: "kargil", label: "Kargil" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "lakshadweep",
    label: "Lakshadweep",
    defaultCity: "kavaratti",
    cities: [
      { value: "kavaratti", label: "Kavaratti" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
  {
    value: "puducherry",
    label: "Puducherry",
    defaultCity: "puducherry_city",
    cities: [
      { value: "puducherry_city", label: "Puducherry" },
      { value: "karaikal", label: "Karaikal" },
      { value: "yanam", label: "Yanam" },
      { value: "mahe", label: "Mahe" },
      { value: "other", label: "Other / Type manually" },
    ],
  },
];

export function getIndiaStateOption(stateValue: string) {
  return (
    INDIA_STATE_OPTIONS.find((state) => state.value === stateValue) ??
    INDIA_STATE_OPTIONS.find((state) => state.value === "west_bengal") ??
    INDIA_STATE_OPTIONS[0]
  );
}

export function getDefaultCityForState(stateValue: string): string {
  return getIndiaStateOption(stateValue).defaultCity;
}

export function normalizeManualLocation(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
