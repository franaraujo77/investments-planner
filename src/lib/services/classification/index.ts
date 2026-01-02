/**
 * Classification Services Module
 *
 * Story 5.7: Industry/Sector Classification Cache
 * Story 5.8: Asset Type Classification Cache
 *
 * Exports all classification-related services and utilities.
 *
 * @module @/lib/services/classification
 */

// GICS Mapping Service (Story 5.7)
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

// Classification Cache (Story 5.7)
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

// Classification Service (Story 5.7)
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

// Asset Type Mapping Service (Story 5.8)
export {
  mapGeminiToCanonicalType,
  inferJurisdiction,
  mapAssetToTypeAndJurisdiction,
  getSupportedJurisdictions,
  getCanonicalAssetTypes,
  type CanonicalTypeMapping,
  type JurisdictionCode,
  type JurisdictionInference,
  type FullAssetTypeMapping,
} from "./asset-type-mapping-service";

// Asset Type Cache (Story 5.8)
export {
  getAssetTypeClassification,
  getLinkedAssets,
  getAssetsByType,
  getLocalizedTypeName,
  storeAssetTypeClassification,
  storeAssetAlias,
  getAllAssetTypes,
  getAllJurisdictions,
  getLocalizationsForJurisdiction,
  isAssetTypeReferenceDataSeeded,
  type FullTypeClassification,
  type LinkedAsset,
  type AssetTypeCacheResult,
} from "./asset-type-cache";

// Asset Type Service (Story 5.8)
export {
  getAssetType,
  classifyAsset as classifyAssetType,
  classifyAssetsFromFundamentals,
  getAssetsByIsin,
  getSymbolsNeedingTypeRefresh,
  isCanonicalAssetType,
  isJurisdictionCode,
  type AssetTypeClassificationResult,
  type BatchAssetTypeClassificationResult,
  type AssetTypeQueryOptions,
  type FullAssetTypeInfo,
} from "./asset-type-service";
