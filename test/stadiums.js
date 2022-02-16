const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Deploying Contracts", function () {
  const baseURI = "https://baseURI.com/";
  let TTKContract;
  let StadiumsContract;
  let owner;
  let addr1;
  let addr2;
  let addr3;

  beforeEach(async function () {
    TTK = await ethers.getContractFactory("TestToken");
    Stadiums = await ethers.getContractFactory("OXStadium");
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    TTKContract = await TTK.deploy();
    StadiumsContract = await Stadiums.deploy(TTKContract.address, baseURI);

    await TTKContract.deployed();
    await StadiumsContract.deployed();
  });

  describe("Basic functions", function () {
    it("Max supply equals to 15.000", async function () {
      const expectedMaxSupply = 15000;

      expect(await StadiumsContract.maxSupply()).to.equal(expectedMaxSupply);
    });

    it("Stadiums quantity", async function () {
      const stadiumsQuantity = [7500, 5000, 2500];

      for (let i = 0; i < stadiumsQuantity.length; i++) {
        expect(await StadiumsContract.stadiumsLeft(i)).to.equal(
          stadiumsQuantity[i]
        );
        expect(await StadiumsContract.stadiumsQuantity(i)).to.equal(
          stadiumsQuantity[i]
        );
      }
    });

    it("Stadiums prices", async function () {
      const { parseEther } = ethers.utils;

      const prices = [parseEther("0.6"), parseEther("1.2"), parseEther("1.9")];

      for (let i = 0; i < prices.length; i++) {
        expect(await StadiumsContract.prices(i)).to.equal(prices[i]);
      }
    });

    it("Token address is TTK", async function () {
      const expectedTokenAddress = TTKContract.address;

      expect(await StadiumsContract.tokenAddress()).to.equal(
        expectedTokenAddress
      );
    });

    it("Unexpected Token Address", async function () {
      const unexpectedTokenAddress = addr3;

      expect(await StadiumsContract.tokenAddress()).to.not.equal(
        unexpectedTokenAddress
      );
    });

    it("Change token address", async function () {
      let { address } = ethers.Wallet.createRandom();

      expect(await StadiumsContract.tokenAddress()).to.equal(
        TTKContract.address
      );

      const changeAddressTx = await StadiumsContract.changeTokenAddress(
        address
      );

      await changeAddressTx.wait();

      expect(await StadiumsContract.tokenAddress()).to.not.equal(
        TTKContract.address
      );
    });

    it("Set max purchases per address", async function () {
      const newMaxPurchases = 25;

      const maxPurchases = await StadiumsContract.maxPurchasesPerAddress();

      await StadiumsContract.setMaxPurchasesPerAddress(25);

      expect(await StadiumsContract.maxPurchasesPerAddress()).to.not.equal(
        maxPurchases
      );

      expect(await StadiumsContract.maxPurchasesPerAddress()).to.equal(
        newMaxPurchases
      );

      await expect(
        StadiumsContract.connect(addr1).setMaxPurchasesPerAddress(
          newMaxPurchases
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Mint functions", function () {
    it("Purchase function", async function () {
      const buyer = addr1.address;
      const allowance = ethers.utils.parseEther("30");

      await TTKContract.connect(addr1).approve(
        StadiumsContract.address,
        allowance
      );

      await TTKContract.connect(owner).transfer(buyer, allowance);

      const stadiumType = 2;

      await StadiumsContract.connect(addr1).purchase(stadiumType);

      expect(await StadiumsContract.ownerOf(1)).to.equal(buyer);

      const stadiumPrice = await StadiumsContract.prices(stadiumType);

      const balanceAfterPurchase = allowance - stadiumPrice;

      expect(await TTKContract.balanceOf(buyer)).to.equal(
        String(balanceAfterPurchase)
      );

      expect(await StadiumsContract.addressPurchases(buyer)).to.equal(1);

      const stadiumsQty = await StadiumsContract.stadiumsQuantity(stadiumType);

      const stadiumName = await StadiumsContract.stadiumNames(stadiumType);

      expect(await StadiumsContract.stadiumsLeft(stadiumType)).to.equal(
        stadiumsQty - 1
      );

      expect(await StadiumsContract.getStadiumType(1)).to.equal(stadiumType);

      expect(await StadiumsContract.getStadiumNameById(1)).to.equal(
        stadiumName
      );

      expect(await StadiumsContract.totalSupply()).to.equal(1);
    });

    it("Test Max purchases", async function () {
      const allowance = ethers.utils.parseEther("30");

      await TTKContract.connect(owner).approve(
        StadiumsContract.address,
        allowance
      );

      const maxPurchases = await StadiumsContract.maxPurchasesPerAddress();

      for (let i = 0; i < maxPurchases; i++) {
        await StadiumsContract.connect(owner).purchase(1);
      }

      expect(await StadiumsContract.addressPurchases(owner.address)).to.equal(
        maxPurchases
      );

      expect(await StadiumsContract.balanceOf(owner.address)).to.equal(
        maxPurchases
      );

      expect(await StadiumsContract.totalSupply()).to.equal(maxPurchases);

      await expect(StadiumsContract.connect(owner).purchase(1)).revertedWith(
        "Max purchases reached"
      );
    });

    it("Test marketing mint", async function () {
      const maxMarketingStadiums = await StadiumsContract.marketingStadiums();

      for (let i = 0; i < maxMarketingStadiums; i++) {
        await StadiumsContract.connect(owner).marketingMint(addr1.address, 2);
      }

      await expect(
        StadiumsContract.connect(owner).marketingMint(addr1.address, 2)
      ).revertedWith("No marketing stadiums left");

      expect(await StadiumsContract.balanceOf(addr1.address)).to.equal(
        maxMarketingStadiums
      );

      const stadiumsQuantity = await StadiumsContract.stadiumsQuantity(2);

      expect(await StadiumsContract.stadiumsLeft(2)).to.equal(
        stadiumsQuantity - maxMarketingStadiums
      );
    });

    it("Mint one Stadium and get URI", async function () {
      await StadiumsContract.marketingMint(addr1.address, 2);

      expect(await StadiumsContract.tokenURI(1)).to.equal(`${baseURI}1.json`);
    });

    it("Marketing mint reverted: Not owner", async function () {
      await expect(
        StadiumsContract.connect(addr1).marketingMint(addr1.address, 2)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Owner functions", function () {
    it("Change stadium price", async function () {
      const allowance = ethers.utils.parseEther("30");

      await TTKContract.connect(owner).transfer(addr1.address, allowance);

      await TTKContract.connect(addr1).approve(
        StadiumsContract.address,
        allowance
      );

      const newPrice = ethers.utils.parseEther("0.1");

      await StadiumsContract.connect(owner).changeStadiumPrice(2, newPrice);

      await StadiumsContract.connect(addr1).purchase(2);

      expect(await TTKContract.balanceOf(addr1.address)).to.equal(
        ethers.utils.parseEther("29.9")
      );
    });

    it("Withdraw Token", async function () {
      const allowance = ethers.utils.parseEther("30");

      await TTKContract.connect(owner).transfer(addr1.address, allowance);

      await TTKContract.connect(addr1).approve(
        StadiumsContract.address,
        allowance
      );

      await expect(StadiumsContract.connect(owner).withdraw()).revertedWith(
        "There is no balance to withdraw"
      );

      await StadiumsContract.connect(addr1).purchase(2);

      await StadiumsContract.connect(owner).withdraw();

      const expectedBalance = ethers.utils.parseEther("9971.9");

      expect(await TTKContract.balanceOf(owner.address)).to.equal(
        expectedBalance
      );
    });

    it("Set base URI", async function () {
      const allowance = ethers.utils.parseEther("30");

      await TTKContract.connect(owner).transfer(addr1.address, allowance);

      await TTKContract.connect(addr1).approve(
        StadiumsContract.address,
        allowance
      );

      const newBaseURI = "https://newBaseURI.com/";

      await StadiumsContract.connect(owner).setBaseURI(newBaseURI);

      await StadiumsContract.connect(addr1).purchase(2);

      expect(await StadiumsContract.tokenURI(1)).to.equal(
        `${newBaseURI}1.json`
      );
    });
  });
});
