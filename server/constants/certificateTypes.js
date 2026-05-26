/**
 * @module constants/certificateTypes
 * @description Single source of truth for certificate type → on-chain integer mapping.
 *
 * This constant is consumed by:
 *  - certificateController.js  (issuance + batch)
 *  - services/anchoringService.js (background worker logic)
 *
 * DO NOT duplicate this map anywhere else. Import from here.
 */
export const CERTIFICATE_TYPE_CODES = Object.freeze({
  'Degree Certificate':         0,
  'Provisional Certificate':    1,
  'Consolidated Marks Sheet':   2,
  'Migration Certificate':      3,
  'Transfer Certificate':       4,
  'Character Certificate':      5,
});
