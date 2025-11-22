import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { PrivateKey } from "eciesjs";
import { toHex } from "viem";
import * as fs from "fs";
import * as path from "path";

const PrivateERC20Module = buildModule("PrivateERC20Module", (m) => {
  // Parameters for the token (can be customized via parameters)
  const tokenName = m.getParameter("name", "PrivateToken");
  const tokenSymbol = m.getParameter("symbol", "PRIV");
  const decimals = m.getParameter("decimals", 18);

  // Auto-generate keypair
  const privateKey = new PrivateKey();
  const publicKey = privateKey.publicKey;
  const encryptionPublicKey = toHex(publicKey.toBytes());

  console.log("🔐 Generated Encryption Keys:");
  console.log(`Private Key: ${privateKey.toHex()}`);
  console.log(`Public Key:  ${encryptionPublicKey}`);

  // Save deployment info to file for later verification
  const deploymentInfo = {
    name: tokenName,
    symbol: tokenSymbol,
    decimals: decimals,
    encryptionPublicKey: encryptionPublicKey,
    privateKey: privateKey.toHex(),
  };

  try {
    const deploymentDir = path.join(process.cwd(), "deployments");
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }
    const filePath = path.join(deploymentDir, "deployment-info.json");
    fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n📝 Deployment info saved to: ${filePath}`);
  } catch (error) {
    console.warn("⚠️  Could not save deployment info:", error);
  }

  // Deploy the PrivateERC20 contract
  const privateERC20 = m.contract("PrivateERC20", [
    tokenName,
    tokenSymbol,
    decimals,
    encryptionPublicKey,
  ]);

  return { privateERC20 };
});

export default PrivateERC20Module;
