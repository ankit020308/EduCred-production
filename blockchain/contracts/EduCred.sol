// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EduCred - Anonymous Academic Ledger
 * @dev Implements Verifiable Credential flow with anonymous application tracking.
 */
contract EduCred {
    struct ApplicationRecord {
        uint256 id;
        bytes32 studentHash;
        address targetUniversity;
        uint8 status; // 0=Pending, 1=Accepted, 2=Rejected
        uint256 timestamp;
    }

    mapping(bytes32 => bool) public validCertificates;
    ApplicationRecord[] public applications;
    
    event CertificateIssued(bytes32 indexed certificateHash);
    event ApplicationStatusUpdated(uint256 indexed id, uint8 status);

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    /// @notice Anchor a certificate hash to the blockchain
    function issueCertificate(bytes32 _hash) public {
        require(!validCertificates[_hash], "Certificate already issued");
        validCertificates[_hash] = true;
        emit CertificateIssued(_hash);
    }

    /// @notice Public verification against the ledger
    function verifyCertificate(bytes32 _hash) public view returns (bool) {
        return validCertificates[_hash];
    }

    /// @notice Anonymously log an application event
    function submitApplication(bytes32 _studentHash) public {
        require(validCertificates[_studentHash], "Cannot apply with invalid certificate");
        uint256 id = applications.length;
        applications.push(ApplicationRecord({
            id: id,
            studentHash: _studentHash,
            targetUniversity: msg.sender, // The university receiving/processing the app
            status: 0,
            timestamp: block.timestamp
        }));
        emit ApplicationStatusUpdated(id, 0);
    }

    /// @notice Update application status (Verifiable Event for Graphs)
    function updateApplicationStatus(uint256 _id, uint8 _status) public {
        require(_id < applications.length, "Invalid application ID");
        require(_status <= 2, "Invalid status (0=P, 1=A, 2=R)");
        
        applications[_id].status = _status;
        emit ApplicationStatusUpdated(_id, _status);
    }

    function getApplicationsCount() public view returns (uint256) {
        return applications.length;
    }
}
