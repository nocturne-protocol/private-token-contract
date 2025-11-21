import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PrivateERC20Module = buildModule("PrivateERC20Module", (m) => {
  // Parameters for the token (can be customized via parameters)
  const tokenName = m.getParameter("name", "PrivateToken");
  const tokenSymbol = m.getParameter("symbol", "PRIV");
  const decimals = m.getParameter("decimals", 18);

  // Deploy the PrivateERC20 contract
  const privateERC20 = m.contract("PrivateERC20", [
    tokenName,
    tokenSymbol,
    decimals,
  ]);

  return { privateERC20 };
});

export default PrivateERC20Module;