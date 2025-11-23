import { PrivateKey, decrypt, encrypt } from "eciesjs";
import { toHex, parseEther, parseUnits, concat, pad } from "viem";
import type { WalletClient, PublicClient } from "viem";

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
export const decryptBalance = (
  privateKey: PrivateKey,
  encrypted: string
): bigint =>
  BigInt(
    Buffer.from(
      decrypt(privateKey.secret, Buffer.from(encrypted.slice(2), "hex"))
    ).toString()
  );

/**
 * Get RLC tokens on a forked network by impersonating a rich holder
 * @param viem The viem network object
 * @param pocoAddress Address of the Poco contract
 * @param recipient Address to receive RLC tokens
 * @param amount Amount of RLC to get (in RLC units)
 */
export async function getRLCTokens(
  viem: any,
  pocoAddress: `0x${string}`,
  recipient: `0x${string}`,
  amount: string
) {
  const publicClient = await viem.getPublicClient();
  const amountInWei = parseUnits(amount, 9);

  // Get RLC token address
  const rlcTokenAddress = (await publicClient.readContract({
    address: pocoAddress,
    abi: [
      {
        name: "token",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "address" }],
      },
    ],
    functionName: "token",
  })) as `0x${string}`;

  console.log(`   RLC Token: ${rlcTokenAddress}`);

  // Known address with RLC on Arbitrum Sepolia
  const richHolder =
    "0x5104f76bce6e34f89227c6c570e61d06186b5724" as `0x${string}`;

  // Impersonate the rich holder
  await publicClient.request({
    method: "hardhat_impersonateAccount",
    params: [richHolder],
  });

  // Give the impersonated account some ETH for gas
  await publicClient.request({
    method: "hardhat_setBalance",
    params: [richHolder, toHex(parseEther("10"))],
  });

  // Transfer RLC from rich holder to recipient
  const transferHash = await publicClient.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: richHolder,
        to: rlcTokenAddress,
        data: concat([
          "0xa9059cbb", // transfer(address,uint256) selector
          pad(recipient, { size: 32 }),
          pad(toHex(amountInWei), { size: 32 }),
        ]),
      },
    ],
  });

  // Wait for transaction
  await publicClient.waitForTransactionReceipt({
    hash: transferHash as `0x${string}`,
  });

  // Stop impersonating
  await publicClient.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [richHolder],
  });

  console.log(
    `   ✅ Transferred ${amount} RLC from ${richHolder} to ${recipient}`
  );
}

/**
 * Deposit sRLC into a contract's iExec escrow account
 * @param viem The viem network object
 * @param pocoAddress Address of the Poco contract
 * @param contractAddress Address of the contract to fund
 * @param wallet Wallet client to send transactions
 * @param amount Amount of sRLC to deposit (in RLC units, e.g., "1.0" for 1 RLC)
 */
export async function depositSRLC(
  viem: any,
  pocoAddress: `0x${string}`,
  contractAddress: `0x${string}`,
  wallet: WalletClient,
  amount: string
) {
  // RLC has 9 decimals
  const amountInWei = parseUnits(amount, 9);

  const publicClient = await viem.getPublicClient();

  // Get the RLC token address from Poco using direct contract call
  const rlcTokenAddress = (await publicClient.readContract({
    address: pocoAddress,
    abi: [
      {
        name: "token",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "address" }],
      },
    ],
    functionName: "token",
  })) as `0x${string}`;

  console.log(`   RLC Token: ${rlcTokenAddress}`);

  // Approve Poco to spend RLC
  const approveHash = await wallet.writeContract({
    address: rlcTokenAddress,
    abi: [
      {
        name: "approve",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ type: "bool" }],
      },
    ] as const,
    functionName: "approve",
    args: [pocoAddress, amountInWei],
  } as any);

  console.log(`   Approving RLC...`);
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // Deposit RLC to get sRLC for the contract
  const depositHash = await wallet.writeContract({
    address: pocoAddress,
    abi: [
      {
        name: "depositFor",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "amount", type: "uint256" },
          { name: "target", type: "address" },
        ],
        outputs: [{ type: "bool" }],
      },
    ] as const,
    functionName: "depositFor",
    args: [amountInWei, contractAddress],
  } as any);

  console.log(`   Depositing...`);
  await publicClient.waitForTransactionReceipt({ hash: depositHash });

  console.log(
    `   ✅ Deposited ${amount} RLC (${amountInWei} wei) as sRLC to contract ${contractAddress}`
  );
}
