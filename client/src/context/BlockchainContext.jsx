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
        if (!contractData?.contractAddress || !contractData?.abi?.length) {
          setIsReady(false);
          return;
        }

        const rpcUrl = import.meta.env.VITE_BLOCKCHAIN_RPC_URL || contractData.rpcUrl;
        if (!rpcUrl) {
          setIsReady(false);
          return;
        }
        const newProvider = new ethers.JsonRpcProvider(rpcUrl);
        const newContract = new ethers.Contract(
          contractData.contractAddress,
          contractData.abi,
          newProvider
        );

        setProvider(newProvider);
        setContract(newContract);
        setIsReady(true);
      } catch (err) {
        console.error("❌ Blockchain Init Error:", err);
        setIsReady(false);
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

// eslint-disable-next-line react-refresh/only-export-components
export const useBlockchain = () => useContext(BlockchainContext);
