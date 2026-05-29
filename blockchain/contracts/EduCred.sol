// SPDX-License-Identifier: MIT
pragma solidity =0.8.20;

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  DEPLOYMENT NOTE — STORAGE LAYOUT                                   ║
// ║  The revokedCertificates mapping is a separate storage slot from    ║
// ║  any pre-v2 deployment. Re-deploy from scratch when upgrading from  ║
// ║  the original single-mapping design, then re-call addIssuer() for   ║
// ║  every institution wallet that was authorized in the old contract.  ║
// ║                                                                      ║
// ║  ABI NOTE — HashStored event                                        ║
// ║  storeHash now emits HashStored(hash, issuer). Update any off-chain  ║
// ║  indexer or event listener that tracks lightweight anchors.         ║
// ╚══════════════════════════════════════════════════════════════════════╝

// Ownable2Step requires the new owner to explicitly accept ownership,
// preventing accidental transfer to an uncontrolled address.
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title EduCred - Authoritative Academic Ledger
 * @notice Single source of truth for certificate authenticity via SHA-256 hashes.
 * @dev Certificates can be anchored via storeHash (lightweight) or storeCertificate
 *      (full record). Revocation permanently invalidates a hash and prevents
 *      re-registration of the same hash.
 */
contract EduCred is Ownable2Step {

    // ─── Custom errors (cheaper than require strings post-0.8.4) ─────────────
    error NotAuthorizedIssuer();
    error ZeroAddress();
    error AlreadyRegistered();
    error AlreadyExists();
    error PermanentlyRevoked();
    error HashNotFound();
    error AlreadyRevoked();
    error NotAuthorizedToRevoke();
    error BatchAlreadySynced();
    error BatchSizeMustBePositive();

    // ─── Primary validity state ───────────────────────────────────────────────
    // True only while the certificate is valid (set false on revocation).
    mapping(bytes32 => bool) public validCertificates;

    // Persists the issuer address for every hash ever anchored (never cleared).
    // Used by revokeHash for certs stored via the lightweight storeHash path.
    mapping(bytes32 => address) public certificateIssuer;

    // Permanent revocation registry — survives clearing of validCertificates.
    // Prevents a revoked hash from being re-registered by any issuer.
    mapping(bytes32 => bool) public revokedCertificates;

    mapping(address => bool) public authorizedIssuers;

    struct CertRecord {
        bytes32 hash;
        address issuer;
        uint256 timestamp;
        uint8 certType;
        bool revoked;
        uint8 revocationReason;
    }

    struct BatchRecord {
        bytes32 merkleRoot;
        address issuer;
        uint256 timestamp;
        uint256 batchSize;
        string batchId;
    }

    mapping(bytes32 => CertRecord) public certificates;
    mapping(bytes32 => BatchRecord) public batches;

    // ─── Events ───────────────────────────────────────────────────────────────
    // HashStored: emitted by the lightweight storeHash path only.
    // CertificateStored: emitted by the full storeCertificate path only.
    // Both events are mutually exclusive — indexers receive exactly one per anchor.
    event HashStored(bytes32 indexed hash, address indexed issuer);
    event CertificateStored(bytes32 indexed hash, address indexed issuer, uint256 timestamp, uint8 certType);
    event BatchRootStored(bytes32 indexed root, address indexed issuer, uint256 batchSize, string batchId);
    event CertificateRevoked(bytes32 indexed hash, address indexed revoker, uint8 reason);
    event IssuerAuthorized(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    constructor() Ownable(msg.sender) {
        authorizedIssuers[msg.sender] = true;
    }

    modifier onlyAuthorizedIssuer() {
        if (!authorizedIssuers[msg.sender]) revert NotAuthorizedIssuer();
        _;
    }

    // ─── Issuer management ────────────────────────────────────────────────────

    /**
     * @notice Authorize a wallet address to anchor certificates.
     * @param issuer The wallet address to authorize. Must not be the zero address.
     */
    function addIssuer(address issuer) public onlyOwner {
        if (issuer == address(0)) revert ZeroAddress();
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    /**
     * @notice Revoke an issuer's anchoring permission.
     * @param issuer The wallet address to deauthorize.
     */
    function removeIssuer(address issuer) public onlyOwner {
        authorizedIssuers[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    // ─── Internal anchoring ───────────────────────────────────────────────────

    /**
     * @dev Shared guard + state-write for both anchoring paths.
     *      Does NOT emit any event — callers emit their canonical event.
     *      Separating this from public functions prevents storeCertificate from
     *      emitting both HashStored and CertificateStored (which was the original
     *      double-event bug described in Issue 14).
     */
    function _anchorHash(bytes32 _hash) internal {
        if (validCertificates[_hash]) revert AlreadyRegistered();
        if (certificateIssuer[_hash] != address(0)) revert AlreadyExists();
        if (revokedCertificates[_hash]) revert PermanentlyRevoked();
        validCertificates[_hash] = true;
        certificateIssuer[_hash] = msg.sender;
    }

    // ─── Certificate anchoring ────────────────────────────────────────────────

    /**
     * @notice Anchor a certificate hash to the blockchain (lightweight path).
     * @dev Emits HashStored so off-chain indexers can track lightweight anchors.
     *      Revocation uses the certificateIssuer mapping for authorization.
     * @param _hash The SHA-256 hash of the certificate binary content.
     */
    function storeHash(bytes32 _hash) public onlyAuthorizedIssuer {
        _anchorHash(_hash);
        emit HashStored(_hash, msg.sender);
    }

    /**
     * @notice Anchor a certificate with full metadata.
     * @dev Emits CertificateStored only — the canonical event for this path.
     *      Does NOT emit HashStored, so indexers receive exactly one event per anchor.
     * @param hash   The SHA-256 hash of the certificate.
     * @param certType  Numeric certificate type code.
     */
    function storeCertificate(bytes32 hash, uint8 certType) public onlyAuthorizedIssuer {
        _anchorHash(hash);
        certificates[hash] = CertRecord({
            hash:             hash,
            issuer:           msg.sender,
            timestamp:        block.timestamp,
            certType:         certType,
            revoked:          false,
            revocationReason: 0
        });
        emit CertificateStored(hash, msg.sender, block.timestamp, certType);
    }

    /**
     * @notice Anchor a Merkle batch root representing multiple certificates.
     * @param merkleRoot SHA-256 Merkle root of the certificate batch.
     * @param batchSize  Number of certificates in the batch. Must be > 0.
     * @param batchId    Off-chain batch identifier.
     */
    function storeBatchRoot(
        bytes32 merkleRoot,
        uint256 batchSize,
        string calldata batchId
    ) public onlyAuthorizedIssuer {
        if (batches[merkleRoot].timestamp != 0) revert BatchAlreadySynced();
        if (batchSize == 0) revert BatchSizeMustBePositive();
        batches[merkleRoot] = BatchRecord({
            merkleRoot: merkleRoot,
            issuer:     msg.sender,
            timestamp:  block.timestamp,
            batchSize:  batchSize,
            batchId:    batchId
        });
        emit BatchRootStored(merkleRoot, msg.sender, batchSize, batchId);
    }

    // ─── Revocation ───────────────────────────────────────────────────────────

    /**
     * @notice Permanently revoke a certificate hash.
     * @dev Authorization is resolved from the CertRecord issuer (storeCertificate
     *      path) or the certificateIssuer mapping (storeHash path), whichever is
     *      populated. The contract owner can always revoke.
     * @param hash       The hash to revoke.
     * @param reasonCode Numeric reason code (application-defined).
     */
    function revokeHash(bytes32 hash, uint8 reasonCode) public {
        // A hash must have been registered (valid OR previously revoked without
        // this fix — check certificateIssuer as the canonical record of existence).
        if (!validCertificates[hash] && certificateIssuer[hash] == address(0)) {
            revert HashNotFound();
        }
        if (revokedCertificates[hash]) revert AlreadyRevoked();

        // Resolve the authoritative issuer from whichever storage path was used.
        address issuer = certificates[hash].issuer != address(0)
            ? certificates[hash].issuer
            : certificateIssuer[hash];

        if (issuer != msg.sender && msg.sender != owner()) revert NotAuthorizedToRevoke();

        // Permanently mark as revoked — this bit is never cleared.
        revokedCertificates[hash] = true;
        // Clear validity so verifyHash returns false immediately.
        validCertificates[hash] = false;

        // Update CertRecord if it exists (storeCertificate path).
        if (certificates[hash].issuer != address(0)) {
            certificates[hash].revoked          = true;
            certificates[hash].revocationReason = reasonCode;
        }

        emit CertificateRevoked(hash, msg.sender, reasonCode);
    }

    // ─── Verification ─────────────────────────────────────────────────────────

    /**
     * @notice Verify a certificate hash.
     * @param _hash The hash to check.
     * @return bool True if the hash is registered AND not revoked.
     */
    function verifyHash(bytes32 _hash) public view returns (bool) {
        return validCertificates[_hash];
    }

    /**
     * @notice Full verification including revocation status and issuer details.
     * @param hash The hash to inspect.
     * @return exists    Whether the hash was ever registered.
     * @return revoked   Whether the certificate has been revoked.
     * @return issuer    The address that anchored the certificate.
     * @return timestamp Block timestamp of anchoring (0 for storeHash-only certs).
     */
    function verifyHashFull(bytes32 hash) public view returns (
        bool exists,
        bool revoked,
        address issuer,
        uint256 timestamp
    ) {
        bool everRegistered = certificateIssuer[hash] != address(0);
        exists    = everRegistered;
        revoked   = revokedCertificates[hash];
        issuer    = certificates[hash].issuer != address(0)
                      ? certificates[hash].issuer
                      : certificateIssuer[hash];
        timestamp = certificates[hash].timestamp;
    }
}
