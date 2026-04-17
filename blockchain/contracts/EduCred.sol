// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EduCred - Authoritative Academic Ledger
 * @dev Single source of truth for certificate authenticity via hashes.
 */
contract EduCred is Ownable {
    
    // Mapping of SHA-256 certificate hashes to their validity status
    mapping(bytes32 => bool) public validCertificates;
    // Explicitly binding certificate hash to University Wallet as per audit
    mapping(bytes32 => address) public certificateIssuer;
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

    /**
     * @dev Emitted when a university status/issuance occurs.
     * Useful for real-time dashboard updates.
     */
    event HashStored(bytes32 indexed certificateHash, uint256 timestamp);
    
    event CertificateStored(bytes32 indexed hash, address indexed issuer, uint256 timestamp, uint8 certType);
    event BatchRootStored(bytes32 indexed root, address indexed issuer, uint256 batchSize, string batchId);
    event CertificateRevoked(bytes32 indexed hash, address indexed revoker, uint8 reason);
    event IssuerAuthorized(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    constructor() Ownable(msg.sender) {
        authorizedIssuers[msg.sender] = true;
    }

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Not authorized issuer");
        _;
    }

    function addIssuer(address issuer) public onlyOwner {
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    function removeIssuer(address issuer) public onlyOwner {
        authorizedIssuers[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    /**
     * @notice Anchor a certificate hash to the blockchain (University Side)
     * @param _hash The SHA-256 hash of the certificate binary content
     */
    function storeHash(bytes32 _hash) public {
        require(authorizedIssuers[msg.sender], "Not authorized issuer");
        require(!validCertificates[_hash], "Certificate already registered");
        require(certificateIssuer[_hash] == address(0), "Certificate already exists");
        
        validCertificates[_hash] = true;
        certificateIssuer[_hash] = msg.sender;
        
        emit HashStored(_hash, block.timestamp);
    }

    /**
     * @notice Verify a certificate hash against the ledger (Verifier Side)
     * @param _hash The hash to verify
     * @return bool True if authentic, false if not found or tampered
     */
    function verifyHash(bytes32 _hash) public view returns (bool) {
        return validCertificates[_hash];
    }

    function storeCertificate(bytes32 hash, uint8 certType) public onlyAuthorizedIssuer {
        storeHash(hash);
        certificates[hash] = CertRecord({
            hash: hash,
            issuer: msg.sender,
            timestamp: block.timestamp,
            certType: certType,
            revoked: false,
            revocationReason: 0
        });
        emit CertificateStored(hash, msg.sender, block.timestamp, certType);
    }

    function storeBatchRoot(bytes32 merkleRoot, uint256 batchSize, string memory batchId) public onlyAuthorizedIssuer {
        require(batches[merkleRoot].timestamp == 0, "Batch already synced");
        batches[merkleRoot] = BatchRecord({
            merkleRoot: merkleRoot,
            issuer: msg.sender,
            timestamp: block.timestamp,
            batchSize: batchSize,
            batchId: batchId
        });
        emit BatchRootStored(merkleRoot, msg.sender, batchSize, batchId);
    }

    function revokeHash(bytes32 hash, uint8 reasonCode) public {
        require(validCertificates[hash], "Hash not found");
        require(certificates[hash].issuer == msg.sender || msg.sender == owner(), "Not authorized to revoke");
        require(!certificates[hash].revoked, "Already revoked");
        
        certificates[hash].revoked = true;
        certificates[hash].revocationReason = reasonCode;
        
        emit CertificateRevoked(hash, msg.sender, reasonCode);
    }

    function verifyHashFull(bytes32 hash) public view returns (bool exists, bool revoked, address issuer, uint256 timestamp) {
        exists = validCertificates[hash];
        CertRecord memory cert = certificates[hash];
        revoked = cert.revoked;
        issuer = cert.issuer;
        timestamp = cert.timestamp;
        return (exists, revoked, issuer, timestamp);
    }
}
