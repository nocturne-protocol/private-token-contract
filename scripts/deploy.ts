import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // For demo purposes, we'll use the deployer as TEE oracle
  // In production, this would be the iExec TEE oracle address
  const teeOracleAddress = deployer.address;

  // Deploy PrivateERC20
  const PrivateERC20 = await ethers.getContractFactory("PrivateERC20");
  const privateToken = await PrivateERC20.deploy(
    "PrivateToken",     // name
    "PRIV",            // symbol
    18,                // decimals
    teeOracleAddress   // TEE oracle address
  );

  await privateToken.deployed();

  console.log("PrivateERC20 deployed to:", privateToken.address);
  console.log("Token name:", await privateToken.name());
  console.log("Token symbol:", await privateToken.symbol());
  console.log("Token decimals:", await privateToken.decimals());
  console.log("Owner:", await privateToken.owner());
  console.log("TEE Oracle:", await privateToken.teeOracle());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });