import { PrivateKey } from "eciesjs";
import { toHex } from "viem";

/**
 * Generate a new encryption keypair and log in hex format
 * suitable for contract deployment
 */
function generateKeypair() {
  const privateKey = new PrivateKey();
  const publicKey = privateKey.publicKey;

  const privateKeyHex = privateKey.toHex();
  const publicKeyHex = toHex(publicKey.toBytes());

  console.log("🔐 Encryption Keypair Generated:");
  console.log("================================");
  console.log(`Private Key (hex): ${privateKeyHex}`);
  console.log(`Public Key (hex):  ${publicKeyHex}`);
  console.log("================================");
  console.log("\n📋 For Contract Deployment:");
  console.log(`encryptionPublicKey: ${publicKeyHex}`);
  console.log("\n⚠️  KEEP THE PRIVATE KEY SECURE - Only share the public key!");

  return {
    privateKey: privateKeyHex,
    publicKey: publicKeyHex,
  };
}

generateKeypair();
