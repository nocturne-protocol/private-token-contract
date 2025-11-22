import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { PrivateKey } from "eciesjs";
import { toHex } from "viem";

const PrivateERC20Module = buildModule("PrivateERC20Module", (m) => {
  const tokenName = m.getParameter("name", "PrivateToken");
  const tokenSymbol = m.getParameter("symbol", "PRIV");
  const decimals = m.getParameter("decimals", 18);

  // Generate keypair by default
  const privateKey = new PrivateKey();
  const generatedPublicKey = toHex(privateKey.publicKey.toBytes());

  // Use generated key as default, can be overridden via parameters
  const encryptionPublicKey = m.getParameter(
    "encryptionPublicKey",
    generatedPublicKey
  ) as unknown as string;

  // Log the keys (only if auto-generated)
  if (encryptionPublicKey === generatedPublicKey) {
    console.log("🔐 Generated new encryption keypair:");
    console.log(`Private Key: ${privateKey.toHex()}`);
    console.log(`Public Key:  ${encryptionPublicKey}`);
    console.warn("⚠️  Save the private key securely - it cannot be recovered!");
  } else {
    console.log("🔐 Using provided encryption public key");
    console.log(`Public Key: ${encryptionPublicKey}`);
  }

  const privateERC20 = m.contract("PrivateERC20", [
    tokenName,
    tokenSymbol,
    decimals,
    encryptionPublicKey,
  ]);

  return { privateERC20 };
});

export default PrivateERC20Module;