import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("EduCredModule", (m) => {
  const eduCred = m.contract("EduCred", []);

  return { eduCred };
});
