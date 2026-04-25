export const STAGES = [
  { id: "da_chiamare", label: "Da chiamare", color: "#64748B", tone: "slate", order: 0 },
  { id: "non_interessato", label: "Non interessato", color: "#EF4444", tone: "red", order: 1 },
  { id: "follow_up", label: "Follow up", color: "#3B82F6", tone: "blue", order: 2 },
  { id: "email", label: "Email inviata", color: "#8B5CF6", tone: "violet", order: 3 },
  { id: "in_attesa", label: "In attesa", color: "#A855F7", tone: "violet", order: 4 },
  { id: "appuntamento", label: "Appuntamento", color: "#10B981", tone: "green", order: 5 },
  { id: "cliente", label: "Cliente", color: "#F59E0B", tone: "amber", order: 6 },
] as const

export type StageId = (typeof STAGES)[number]["id"]

export const ROLES = ["sales", "admin", "both"] as const
export type Role = (typeof ROLES)[number]

export const PROVINCES_LAZIO = [
  { code: "RM", name: "Roma", lat: 41.9028, lng: 12.4964 },
  { code: "LT", name: "Latina", lat: 41.4676, lng: 12.9037 },
  { code: "FR", name: "Frosinone", lat: 41.6399, lng: 13.3499 },
  { code: "VT", name: "Viterbo", lat: 42.4201, lng: 12.1076 },
  { code: "RI", name: "Rieti", lat: 42.4025, lng: 12.8579 },
] as const

// Keep backward compatibility alias
export const PROVINCES = PROVINCES_LAZIO

export const RESOURCE_CATEGORIES = [
  { id: "script", label: "Script chiamate", icon: "phone", color: "#EC4899" },
  { id: "template", label: "Template email", icon: "mail", color: "#3B82F6" },
  { id: "obiezioni", label: "Gestione obiezioni", icon: "shield", color: "#F97316" },
  { id: "listino", label: "Listino", icon: "file-text", color: "#10B981" },
  { id: "playbook", label: "Playbook", icon: "book-open", color: "#8B5CF6" },
] as const

export const NEWS_CATEGORIES = [
  { id: "COMMISSIONI", color: "#EC4899" },
  { id: "PRODOTTO", color: "#3B82F6" },
  { id: "MOBILE", color: "#10B981" },
] as const

export const COMMISSION_TIERS = [
  { tier: "Setter", rate: 0.30, desc: "Commissione del 30% sul valore del contratto quando si agisce come setter" },
  { tier: "Close", rate: 0.10, desc: "Commissione del 10% sul valore del contratto in fase di chiusura" },
  { tier: "In solitaria", rate: 0.40, desc: "Commissione del 40% sul valore del contratto quando si gestisce l'intero ciclo di vendita", highlight: true },
] as const

export const REGIONI_PROVINCE: Record<string, string[]> = {
  "Abruzzo": ["AQ", "CH", "PE", "TE"],
  "Basilicata": ["MT", "PZ"],
  "Calabria": ["CZ", "CS", "KR", "RC", "VV"],
  "Campania": ["AV", "BN", "CE", "NA", "SA"],
  "Emilia-Romagna": ["BO", "FE", "FC", "MO", "PR", "PC", "RA", "RE", "RN"],
  "Friuli Venezia Giulia": ["GO", "PN", "TS", "UD"],
  "Lazio": ["FR", "LT", "RI", "RM", "VT"],
  "Liguria": ["GE", "IM", "SP", "SV"],
  "Lombardia": ["BG", "BS", "CO", "CR", "LC", "LO", "MN", "MI", "MB", "PV", "SO", "VA"],
  "Marche": ["AN", "AP", "FM", "MC", "PU"],
  "Molise": ["CB", "IS"],
  "Piemonte": ["AL", "AT", "BI", "CN", "NO", "TO", "VB", "VC"],
  "Puglia": ["BA", "BT", "BR", "FG", "LE", "TA"],
  "Sardegna": ["CA", "NU", "OR", "SS", "SU"],
  "Sicilia": ["AG", "CL", "CT", "EN", "ME", "PA", "RG", "SR", "TP"],
  "Toscana": ["AR", "FI", "GR", "LI", "LU", "MS", "PI", "PT", "PO", "SI"],
  "Trentino-Alto Adige": ["BZ", "TN"],
  "Umbria": ["PG", "TR"],
  "Valle d'Aosta": ["AO"],
  "Veneto": ["BL", "PD", "RO", "TV", "VE", "VR", "VI"],
}

