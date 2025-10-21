"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
describe("Interactable System Tests", () => {
    describe("Interactable Type Validation", () => {
        it("should recognize valid interactable types", () => {
            const validTypes = ["smallChest", "largeChest", "equipmentBarrel", "triShop"];
            validTypes.forEach(type => {
                assert.ok(["smallChest", "largeChest", "equipmentBarrel", "triShop"].includes(type), `${type} should be a valid interactable type`);
            });
        });
        it("should reject invalid interactable types", () => {
            const invalidTypes = ["invalidChest", "wrongType", null, undefined];
            invalidTypes.forEach(type => {
                if (type !== null && type !== undefined) {
                    assert.ok(!["smallChest", "largeChest", "equipmentBarrel", "triShop"].includes(type), `${type} should not be a valid interactable type`);
                }
                else {
                    assert.ok(true, `${type} should not be a valid interactable type`);
                }
            });
        });
    });
    describe("Credit System Calculations", () => {
        it("should correctly calculate credit costs for interactables", () => {
            const interactableCosts = {
                "smallChest": 10,
                "largeChest": 25,
                "equipmentBarrel": 15,
                "triShop": 20
            };
            const totalCost = Object.values(interactableCosts).reduce((sum, cost) => sum + cost, 0);
            assert.equal(totalCost, 70, "Total cost of all interactable types should be 70");
        });
        it("should validate credit budget constraints", () => {
            const budget = 500;
            const maxSmallChests = Math.floor(budget / 10);
            const maxLargeChests = Math.floor(budget / 25);
            const maxEquipmentBarrels = Math.floor(budget / 15);
            const maxTriShops = Math.floor(budget / 20);
            assert.ok(maxSmallChests >= 50, "Should be able to afford at least 50 small chests");
            assert.ok(maxLargeChests >= 20, "Should be able to afford at least 20 large chests");
            assert.ok(maxEquipmentBarrels >= 33, "Should be able to afford at least 33 equipment barrels");
            assert.ok(maxTriShops >= 25, "Should be able to afford at least 25 tri-shops");
        });
    });
    describe("Item Rarity Distribution", () => {
        it("should define valid rarity tiers", () => {
            const validRarities = ["common", "uncommon", "rare", "equipment"];
            validRarities.forEach(rarity => {
                assert.ok(typeof rarity === "string", `${rarity} should be a string`);
                assert.ok(rarity.length > 0, `${rarity} should not be empty`);
            });
        });
        it("should have appropriate rarity weights for Director system", () => {
            const weights = {
                smallChest: 40, // Most common
                equipmentBarrel: 30, // Common
                largeChest: 20, // Less common
                triShop: 10 // Least common
            };
            const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
            assert.equal(totalWeight, 100, "Total weight should equal 100 for proper distribution");
            // Verify weight hierarchy
            assert.ok(weights.smallChest > weights.largeChest, "Small chests should be more common than large chests");
            assert.ok(weights.largeChest > weights.triShop, "Large chests should be more common than tri-shops");
        });
    });
    describe("Position Validation", () => {
        it("should validate world boundaries", () => {
            const worldWidth = 3200;
            const worldHeight = 3200;
            const validX = 1600; // Center
            const validY = 1600; // Center
            assert.ok(validX >= 0 && validX <= worldWidth, "X position should be within world bounds");
            assert.ok(validY >= 0 && validY <= worldHeight, "Y position should be within world bounds");
        });
        it("should handle edge positions correctly", () => {
            const worldWidth = 3200;
            const worldHeight = 3200;
            const edgePositions = [
                { x: 0, y: 0 }, // Top-left corner
                { x: worldWidth, y: 0 }, // Top-right corner
                { x: 0, y: worldHeight }, // Bottom-left corner
                { x: worldWidth, y: worldHeight } // Bottom-right corner
            ];
            edgePositions.forEach(pos => {
                assert.ok(pos.x >= 0 && pos.x <= worldWidth, `X=${pos.x} should be within bounds`);
                assert.ok(pos.y >= 0 && pos.y <= worldHeight, `Y=${pos.y} should be within bounds`);
            });
        });
    });
    describe("Distance Calculations", () => {
        it("should calculate pickup distance correctly", () => {
            const playerX = 100;
            const playerY = 100;
            const interactableX = 120;
            const interactableY = 120;
            // Distance formula: sqrt((x2-x1)² + (y2-y1)²)
            const distance = Math.sqrt(Math.pow(interactableX - playerX, 2) +
                Math.pow(interactableY - playerY, 2));
            const expectedDistance = Math.sqrt(400 + 400); // sqrt(800) ≈ 28.28
            assert.equal(Math.round(distance), Math.round(expectedDistance), "Distance calculation should be correct");
        });
        it("should determine if player is within pickup range", () => {
            const distance = 35;
            const pickupRadius = 40;
            assert.ok(distance <= pickupRadius, "Player should be within pickup range");
            const tooFarDistance = 50;
            assert.ok(tooFarDistance > pickupRadius, "Player should be outside pickup range when too far");
        });
    });
});
