/** Catalogue statique : voitures, circuit, quêtes (client + serveur alignés). */

export type RacingVehicleDef = {
  slug: string;
  name: string;
  price: number;
  maxSpeed: number;
  accel: number;
  brake: number;
  steer: number;
  grip: number;
};

export const RACING_VEHICLES: RacingVehicleDef[] = [
  { slug: "bolt", name: "Bolt", price: 0, maxSpeed: 0.048, accel: 0.00085, brake: 0.00135, steer: 0.042, grip: 0.9 },
  { slug: "runner", name: "Runner", price: 650, maxSpeed: 0.054, accel: 0.0011, brake: 0.0015, steer: 0.048, grip: 0.91 },
  { slug: "phantom", name: "Phantom", price: 1600, maxSpeed: 0.06, accel: 0.001, brake: 0.00145, steer: 0.052, grip: 0.88 },
];

export const RACING_TRACKS = [{ id: "bay", name: "Baie serpentine", laps: 3 }];

export type RacingQuestDef = {
  id: string;
  title: string;
  description: string;
  rewardCredits: number;
};

export const RACING_QUESTS: RacingQuestDef[] = [
  { id: "first_finish", title: "Première arrivée", description: "Termine une course (3 tours).", rewardCredits: 200 },
  { id: "grind_800", title: "Pilote confirmé", description: "Gagne au total 800 crédits en course.", rewardCredits: 150 },
  { id: "own_runner", title: "Collectionneur", description: "Possède la voiture Runner.", rewardCredits: 100 },
];

export function vehicleBySlug(slug: string): RacingVehicleDef | undefined {
  return RACING_VEHICLES.find((v) => v.slug === slug);
}
