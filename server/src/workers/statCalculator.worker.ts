// server/src/workers/statCalculator.worker.ts

import { parentPort } from 'worker_threads';

// --- Important: Define Interfaces for Data Transfer ---
// We need plain JavaScript interfaces because Colyseus Schema objects
// cannot be directly cloned and sent between threads easily.

interface BaseStatsData {
  maxHealth: number;
  healthRegen: number;
  damage: number;
  attackSpeed: number;
  projectileSpeed: number;
  moveSpeed: number;
  armor: number;
  critChance: number;
  level: number; // Include level if it affects base stats or calculations
}

interface ItemEffectData {
  stat?: string;
  value?: number;
  type?: string;
  trigger?: string;
  effect?: string;
  interval?: number;
  targets?: number;
  radius?: number;
  // Add other effect properties as needed
}

interface ItemStateData {
  id: string;
  rarity: string;
  stackingType: string;
  effects: ItemEffectData[];
}

interface InputData {
  sessionId: string;
  baseStats: BaseStatsData;
  items: ItemStateData[];
}

interface CalculatedStatsData {
  calculatedMaxHealth: number;
  calculatedHealthRegen: number;
  calculatedDamage: number;
  calculatedAttackSpeed: number;
  calculatedProjectileSpeed: number;
  calculatedMoveSpeed: number;
  calculatedArmor: number;
  calculatedCritChance: number;
}

interface OutputData {
  sessionId: string;
  calculatedStats: CalculatedStatsData;
}

// --- Cache Implementation ---
// Use a Map for caching. Key: combined identifier, Value: calculated stats
const statCache = new Map<string, CalculatedStatsData>();
const MAX_CACHE_SIZE = 500; // Limit cache size to prevent memory leaks

function generateCacheKey(baseStats: BaseStatsData, items: ItemStateData[]): string {
  // Create a stable key: Sort item IDs and combine with level
  const itemIds = items.map(item => item.id).sort().join(',');
  // Include relevant base stats that might change and affect calculation (like level)
  return `level:${baseStats.level}|items:${itemIds}`;
}

