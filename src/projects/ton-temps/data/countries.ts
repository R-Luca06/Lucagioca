// biome-ignore-all format: fichier généré, la mise en forme vient du script
/*
 * FICHIER GÉNÉRÉ — ne pas éditer à la main.
 * Régénérer : node src/projects/ton-temps/data/generate.mjs
 *
 * Sources :
 *   · Espérance de vie à la naissance — Banque mondiale, SP.DYN.LE00.IN
 *   · Géométrie — Natural Earth 110m via world-atlas (domaine public)
 *   · Codes et noms ISO 3166 — i18n-iso-countries
 *
 * 169 pays, données 2024.
 */

export interface Country {
  /** Code ISO 3166-1 alpha-3. */
  id: string;
  name: string;
  /** Espérance de vie à la naissance, en années. */
  years: number;
  /** Année de la mesure — elle varie d'un pays à l'autre. */
  year: number;
}

export const countries: readonly Country[] = [
  {
    "id": "AFG",
    "name": "Afghanistan",
    "years": 66.3,
    "year": 2024
  },
  {
    "id": "ZAF",
    "name": "Afrique du Sud",
    "years": 66.3,
    "year": 2024
  },
  {
    "id": "ALB",
    "name": "Albanie",
    "years": 79.8,
    "year": 2024
  },
  {
    "id": "DZA",
    "name": "Algérie",
    "years": 76.5,
    "year": 2024
  },
  {
    "id": "DEU",
    "name": "Allemagne",
    "years": 80.8,
    "year": 2024
  },
  {
    "id": "AGO",
    "name": "Angola",
    "years": 64.8,
    "year": 2024
  },
  {
    "id": "SAU",
    "name": "Arabie Saoudite",
    "years": 79,
    "year": 2024
  },
  {
    "id": "ARG",
    "name": "Argentine",
    "years": 77.5,
    "year": 2024
  },
  {
    "id": "ARM",
    "name": "Arménie",
    "years": 78.3,
    "year": 2024
  },
  {
    "id": "AUS",
    "name": "Australie",
    "years": 83.1,
    "year": 2024
  },
  {
    "id": "AUT",
    "name": "Autriche",
    "years": 82,
    "year": 2024
  },
  {
    "id": "AZE",
    "name": "Azerbaïdjan",
    "years": 74.6,
    "year": 2024
  },
  {
    "id": "BHS",
    "name": "Bahamas",
    "years": 74.7,
    "year": 2024
  },
  {
    "id": "BGD",
    "name": "Bangladesh",
    "years": 74.9,
    "year": 2024
  },
  {
    "id": "BEL",
    "name": "Belgique",
    "years": 82.3,
    "year": 2024
  },
  {
    "id": "BLZ",
    "name": "Belize",
    "years": 73.7,
    "year": 2024
  },
  {
    "id": "BEN",
    "name": "Bénin",
    "years": 61,
    "year": 2024
  },
  {
    "id": "BTN",
    "name": "Bhoutan",
    "years": 73.3,
    "year": 2024
  },
  {
    "id": "BLR",
    "name": "Biélorussie",
    "years": 74.4,
    "year": 2024
  },
  {
    "id": "BOL",
    "name": "Bolivie",
    "years": 68.7,
    "year": 2024
  },
  {
    "id": "BIH",
    "name": "Bosnie-Herzégovine",
    "years": 78,
    "year": 2024
  },
  {
    "id": "BWA",
    "name": "Botswana",
    "years": 69.3,
    "year": 2024
  },
  {
    "id": "BRA",
    "name": "Brésil",
    "years": 76,
    "year": 2024
  },
  {
    "id": "BRN",
    "name": "Brunei Darussalam",
    "years": 75.5,
    "year": 2024
  },
  {
    "id": "BGR",
    "name": "Bulgarie",
    "years": 75.8,
    "year": 2024
  },
  {
    "id": "BFA",
    "name": "Burkina Faso",
    "years": 61.3,
    "year": 2024
  },
  {
    "id": "BDI",
    "name": "Burundi",
    "years": 63.8,
    "year": 2024
  },
  {
    "id": "KHM",
    "name": "Cambodge",
    "years": 70.8,
    "year": 2024
  },
  {
    "id": "CMR",
    "name": "Cameroun",
    "years": 64,
    "year": 2024
  },
  {
    "id": "CAN",
    "name": "Canada",
    "years": 82.1,
    "year": 2024
  },
  {
    "id": "CHL",
    "name": "Chili",
    "years": 81.4,
    "year": 2024
  },
  {
    "id": "CHN",
    "name": "Chine",
    "years": 78,
    "year": 2024
  },
  {
    "id": "CYP",
    "name": "Chypre",
    "years": 81.8,
    "year": 2024
  },
  {
    "id": "COL",
    "name": "Colombie",
    "years": 77.9,
    "year": 2024
  },
  {
    "id": "PRK",
    "name": "Corée du Nord",
    "years": 73.7,
    "year": 2024
  },
  {
    "id": "KOR",
    "name": "Corée du Sud",
    "years": 83.6,
    "year": 2024
  },
  {
    "id": "CRI",
    "name": "Costa Rica",
    "years": 81,
    "year": 2024
  },
  {
    "id": "CIV",
    "name": "Côte-d'Ivoire",
    "years": 62.1,
    "year": 2024
  },
  {
    "id": "HRV",
    "name": "Croatie",
    "years": 78.9,
    "year": 2024
  },
  {
    "id": "CUB",
    "name": "Cuba",
    "years": 78.3,
    "year": 2024
  },
  {
    "id": "DNK",
    "name": "Danemark",
    "years": 82.3,
    "year": 2024
  },
  {
    "id": "DJI",
    "name": "Djibouti",
    "years": 66.2,
    "year": 2024
  },
  {
    "id": "EGY",
    "name": "Égypte",
    "years": 71.8,
    "year": 2024
  },
  {
    "id": "SLV",
    "name": "El Salvador",
    "years": 72.3,
    "year": 2024
  },
  {
    "id": "ARE",
    "name": "Émirats Arabes Unis",
    "years": 83.1,
    "year": 2024
  },
  {
    "id": "ECU",
    "name": "Équateur",
    "years": 77.6,
    "year": 2024
  },
  {
    "id": "ERI",
    "name": "Érythrée",
    "years": 68.9,
    "year": 2024
  },
  {
    "id": "ESP",
    "name": "Espagne",
    "years": 83.9,
    "year": 2024
  },
  {
    "id": "EST",
    "name": "Estonie",
    "years": 79.3,
    "year": 2024
  },
  {
    "id": "USA",
    "name": "États-Unis d'Amérique",
    "years": 78.9,
    "year": 2024
  },
  {
    "id": "ETH",
    "name": "Éthiopie",
    "years": 67.6,
    "year": 2024
  },
  {
    "id": "FJI",
    "name": "Fidji",
    "years": 67.5,
    "year": 2024
  },
  {
    "id": "FIN",
    "name": "Finlande",
    "years": 82.3,
    "year": 2024
  },
  {
    "id": "FRA",
    "name": "France",
    "years": 83,
    "year": 2024
  },
  {
    "id": "GAB",
    "name": "Gabon",
    "years": 68.5,
    "year": 2024
  },
  {
    "id": "GMB",
    "name": "Gambie",
    "years": 66.1,
    "year": 2024
  },
  {
    "id": "GEO",
    "name": "Géorgie",
    "years": 74.7,
    "year": 2024
  },
  {
    "id": "GHA",
    "name": "Ghana",
    "years": 65.7,
    "year": 2024
  },
  {
    "id": "GRC",
    "name": "Grèce",
    "years": 81.8,
    "year": 2024
  },
  {
    "id": "GRL",
    "name": "Groenland",
    "years": 70.3,
    "year": 2024
  },
  {
    "id": "GTM",
    "name": "Guatemala",
    "years": 72.7,
    "year": 2024
  },
  {
    "id": "GIN",
    "name": "Guinée",
    "years": 60.9,
    "year": 2024
  },
  {
    "id": "GNQ",
    "name": "Guinée équatoriale",
    "years": 63.9,
    "year": 2024
  },
  {
    "id": "GNB",
    "name": "Guinée-Bissau",
    "years": 64.3,
    "year": 2024
  },
  {
    "id": "GUY",
    "name": "Guyana",
    "years": 70.3,
    "year": 2024
  },
  {
    "id": "HTI",
    "name": "Haïti",
    "years": 65.1,
    "year": 2024
  },
  {
    "id": "HND",
    "name": "Honduras",
    "years": 73,
    "year": 2024
  },
  {
    "id": "HUN",
    "name": "Hongrie",
    "years": 76.7,
    "year": 2024
  },
  {
    "id": "SLB",
    "name": "Îles Salomon",
    "years": 70.7,
    "year": 2024
  },
  {
    "id": "IND",
    "name": "Inde",
    "years": 72.2,
    "year": 2024
  },
  {
    "id": "IDN",
    "name": "Indonésie",
    "years": 71.3,
    "year": 2024
  },
  {
    "id": "IRQ",
    "name": "Irak",
    "years": 72.4,
    "year": 2024
  },
  {
    "id": "IRN",
    "name": "Iran",
    "years": 77.9,
    "year": 2024
  },
  {
    "id": "IRL",
    "name": "Irlande",
    "years": 83,
    "year": 2024
  },
  {
    "id": "ISL",
    "name": "Islande",
    "years": 82.8,
    "year": 2024
  },
  {
    "id": "ISR",
    "name": "Israël",
    "years": 83.2,
    "year": 2024
  },
  {
    "id": "ITA",
    "name": "Italie",
    "years": 84,
    "year": 2024
  },
  {
    "id": "JAM",
    "name": "Jamaïque",
    "years": 71.6,
    "year": 2024
  },
  {
    "id": "JPN",
    "name": "Japon",
    "years": 84,
    "year": 2024
  },
  {
    "id": "JOR",
    "name": "Jordanie",
    "years": 78,
    "year": 2024
  },
  {
    "id": "KAZ",
    "name": "Kazakhstan",
    "years": 74.5,
    "year": 2024
  },
  {
    "id": "KEN",
    "name": "Kenya",
    "years": 63.8,
    "year": 2024
  },
  {
    "id": "KGZ",
    "name": "Kirghizistan",
    "years": 72.4,
    "year": 2024
  },
  {
    "id": "KWT",
    "name": "Koweït",
    "years": 84.6,
    "year": 2024
  },
  {
    "id": "LAO",
    "name": "Laos",
    "years": 69.2,
    "year": 2024
  },
  {
    "id": "LSO",
    "name": "Lesotho",
    "years": 57.8,
    "year": 2024
  },
  {
    "id": "LVA",
    "name": "Lettonie",
    "years": 76.4,
    "year": 2024
  },
  {
    "id": "LBN",
    "name": "Liban",
    "years": 77.9,
    "year": 2024
  },
  {
    "id": "LBR",
    "name": "Libéria",
    "years": 62.3,
    "year": 2024
  },
  {
    "id": "LBY",
    "name": "Libye",
    "years": 71.1,
    "year": 2024
  },
  {
    "id": "LTU",
    "name": "Lituanie",
    "years": 77.2,
    "year": 2024
  },
  {
    "id": "LUX",
    "name": "Luxembourg",
    "years": 83.2,
    "year": 2024
  },
  {
    "id": "MKD",
    "name": "Macédoine du Nord",
    "years": 76.6,
    "year": 2024
  },
  {
    "id": "MDG",
    "name": "Madagascar",
    "years": 63.8,
    "year": 2024
  },
  {
    "id": "MYS",
    "name": "Malaisie",
    "years": 76.8,
    "year": 2024
  },
  {
    "id": "MWI",
    "name": "Malawi",
    "years": 67.6,
    "year": 2024
  },
  {
    "id": "MLI",
    "name": "Mali",
    "years": 60.7,
    "year": 2024
  },
  {
    "id": "MAR",
    "name": "Maroc",
    "years": 75.5,
    "year": 2024
  },
  {
    "id": "MRT",
    "name": "Mauritanie",
    "years": 68.7,
    "year": 2024
  },
  {
    "id": "MEX",
    "name": "Mexique",
    "years": 75.3,
    "year": 2024
  },
  {
    "id": "MDA",
    "name": "Moldavie",
    "years": 71.3,
    "year": 2024
  },
  {
    "id": "MNG",
    "name": "Mongolie",
    "years": 72.4,
    "year": 2024
  },
  {
    "id": "MNE",
    "name": "Monténégro",
    "years": 77.9,
    "year": 2024
  },
  {
    "id": "MOZ",
    "name": "Mozambique",
    "years": 63.8,
    "year": 2024
  },
  {
    "id": "MMR",
    "name": "Myanmar",
    "years": 67.1,
    "year": 2024
  },
  {
    "id": "NAM",
    "name": "Namibie",
    "years": 67.5,
    "year": 2024
  },
  {
    "id": "NPL",
    "name": "Népal",
    "years": 70.6,
    "year": 2024
  },
  {
    "id": "NIC",
    "name": "Nicaragua",
    "years": 75.1,
    "year": 2024
  },
  {
    "id": "NER",
    "name": "Niger",
    "years": 61.4,
    "year": 2024
  },
  {
    "id": "NGA",
    "name": "Nigéria",
    "years": 54.6,
    "year": 2024
  },
  {
    "id": "NOR",
    "name": "Norvège",
    "years": 83.2,
    "year": 2024
  },
  {
    "id": "NCL",
    "name": "Nouvelle-Calédonie",
    "years": 78.9,
    "year": 2024
  },
  {
    "id": "NZL",
    "name": "Nouvelle-Zélande",
    "years": 82,
    "year": 2024
  },
  {
    "id": "OMN",
    "name": "Oman",
    "years": 80.2,
    "year": 2024
  },
  {
    "id": "UGA",
    "name": "Ouganda",
    "years": 68.5,
    "year": 2024
  },
  {
    "id": "UZB",
    "name": "Ouzbékistan",
    "years": 72.5,
    "year": 2024
  },
  {
    "id": "PAK",
    "name": "Pakistan",
    "years": 67.8,
    "year": 2024
  },
  {
    "id": "PSE",
    "name": "Palestine",
    "years": 69.2,
    "year": 2024
  },
  {
    "id": "PAN",
    "name": "Panama",
    "years": 79.8,
    "year": 2024
  },
  {
    "id": "PNG",
    "name": "Papouasie-Nouvelle-Guinée",
    "years": 66.3,
    "year": 2024
  },
  {
    "id": "PRY",
    "name": "Paraguay",
    "years": 74,
    "year": 2024
  },
  {
    "id": "NLD",
    "name": "Pays-Bas",
    "years": 82,
    "year": 2024
  },
  {
    "id": "PER",
    "name": "Pérou",
    "years": 77.9,
    "year": 2024
  },
  {
    "id": "PHL",
    "name": "Philippines",
    "years": 69.9,
    "year": 2024
  },
  {
    "id": "POL",
    "name": "Pologne",
    "years": 78.4,
    "year": 2024
  },
  {
    "id": "PRI",
    "name": "Porto Rico",
    "years": 81.9,
    "year": 2024
  },
  {
    "id": "PRT",
    "name": "Portugal",
    "years": 82.4,
    "year": 2024
  },
  {
    "id": "QAT",
    "name": "Qatar",
    "years": 82.5,
    "year": 2024
  },
  {
    "id": "CAF",
    "name": "République Centrafricaine",
    "years": 57.7,
    "year": 2024
  },
  {
    "id": "COD",
    "name": "République démocratique du Congo",
    "years": 62.1,
    "year": 2024
  },
  {
    "id": "DOM",
    "name": "République Dominicaine",
    "years": 73.9,
    "year": 2024
  },
  {
    "id": "COG",
    "name": "République du Congo",
    "years": 66,
    "year": 2024
  },
  {
    "id": "CZE",
    "name": "République Tchèque",
    "years": 80,
    "year": 2024
  },
  {
    "id": "TZA",
    "name": "République unie de Tanzanie",
    "years": 67.2,
    "year": 2024
  },
  {
    "id": "ROU",
    "name": "Roumanie",
    "years": 76.5,
    "year": 2024
  },
  {
    "id": "SWZ",
    "name": "Royaume d'Eswatini",
    "years": 64.3,
    "year": 2024
  },
  {
    "id": "GBR",
    "name": "Royaume-Uni",
    "years": 81.4,
    "year": 2024
  },
  {
    "id": "RUS",
    "name": "Russie",
    "years": 73.4,
    "year": 2024
  },
  {
    "id": "RWA",
    "name": "Rwanda",
    "years": 68,
    "year": 2024
  },
  {
    "id": "SEN",
    "name": "Sénégal",
    "years": 68.9,
    "year": 2024
  },
  {
    "id": "SRB",
    "name": "Serbie",
    "years": 76,
    "year": 2024
  },
  {
    "id": "SLE",
    "name": "Sierra Leone",
    "years": 62,
    "year": 2024
  },
  {
    "id": "SVK",
    "name": "Slovaquie",
    "years": 78.4,
    "year": 2024
  },
  {
    "id": "SVN",
    "name": "Slovénie",
    "years": 82.3,
    "year": 2024
  },
  {
    "id": "SOM",
    "name": "Somalie",
    "years": 59,
    "year": 2024
  },
  {
    "id": "SDN",
    "name": "Soudan",
    "years": 66.5,
    "year": 2024
  },
  {
    "id": "SSD",
    "name": "Soudan du Sud",
    "years": 57.7,
    "year": 2024
  },
  {
    "id": "LKA",
    "name": "Sri Lanka",
    "years": 77.7,
    "year": 2024
  },
  {
    "id": "SWE",
    "name": "Suède",
    "years": 84.1,
    "year": 2024
  },
  {
    "id": "CHE",
    "name": "Suisse",
    "years": 84.4,
    "year": 2024
  },
  {
    "id": "SUR",
    "name": "Suriname",
    "years": 73.8,
    "year": 2024
  },
  {
    "id": "SYR",
    "name": "Syrie",
    "years": 72.6,
    "year": 2024
  },
  {
    "id": "TJK",
    "name": "Tadjikistan",
    "years": 71.9,
    "year": 2024
  },
  {
    "id": "TCD",
    "name": "Tchad",
    "years": 55.2,
    "year": 2024
  },
  {
    "id": "THA",
    "name": "Thaïlande",
    "years": 76.6,
    "year": 2024
  },
  {
    "id": "TLS",
    "name": "Timor-Leste",
    "years": 67.9,
    "year": 2024
  },
  {
    "id": "TGO",
    "name": "Togo",
    "years": 62.9,
    "year": 2024
  },
  {
    "id": "TTO",
    "name": "Trinité-et-Tobago",
    "years": 73.6,
    "year": 2024
  },
  {
    "id": "TUN",
    "name": "Tunisie",
    "years": 76.7,
    "year": 2024
  },
  {
    "id": "TKM",
    "name": "Turkménistan",
    "years": 70.2,
    "year": 2024
  },
  {
    "id": "TUR",
    "name": "Turquie",
    "years": 77.4,
    "year": 2024
  },
  {
    "id": "UKR",
    "name": "Ukraine",
    "years": 74.7,
    "year": 2024
  },
  {
    "id": "URY",
    "name": "Uruguay",
    "years": 78.3,
    "year": 2024
  },
  {
    "id": "VUT",
    "name": "Vanuatu",
    "years": 71.7,
    "year": 2024
  },
  {
    "id": "VEN",
    "name": "Venezuela",
    "years": 72.7,
    "year": 2024
  },
  {
    "id": "VNM",
    "name": "Vietnam",
    "years": 74.7,
    "year": 2024
  },
  {
    "id": "YEM",
    "name": "Yémen",
    "years": 69.4,
    "year": 2024
  },
  {
    "id": "ZMB",
    "name": "Zambie",
    "years": 66.5,
    "year": 2024
  },
  {
    "id": "ZWE",
    "name": "Zimbabwe",
    "years": 63.1,
    "year": 2024
  }
];

/** Moyenne mondiale, utilisée comme repère dans l'écran final. */
export const worldAverage = 73.5;

export const dataYear = 2024;

export const byId = new Map(countries.map((c) => [c.id, c]));
