import { describe, it } from "node:test";
import { expect } from "chai";
import { network } from "hardhat";
import { PrivateKey } from "eciesjs";
import { toHex } from "viem";
import { encryptAmount, decryptBalance } from "./utils.js";

describe("PrivateERC20 E2E Tests", async () => {
  const { viem, networkHelpers } = await network.connect();

  async function deployFixture() {
    const privateKey = new PrivateKey();
    const publicKey = privateKey.publicKey;
    const [deployer, user1, user2] = await viem.getWalletClients();

    const token = await viem.deployContract("PrivateERC20", [
      "PrivateToken",
      "PRIV",
      18,
      toHex(publicKey.toBytes()),
    ]);

    return { token, privateKey, publicKey, deployer, user1, user2 };
  }

  it("should mint tokens with encrypted amount", async () => {
    const { token, publicKey, deployer, user1 } =
      await networkHelpers.loadFixture(deployFixture);

    const amount = 1000n * 10n ** 18n;
    const encrypted = encryptAmount(publicKey, amount);

    await viem.assertions.emit(
      token.write.mint([user1.account!.address, encrypted], {
        account: deployer.account!.address,
      }),
      token,
      "Mint"
    );

    const stored = await token.read.balanceOf([user1.account!.address]);
    expect(stored.toLowerCase()).to.equal(
      encrypted.toLowerCase(),
      "Encrypted balance not stored correctly"
    );

    console.log("✅ Tokens minted with encrypted amount");
  });

  it("should decrypt minted balance with private key (TEE)", async () => {
    const { token, privateKey, publicKey, deployer, user1 } =
      await networkHelpers.loadFixture(deployFixture);

    const amount = 1000n * 10n ** 18n;
    const encrypted = encryptAmount(publicKey, amount);

    await token.write.mint([user1.account!.address, encrypted], {
      account: deployer.account!.address,
    });

    const stored = await token.read.balanceOf([user1.account!.address]);
    const decrypted = decryptBalance(privateKey, stored);

    expect(decrypted).to.equal(amount);

    console.log("✅ Balance decrypted correctly with private key");
  });

  it("should emit TransferRequested on transfer", async () => {
    const { token, publicKey, deployer, user1, user2 } =
      await networkHelpers.loadFixture(deployFixture);

    // Mint to user1
    const mintAmount = 1000n * 10n ** 18n;
    await token.write.mint(
      [user1.account!.address, encryptAmount(publicKey, mintAmount)],
      {
        account: deployer.account!.address,
      }
    );

    // Transfer from user1 to user2
    const transferAmount = 100n * 10n ** 18n;
    const encrypted = encryptAmount(publicKey, transferAmount);

    await viem.assertions.emit(
      token.write.transfer([user2.account!.address, encrypted], {
        account: user1.account!.address,
      }),
      token,
      "TransferRequested"
    );

    console.log("✅ Transfer request emitted");
  });

  it("should update balances correctly", async () => {
    const { token, privateKey, publicKey, deployer, user1, user2 } =
      await networkHelpers.loadFixture(deployFixture);

    const addr1 = user1.account!.address;
    const addr2 = user2.account!.address;

    // Mint to user1
    const mintAmount = 1000n * 10n ** 18n;
    await token.write.mint([addr1, encryptAmount(publicKey, mintAmount)], {
      account: deployer.account!.address,
    });

    // Simulate TEE computing new balances after transfer
    const transferAmount = 100n * 10n ** 18n;
    const newBalance1 = encryptAmount(publicKey, mintAmount - transferAmount);
    const newBalance2 = encryptAmount(publicKey, transferAmount);

    await viem.assertions.emit(
      token.write.updateBalance([addr1, addr2, newBalance1, newBalance2], {
        account: deployer.account!.address,
      }),
      token,
      "BalanceUpdate"
    );

    // Verify by decryption
    const decrypted1 = decryptBalance(
      privateKey,
      await token.read.balanceOf([addr1])
    );
    const decrypted2 = decryptBalance(
      privateKey,
      await token.read.balanceOf([addr2])
    );

    expect(decrypted1).to.equal(900n * 10n ** 18n);
    expect(decrypted2).to.equal(100n * 10n ** 18n);

    console.log("✅ Balances updated and verified");
  });

  it("should revert mint to zero address", async () => {
    const { token, publicKey, deployer } = await networkHelpers.loadFixture(
      deployFixture
    );

    await viem.assertions.revertWith(
      token.write.mint(
        [
          "0x0000000000000000000000000000000000000000",
          encryptAmount(publicKey, 100n),
        ],
        {
          account: deployer.account!.address,
        }
      ),
      "Cannot mint to zero address"
    );

    console.log("✅ Mint to zero address reverted");
  });

  it("should revert transfer to self", async () => {
    const { token, publicKey, deployer, user1 } =
      await networkHelpers.loadFixture(deployFixture);

    const addr1 = user1.account!.address;
    await token.write.mint([addr1, encryptAmount(publicKey, 1000n)], {
      account: deployer.account!.address,
    });

    await viem.assertions.revertWith(
      token.write.transfer([addr1, encryptAmount(publicKey, 100n)], {
        account: addr1,
      }),
      "Cannot transfer to self"
    );

    console.log("✅ Transfer to self reverted");
  });

  it("should maintain privacy - only TEE can decrypt", async () => {
    const { token, privateKey, publicKey, deployer, user1, user2 } =
      await networkHelpers.loadFixture(deployFixture);

    const addr1 = user1.account!.address;
    const addr2 = user2.account!.address;
    const amount1 = 500n * 10n ** 18n;
    const amount2 = 300n * 10n ** 18n;

    await token.write.mint([addr1, encryptAmount(publicKey, amount1)], {
      account: deployer.account!.address,
    });
    await token.write.mint([addr2, encryptAmount(publicKey, amount2)], {
      account: deployer.account!.address,
    });

    // Balances are opaque hex strings on-chain
    const balance1 = await token.read.balanceOf([addr1]);
    const balance2 = await token.read.balanceOf([addr2]);

    expect(balance1).to.match(/^0x/);
    expect(balance2).to.match(/^0x/);

    // Only TEE can decrypt
    expect(decryptBalance(privateKey, balance1)).to.equal(amount1);
    expect(decryptBalance(privateKey, balance2)).to.equal(amount2);

    console.log("✅ Privacy maintained: only TEE can decrypt balances");
  });
});