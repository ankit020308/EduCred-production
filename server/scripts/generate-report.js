import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const outputPath = '/Users/minorproject/MINOR/EduCred/scratch/EduCred_System_Code_Snippets.pdf';

const doc = new PDFDocument({
  size: 'A4',
  margin: 40,
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Title
doc.font('Helvetica-Bold').fontSize(24).fillColor('#1a1a2e').text('EduCred — Core System Code Snippets', { align: 'center' });
doc.moveDown(2);

// Function to write a snippet
function addSnippet(title, codeText) {
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#c9a227').text(title);
  doc.moveDown(0.5);
  
  doc.font('Courier').fontSize(9).fillColor('#333333').text(codeText, {
    width: 515,
    align: 'left',
  });
  doc.moveDown(2);
}

// Snippet 1
const contractCode = '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\nimport "@openzeppelin/contracts/access/Ownable.sol";\n\ncontract EduCred is Ownable {\n    mapping(bytes32 => bool) public validCertificates;\n    mapping(bytes32 => address) public certificateIssuer;\n    mapping(address => bool) public authorizedIssuers;\n\n    function storeHash(bytes32 _hash) public {\n        require(authorizedIssuers[msg.sender], "Not authorized issuer");\n        require(!validCertificates[_hash], "Certificate already registered");\n        require(certificateIssuer[_hash] == address(0), "Certificate already exists");\n        \n        validCertificates[_hash] = true;\n        certificateIssuer[_hash] = msg.sender;\n    }\n\n    function verifyHash(bytes32 _hash) public view returns (bool) {\n        return validCertificates[_hash];\n    }\n}';

addSnippet('1. Blockchain Layer — EduCred.sol', contractCode);

// Snippet 2
const hashingCode = 'import crypto from \'crypto\';\n\nexport function getDeterministicJSON(obj) {\n  if (obj === null || typeof obj !== \'object\') {\n    return JSON.stringify(obj);\n  }\n  if (Array.isArray(obj)) {\n    return \'[\' + obj.map(getDeterministicJSON).join(\',\') + \']\';\n  }\n  const sortedKeys = Object.keys(obj).sort();\n  const result = {};\n  sortedKeys.forEach(key => { result[key] = obj[key]; });\n  return \'{\' + sortedKeys.map(key => \'"\' + key + \'":\' + getDeterministicJSON(obj[key])).join(\',\') + \'}\';\n}\n\nexport function generateBinaryHash(buffer) {\n  if (!Buffer.isBuffer(buffer)) {\n    buffer = Buffer.from(buffer);\n  }\n  return crypto.createHash(\'sha256\').update(buffer).digest(\'hex\');\n}';

addSnippet('2. Hashing Engine — hashing.js', hashingCode);

// Snippet 3
const blockchainCode = 'import { ethers } from \'ethers\';\n\nfunction normalizeHash(certificateHash) {\n  const prefixed = certificateHash.startsWith(\'0x\') ? certificateHash : \'0x\' + certificateHash;\n  if (!/^0x[0-9a-fA-F]{64}$/.test(prefixed)) {\n    throw new Error(\'Certificate hash must be a 32-byte SHA-256 hex string.\');\n  }\n  return prefixed;\n}\n\nexport async function storeHashOnChain(certificateHash) {\n  const contract = requireServerSignerContract();\n  const tx = await contract.storeHash(normalizeHash(certificateHash));\n  return await tx.wait(1);\n}';

addSnippet('3. Web3 Integration Layer — blockchain.js', blockchainCode);

// Snippet 4
const verifyCode = 'export const verifyCertificate = async (req, res) => {\n  try {\n    const { certificateId } = req.body;\n    const file = req.file;\n    let hashToVerify = \'\';\n    let metadata = null;\n\n    if (file) {\n      const fileBuffer = fs.readFileSync(file.path);\n      const binaryHash = generateBinaryHash(fileBuffer);\n      metadata = await Registry.findOne(\'certificates\', { pdfHash: binaryHash });\n      hashToVerify = metadata.certificateHash;\n    }\n\n    const onChainDetails = await verifyHashDetailsOnChain(hashToVerify);\n    res.json({ valid: true, proof: onChainDetails, document: metadata });\n  } catch (err) {\n    res.status(500).json({ error: \'Network consensus failure.\' });\n  }\n};';

addSnippet('4. Verification APIs — certificateController.js', verifyCode);

doc.end();

stream.on('finish', () => {
  console.log('PDF created successfully at: ' + outputPath);
});
