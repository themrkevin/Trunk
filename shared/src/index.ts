/**
 * @trunk/contracts — shared contracts for Trunk projects.
 *
 * This package is the single source of truth for schemas that cross
 * project/language boundaries (e.g. API payload schemas, message shapes).
 * Non-TypeScript projects match these contracts by test, not by import.
 *
 * Real schemas land with the features that need them. For now this module
 * exists so the package builds and imports resolve.
 */

export const contractsVersion = 1;
