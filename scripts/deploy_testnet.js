const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const balance = await deployer.getBalance();

  const remainder = balance.mod(1e14);

  console.log("Deploying contracts with the account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.utils.formatEther(balance.sub(remainder))
  );

  const Stadiums = await hre.ethers.getContractFactory("OXStadium");
  const deploy = await Stadiums.deploy(
    "0xDd946a5C1dA0C727D4b748270aE1b59aa5f8c8A8",
    "https://oxstadiums-test.s3.amazonaws.com/"
  );

  await deploy.deployed();

  console.log("Contract:", deploy.address);
  console.log("Hash:", deploy.deployTransaction.hash);

  const newBalance = await deployer.getBalance();

  console.log(
    "New balance:",
    ethers.utils.formatEther(newBalance.sub(remainder))
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
