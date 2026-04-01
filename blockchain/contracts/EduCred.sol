// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Anti-Gravity - Authoritative Academic Ledger
 * @dev Single source of truth for certificate authenticity via hashes.
 */
contract EduCred {
    
    // Mapping of SHA-256 certificate hashes to their validity status
    mapping(bytes32 => bool) public validCertificates;

    /**
     * @dev Emitted when a university status/issuance occurs.
     * Useful for real-time dashboard updates.
     */
    event HashStored(bytes32 indexed certificateHash, uint256 timestamp);

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Anchor a certificate hash to the blockchain (University Side)
     * @param _hash The SHA-256 hash of the certificate binary content
     */
    function storeHash(bytes32 _hash) public {
        require(!validCertificates[_hash], "Certificate already registered");
        validCertificates[_hash] = true;
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
}
