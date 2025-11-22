import { PrivateKey, decrypt, encrypt } from "eciesjs";
import { toHex } from "viem";

/**
 * Encrypt an amount using either a PublicKey object (eciesjs) or a hex string.
 * Accepts:
 *  - PublicKey instance: uses its toHex()
 *  - Hex string (0x-prefixed or not): normalizes by stripping 0x
 */
export const encryptAmount = (
  publicKey: PrivateKey["publicKey"] | string,
  amount: bigint
): `0x${string}` => {
  const hex =
    typeof publicKey === "string"
      ? publicKey.startsWith("0x")
        ? publicKey.slice(2)
        : publicKey
      : publicKey.toHex().replace(/^0x/, "");
  return toHex(encrypt(hex, Buffer.from(amount.toString()))) as `0x${string}`;
};

/**
 * Helper to decrypt a balance using the private key
 * @param privateKey The private key to decrypt with
 * @param encrypted The encrypted balance as hex string
 * @returns Decrypted amount as BigInt
 */
export const decryptBalance = (privateKey: PrivateKey, encrypted: string): bigint =>
  BigInt(Buffer.from(decrypt(privateKey.secret, Buffer.from(encrypted.slice(2), "hex"))).toString());
