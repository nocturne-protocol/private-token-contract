import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Simple test module that accepts all parameters directly
 * Used for testing to avoid config file dependencies
 */
const PrivateERC20TestModule = buildModule("PrivateERC20Test", (m) => {
  // All parameters with defaults
  const name = m.getParameter("name", "PrivateToken");
  const symbol = m.getParameter("symbol", "PRIV");
  const decimals = m.getParameter("decimals", 18);
  const encryptionPublicKey = m.getParameter("encryptionPublicKey");
  const pocoOAppRouter = m.getParameter(
    "pocoOAppRouter",
    "0x0000000000000000000000000000000000000000"
  );
  const pocoAddress = m.getParameter(
    "pocoAddress",
    "0x0000000000000000000000000000000000000000"
  );
  const isArbitrum = m.getParameter("isArbitrum", false);
  const lzOptions = m.getParameter("lzOptions", "0x");

  const privateERC20 = m.contract("PrivateERC20", [
    name,
    symbol,
    decimals,
    encryptionPublicKey,
    pocoOAppRouter,
    pocoAddress,
    isArbitrum,
    lzOptions,
  ]);

  return { privateERC20 };
});

export default PrivateERC20TestModule;

