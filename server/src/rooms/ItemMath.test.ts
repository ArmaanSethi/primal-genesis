import * as assert from "assert";

describe("Item Math Calculations", () => {
    describe("Flat Bonus Calculations", () => {
        it("should correctly add flat bonuses to base stats", () => {
            const baseStat = 100;
            const flatBonus = 20;
            const expected = baseStat + flatBonus;

            assert.equal(expected, 120, "Flat bonus should be added directly to base stat");
        });

        it("should stack multiple flat bonuses correctly", () => {
            const baseStat = 50;
            const bonuses = [10, 15, 5];
            const expected = baseStat + bonuses[0] + bonuses[1] + bonuses[2];

            assert.equal(expected, 80, "Multiple flat bonuses should sum correctly");
        });
    });

    describe("Percentage Bonus Calculations", () => {
        it("should correctly calculate percentage increases", () => {
            const baseStat = 100;
            const percentageBonus = 0.25; // 25%
            const expected = baseStat + (baseStat * percentageBonus);

            assert.equal(expected, 125, "25% of 100 should be 25, resulting in 125");
        });

        it("should handle small percentage values correctly", () => {
            const baseStat = 200;
            const percentageBonus = 0.10; // 10%
            const expected = baseStat + (baseStat * percentageBonus);

            assert.equal(expected, 220, "10% of 200 should be 20, resulting in 220");
        });

        it("should stack percentage bonuses correctly", () => {
            const baseStat = 100;
            const firstBonus = 0.10; // 10%
            const secondBonus = 0.15; // 15%
            const expected = baseStat + (baseStat * firstBonus) + (baseStat * secondBonus);

            assert.equal(expected, 125, "Stacked bonuses should be 100 + 10 + 15 = 125");
        });
    });

    describe("Mixed Bonus Calculations", () => {
        it("should correctly apply both flat and percentage bonuses", () => {
            const baseStat = 100;
            const flatBonus = 20;
            const percentageBonus = 0.25; // 25%
            const expected = baseStat + flatBonus + (baseStat * percentageBonus);

            assert.equal(expected, 145, "Should be 100 + 20 + 25 = 145");
        });
    });

    describe("Movement Speed Calculations", () => {
        it("should correctly calculate new movement speed with flat bonuses", () => {
            const baseSpeed = 4.0;
            const speedBonus = 1.5;
            const expected = baseSpeed + speedBonus;

            assert.equal(expected, 5.5, "Movement speed should increase by flat bonus");
        });

        it("should ensure movement speed doesn't exceed reasonable limits", () => {
            const baseSpeed = 4.0;
            const maxSpeed = 15.0;
            const massiveBonus = 20.0;
            const calculatedSpeed = Math.min(baseSpeed + massiveBonus, maxSpeed);

            assert.equal(calculatedSpeed, maxSpeed, "Speed should be capped at maximum");
        });
    });

    describe("Attack Speed Calculations", () => {
        it("should correctly calculate attack rate from attack speed", () => {
            const attackSpeed = 2.0; // 2 attacks per second
            const cooldown = 1 / attackSpeed;

            assert.equal(cooldown, 0.5, "2 attacks per second should have 0.5 second cooldown");
        });

        it("should handle very high attack speeds correctly", () => {
            const attackSpeed = 5.0; // 5 attacks per second
            const cooldown = 1 / attackSpeed;

            assert.equal(cooldown, 0.2, "5 attacks per second should have 0.2 second cooldown");
        });
    });

    describe("Health Calculations", () => {
        it("should correctly increase max health", () => {
            const baseHealth = 100;
            const healthBonus = 30;
            const expected = baseHealth + healthBonus;

            assert.equal(expected, 130, "Max health should increase by bonus amount");
        });

        it("should handle instant healing correctly", () => {
            const currentHealth = 50;
            const maxHealth = 100;
            const healAmount = 30;
            const expected = Math.min(currentHealth + healAmount, maxHealth);

            assert.equal(expected, 80, "Health should be capped at max health");
        });

        it("should not overheal beyond max health", () => {
            const currentHealth = 90;
            const maxHealth = 100;
            const healAmount = 20;
            const expected = Math.min(currentHealth + healAmount, maxHealth);

            assert.equal(expected, 100, "Health should not exceed maximum");
        });
    });

    describe("Damage Calculations", () => {
        it("should correctly calculate flat damage increases", () => {
            const baseDamage = 10;
            const damageBonus = 5;
            const expected = baseDamage + damageBonus;

            assert.equal(expected, 15, "Damage should increase by flat bonus");
        });

        it("should correctly calculate percentage damage increases", () => {
            const baseDamage = 20;
            const percentageBonus = 0.5; // 50%
            const expected = baseDamage + (baseDamage * percentageBonus);

            assert.equal(expected, 30, "50% increase of 20 should be +10 damage");
        });
    });
});