// --- The Calculation Logic (Adapted from MyRoom.ts) ---
function calculateStats(baseStats: BaseStatsData, items: ItemStateData[]): CalculatedStatsData {
  // Initialize calculated stats with base values
  const calculatedStats: CalculatedStatsData = {
    calculatedMaxHealth: baseStats.maxHealth,
    calculatedHealthRegen: baseStats.healthRegen,
    calculatedDamage: baseStats.damage,
    calculatedAttackSpeed: baseStats.attackSpeed,
    calculatedProjectileSpeed: baseStats.projectileSpeed,
    calculatedMoveSpeed: baseStats.moveSpeed,
    calculatedArmor: baseStats.armor,
    calculatedCritChance: baseStats.critChance,
  };

  if (items.length === 0) {
    return calculatedStats; // Return base stats if no items
  }

  // --- Apply Item Effects ---
  let maxHealthBonus = 0, healthRegenBonus = 0, damageBonus = 0, attackSpeedBonus = 0;
  let projectileSpeedBonus = 0, moveSpeedBonus = 0, armorBonus = 0, critChanceBonus = 0;

  const itemsCount = items.length;
  for (let itemIndex = 0; itemIndex < itemsCount; itemIndex++) {
    const item = items[itemIndex];
    const effectsCount = item.effects.length;
    for (let effectIndex = 0; effectIndex < effectsCount; effectIndex++) {
      const effect = item.effects[effectIndex];

      if (!effect.stat || effect.stat === "healInstant") continue; // Skip non-stat effects

      const isPercentage = effect.type === "percentage";
      const effectValue = effect.value ?? 0; // Use nullish coalescing for safety

      switch (effect.stat) {
        case "maxHealth":
          maxHealthBonus += isPercentage ? baseStats.maxHealth * effectValue : effectValue;
          break;
        case "healthRegen":
          healthRegenBonus += isPercentage ? baseStats.healthRegen * effectValue : effectValue;
          break;
        case "damage":
          damageBonus += isPercentage ? baseStats.damage * effectValue : effectValue;
          break;
        case "attackSpeed":
          attackSpeedBonus += isPercentage ? baseStats.attackSpeed * effectValue : effectValue;
          break;
        case "projectileSpeed":
          projectileSpeedBonus += isPercentage ? baseStats.projectileSpeed * effectValue : effectValue;
          break;
        case "moveSpeed":
          moveSpeedBonus += isPercentage ? baseStats.moveSpeed * effectValue : effectValue;
          break;
        case "armor":
          armorBonus += isPercentage ? baseStats.armor * effectValue : effectValue;
          break;
        case "critChance":
          critChanceBonus += isPercentage ? baseStats.critChance * effectValue : effectValue;
          break;
        // Add cases for any other direct stat modifications
      }
    }
  }

  // Apply batched bonuses
  calculatedStats.calculatedMaxHealth += maxHealthBonus;
  calculatedStats.calculatedHealthRegen += healthRegenBonus;
  calculatedStats.calculatedDamage += damageBonus;
  calculatedStats.calculatedAttackSpeed += attackSpeedBonus;
  calculatedStats.calculatedProjectileSpeed += projectileSpeedBonus;
  calculatedStats.calculatedMoveSpeed += moveSpeedBonus;
  calculatedStats.calculatedArmor += armorBonus;
  calculatedStats.calculatedCritChance += critChanceBonus;

  // --- Apply Soft Limits/Caps (Copied from MyRoom.ts) ---
  if (calculatedStats.calculatedMoveSpeed > 20) {
    const excess = calculatedStats.calculatedMoveSpeed - 20;
    calculatedStats.calculatedMoveSpeed = 20 + Math.sqrt(excess) * 2;
  }
  if (calculatedStats.calculatedDamage > 150) {
    const excess = calculatedStats.calculatedDamage - 150;
    calculatedStats.calculatedDamage = 150 + Math.sqrt(excess) * 5;
  }
  if (calculatedStats.calculatedAttackSpeed > 4) {
    const excess = calculatedStats.calculatedAttackSpeed - 4;
    calculatedStats.calculatedAttackSpeed = 4 + Math.sqrt(excess) * 0.5;
  }
  if (calculatedStats.calculatedCritChance > 0.75) {
    const excess = calculatedStats.calculatedCritChance - 0.75;
    calculatedStats.calculatedCritChance = 0.75 + Math.sqrt(excess) * 0.1;
    calculatedStats.calculatedCritChance = Math.min(calculatedStats.calculatedCritChance, 0.95);
  }

  // Ensure stats are reasonable numbers
  for (const key in calculatedStats) {
    if (isNaN(calculatedStats[key as keyof CalculatedStatsData])) {
      console.error(`Worker: Calculated NaN for ${key}! Resetting to base.`);
      calculatedStats[key as keyof CalculatedStatsData] = baseStats[key as keyof BaseStatsData] || 0;
    }
  }

  return calculatedStats;
}

// --- Worker Message Handling ---
if (parentPort) {
  parentPort.on('message', (input: InputData) => {
    try {
      const cacheKey = generateCacheKey(input.baseStats, input.items);
      let calculatedStats: CalculatedStatsData;

      // --- Check Cache ---
      if (statCache.has(cacheKey)) {
        calculatedStats = statCache.get(cacheKey)!;
        console.log(`⚡ Worker cache HIT for player ${input.sessionId}`);
      } else {
        // --- Calculate if not in cache ---
        console.log(`🧮 Worker cache MISS for player ${input.sessionId}. Calculating...`);
        calculatedStats = calculateStats(input.baseStats, input.items);

        // --- Store in Cache ---
        // Basic LRU-like eviction if cache is too big
        if (statCache.size >= MAX_CACHE_SIZE) {
          const firstKey = statCache.keys().next().value;
          statCache.delete(firstKey);
        }
        statCache.set(cacheKey, calculatedStats);
      }

      // Send result back to main thread
      const output: OutputData = {
        sessionId: input.sessionId,
        calculatedStats: calculatedStats,
      };
      parentPort.postMessage(output);
    } catch (error) {
      console.error('Error in stat calculation worker:', error);
      // Optional: Send an error message back
      parentPort.postMessage({ sessionId: input.sessionId, error: (error as Error).message });
    }
  });
} else {
  console.error("Worker: parentPort is null. This script must be run as a worker thread.");
}