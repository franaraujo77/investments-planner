/**
 * Classification Services Module
 *
 * Story 5.7: Industry/Sector Classification Cache
 *
 * Exports all classification-related services and utilities.
 *
 * @module @/lib/services/classification
 */

// GICS Mapping Service
export {
  getSectorById,
  getSectorByName,
  getIndustryGroupById,
  getIndustryGroupByName,
  getIndustryById,
  getIndustryByName,
  getHierarchyByIndustryId,
  getIndustriesBySector,
  getIndustriesByGroup,
  findMatchingSector,
  findMatchingIndustry,
  mapToGics,
  deriveGicsHierarchy,
  type GicsHierarchy,
  type GicsMappingResult,
} from "./gics-mapping-service";

// Classification Cache
export {
  getClassification,
  getClassifications,
  storeClassification,
  storeClassifications,
  seedGicsReferenceData,
  isGicsReferenceDataSeeded,
  getAllSectors,
  getAllIndustryGroups,
  getAllIndustries,
  type EnrichedClassification,
  type ClassificationCacheResult,
} from "./classification-cache";

// Classification Service
export {
  getAssetClassification,
  getAssetClassifications,
  classifyAsset,
  classifyAssets,
  processClassificationsFromFundamentals,
  getGicsHierarchy,
  getSymbolsNeedingRefresh,
  fundamentalsToClassification,
  createClassificationFromMapping,
  type ClassificationQueryResult,
  type BatchClassificationResult,
} from "./classification-service";
