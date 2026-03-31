import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractData from '../contracts/EduCred.json';

const BlockchainContext = createContext(null);

export function BlockchainProvider({ children }) {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Connect to the local Hardhat node
        const rpcUrl = "http://127.0.0.1:8545";
        const newProvider = new ethers.JsonRpcProvider(rpcUrl);
        
        // We use a read-only contract instance for global events
        // If specific components need to sign, they can use the user's wallet
        const newContract = new ethers.Contract(
          contractData.contractAddress,
          contractData.abi,
          newProvider
        );

        setProvider(newProvider);
        setContract(newContract);
        setIsReady(true);
        console.log("✅ Blockchain Context Initialized (Local Node)");
      } catch (err) {
        console.error("❌ Blockchain Init Error:", err);
      }
    };

    init();
  }, []);

  return (
    <BlockchainContext.Provider value={{ provider, contract, isReady }}>
      {children}
    </BlockchainContext.Provider>
  );
}

export const useBlockchain = () => useContext(BlockchainContext);
