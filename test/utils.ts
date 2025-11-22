import { PrivateKey, decrypt, encrypt } from "eciesjs";
import { toHex } from "viem";

/**
 * Helper to encrypt an amount using the public key
 * @param publicKey The public key to encrypt with
 * @param amount The amount to encrypt
 * @returns Encrypted amount as hex string
 */
export const encryptAmount = (publicKey: PrivateKey["publicKey"], amount: bigint): `0x${string}` =>
  toHex(encrypt(publicKey.toHex(), Buffer.from(amount.toString()))) as `0x${string}`;

/**
 * Helper to decrypt a balance using the private key
 * @param privateKey The private key to decrypt with
 * @param encrypted The encrypted balance as hex string
 * @returns Decrypted amount as BigInt
 */
export const decryptBalance = (privateKey: PrivateKey, encrypted: string): bigint =>
  BigInt(Buffer.from(decrypt(privateKey.secret, Buffer.from(encrypted.slice(2), "hex"))).toString());
