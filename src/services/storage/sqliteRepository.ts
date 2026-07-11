import { Platform } from "react-native";

import { opportunities } from "../../data/seed";
import { Opportunity } from "../../types/career";

type SQLiteDatabase = {
  execSync: (source: string) => void;
  getFirstSync: <T>(source: string, ...params: any[]) => T | null;
  getAllSync: <T>(source: string, ...params: any[]) => T[];
  runSync: (source: string, ...params: any[]) => void;
};

let db: SQLiteDatabase | null = null;
let memoryOpportunities = [...opportunities];

async function getDatabase() {
  if (Platform.OS === "web") {
    return null;
  }

  if (!db) {
    const SQLite = await import("expo-sqlite");
    db = SQLite.openDatabaseSync("career-transition-os.db");
  }

  return db;
}

export async function initializeDatabase() {
  const database = await getDatabase();

  if (!database) {
    return;
  }

  database.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY NOT NULL,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      stage TEXT NOT NULL,
      source TEXT NOT NULL,
      location TEXT NOT NULL,
      compensation TEXT,
      nextAction TEXT NOT NULL,
      followUpDueAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      resumeVersionId TEXT,
      coverLetterId TEXT,
      matchScore INTEGER NOT NULL,
      contactName TEXT,
      contactChannel TEXT,
      notes TEXT NOT NULL
    );
  `);

  const count = database.getFirstSync<{ count: number }>("SELECT COUNT(*) as count FROM opportunities");

  if (count?.count === 0) {
    opportunities.forEach((opportunity) => saveOpportunity(opportunity));
  }
}

export function listOpportunities(): Opportunity[] {
  if (!db) {
    return memoryOpportunities;
  }

  return db.getAllSync<Opportunity>("SELECT * FROM opportunities ORDER BY updatedAt DESC");
}

export function getOpportunity(id: string): Opportunity | null {
  if (!db) {
    return memoryOpportunities.find((opportunity) => opportunity.id === id) ?? null;
  }

  return db.getFirstSync<Opportunity>("SELECT * FROM opportunities WHERE id = ?", id) ?? null;
}

export function saveOpportunity(opportunity: Opportunity) {
  if (!db) {
    memoryOpportunities = [
      opportunity,
      ...memoryOpportunities.filter((existing) => existing.id !== opportunity.id)
    ];
    return;
  }

  db.runSync(
    `INSERT OR REPLACE INTO opportunities (
      id,
      company,
      role,
      stage,
      source,
      location,
      compensation,
      nextAction,
      followUpDueAt,
      createdAt,
      updatedAt,
      resumeVersionId,
      coverLetterId,
      matchScore,
      contactName,
      contactChannel,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    opportunity.id,
    opportunity.company,
    opportunity.role,
    opportunity.stage,
    opportunity.source,
    opportunity.location,
    opportunity.compensation ?? null,
    opportunity.nextAction,
    opportunity.followUpDueAt ?? null,
    opportunity.createdAt,
    opportunity.updatedAt,
    opportunity.resumeVersionId ?? null,
    opportunity.coverLetterId ?? null,
    opportunity.matchScore,
    opportunity.contactName ?? null,
    opportunity.contactChannel ?? null,
    opportunity.notes
  );
}

export function updateOpportunityStage(id: string, stage: Opportunity["stage"]) {
  if (!db) {
    memoryOpportunities = memoryOpportunities.map((opportunity) =>
      opportunity.id === id ? { ...opportunity, stage, updatedAt: new Date().toISOString() } : opportunity
    );
    return;
  }

  db.runSync("UPDATE opportunities SET stage = ?, updatedAt = ? WHERE id = ?", stage, new Date().toISOString(), id);
}