export const PROVINCE_NAMES: Record<string, string> = {
  AG: "Agrigento", AL: "Alessandria", AN: "Ancona", AO: "Aosta", AP: "Ascoli Piceno",
  AQ: "L'Aquila", AR: "Arezzo", AT: "Asti", AV: "Avellino", BA: "Bari",
  BG: "Bergamo", BI: "Biella", BL: "Belluno", BN: "Benevento", BO: "Bologna",
  BR: "Brindisi", BS: "Brescia", BT: "Barletta-Andria-Trani", BZ: "Bolzano",
  CA: "Cagliari", CB: "Campobasso", CE: "Caserta", CH: "Chieti", CL: "Caltanissetta",
  CN: "Cuneo", CO: "Como", CR: "Cremona", CS: "Cosenza", CT: "Catania",
  CZ: "Catanzaro", EN: "Enna", FC: "Forlì-Cesena", FE: "Ferrara", FG: "Foggia",
  FI: "Firenze", FM: "Fermo", FR: "Frosinone", GE: "Genova", GO: "Gorizia",
  GR: "Grosseto", IM: "Imperia", IS: "Isernia", KR: "Crotone", LC: "Lecco",
  LE: "Lecce", LI: "Livorno", LO: "Lodi", LT: "Latina", LU: "Lucca",
  MB: "Monza e Brianza", MC: "Macerata", ME: "Messina", MI: "Milano", MN: "Mantova",
  MO: "Modena", MS: "Massa-Carrara", MT: "Matera", NA: "Napoli", NO: "Novara",
  NU: "Nuoro", OR: "Oristano", PA: "Palermo", PC: "Piacenza", PD: "Padova",
  PE: "Pescara", PG: "Perugia", PI: "Pisa", PN: "Pordenone", PO: "Prato",
  PR: "Parma", PT: "Pistoia", PU: "Pesaro e Urbino", PV: "Pavia", PZ: "Potenza",
  RA: "Ravenna", RC: "Reggio Calabria", RE: "Reggio Emilia", RG: "Ragusa",
  RI: "Rieti", RM: "Roma", RN: "Rimini", RO: "Rovigo", SA: "Salerno",
  SI: "Siena", SO: "Sondrio", SP: "La Spezia", SR: "Siracusa", SS: "Sassari",
  SU: "Sud Sardegna", SV: "Savona", TA: "Taranto", TE: "Teramo", TN: "Trento",
  TO: "Torino", TP: "Trapani", TR: "Terni", TS: "Trieste", TV: "Treviso",
  UD: "Udine", VA: "Varese", VB: "Verbano-Cusio-Ossola", VC: "Vercelli",
  VE: "Venezia", VI: "Vicenza", VR: "Verona", VT: "Viterbo", VV: "Vibo Valentia",
}

export const EVENT_PRESETS = [
  { id: "follow_up", label: "Follow-up", titleTemplate: "Follow-up con {autoscuola}", duration: 30, meet: true },
  { id: "demo", label: "Demo", titleTemplate: "Demo per {autoscuola}", duration: 45, meet: true },
  { id: "chiusura", label: "Chiusura", titleTemplate: "Chiusura con {autoscuola}", duration: 60, meet: true },
  { id: "primo_contatto", label: "Primo contatto", titleTemplate: "Primo contatto con {autoscuola}", duration: 15, meet: false },
  { id: "onboarding", label: "Onboarding", titleTemplate: "Onboarding {autoscuola}", duration: 60, meet: true },
  { id: "custom", label: "Personalizzato", titleTemplate: "", duration: 60, meet: true },
] as const

export type EventPresetId = (typeof EVENT_PRESETS)[number]["id"]

export const SALES_COLORS = [
  "#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6",
  "#EF4444", "#06B6D4", "#F97316", "#14B8A6",
] as const
