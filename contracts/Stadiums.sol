//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract OXStadium is ERC721, Ownable, Pausable, ERC721Enumerable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using SafeMath for uint256;
    Counters.Counter private tokenId;
    string private baseURI;
    uint16 public maxSupply = 15000;
    
    IERC20 public tokenAddress;

    uint256[3] public stadiumsQuantity = [7500,5000,2500];
    uint256[3] public prices = [600000000000000000, 1200000000000000000, 1900000000000000000];
    string[3] public stadiumNames = ["Moon", "Mars", "Chaos"];

    mapping (uint8 => uint256) public stadiumsLeft;

    mapping(address => uint8) public addressPurchases;

    mapping(uint256 => uint8) public getStadiumType;

    mapping(uint256 => string) public getStadiumNameById;

    uint8 public maxPurchasesPerAddress;
    uint8 public marketingStadiums;

    constructor(IERC20 _tokenAddress, string memory _baseURI) ERC721("OX Soccer Stadium", "OXSTD"){
        tokenAddress = _tokenAddress;
        baseURI = _baseURI;
        maxPurchasesPerAddress = 8;
        marketingStadiums = 30; 

        for(uint8 i = 0; i < stadiumsQuantity.length; i++){
            stadiumsLeft[i] = stadiumsQuantity[i];
        }
    }

    event NewPurchase(uint256 stadiumId, uint8 stadiumType);
    event TokenAddressChanged(IERC20 newAddress);
    event StadiumPriceChanged(string _name, uint8 _type, uint256 _newPrice);

    function _beforeTokenTransfer(address from, address to, uint256 _tokenId)
        internal
        whenNotPaused
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, _tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function purchase(uint8 _type) public whenNotPaused nonReentrant {
        require (totalSupply() < maxSupply, "Stadiums limit reached");
        require(stadiumsLeft[_type] > 0, "No stadiums left of this type");
        require(addressPurchases[msg.sender] < maxPurchasesPerAddress, "Max purchases reached");
        uint256 stadiumPrice = prices[_type];
        require(tokenAddress.transferFrom(msg.sender, address(this), stadiumPrice), "You don't have enought money");
        addressPurchases[msg.sender] = addressPurchases[msg.sender] += 1;
        stadiumsLeft[_type] = stadiumsLeft[_type] -= 1;
        tokenId.increment();

        uint256 currentId = tokenId.current();

        getStadiumType[currentId] = _type;
        getStadiumNameById[currentId] = stadiumNames[_type];
        _safeMint(msg.sender, currentId);

        emit NewPurchase(currentId, _type);
    }

    function marketingMint(address _to, uint8 _type) public onlyOwner {
        require (totalSupply() < maxSupply, "Stadiums limit reached");
        require(_to != address(0), "You can't mint to zero!");
        require(stadiumsLeft[_type] > 0, "0 Stadiums left");
        require(marketingStadiums > 0, "No marketing stadiums left");
        marketingStadiums = marketingStadiums -= 1;
        stadiumsLeft[_type] = stadiumsLeft[_type] -= 1;
        tokenId.increment();

        uint256 currentId = tokenId.current();

        getStadiumType[currentId] = _type;
        getStadiumNameById[currentId] = stadiumNames[_type];
        _safeMint(_to, currentId);
        emit NewPurchase(currentId, _type);
    }

    function getTokensByOwner(address _owner) public view returns(uint256[] memory){
        require(_owner != address(0), "You can't see zero!");
        require(balanceOf(_owner) > 0, "The address does not have tokens");

        uint256[] memory tokens = new uint256[](balanceOf(_owner));

        for(uint256 i = 0; i < balanceOf(_owner); i++){
            tokens[i] = tokenOfOwnerByIndex(_owner, i);
        }

        return tokens;
    }

    function tokenURI(uint256 _tokenId) public view override returns(string memory) {
        require(ownerOf(_tokenId) != address(0), "Token not exists");
        return string(abi.encodePacked(baseURI, Strings.toString(_tokenId) , ".json"));
    }

    function changeStadiumPrice(uint8 _type, uint256 _newPrice) public onlyOwner {
        string memory _name = stadiumNames[_type];
        prices[_type] = _newPrice;

        emit StadiumPriceChanged(_name, _type, _newPrice);
    }

    function setMaxPurchasesPerAddress(uint8 _amount) public onlyOwner{
        maxPurchasesPerAddress = _amount;
    }

    function changeTokenAddress(IERC20 _newTokenAddress) public onlyOwner {
        tokenAddress = _newTokenAddress;

        emit TokenAddressChanged(_newTokenAddress);
    }

    function withdraw() public onlyOwner {
        require(tokenAddress.balanceOf(address(this)) > 0, "There is no balance to withdraw");
        require(tokenAddress.transfer(msg.sender, tokenAddress.balanceOf(address(this))), "Transfer failed");
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function setBaseURI(string memory _baseURI) public onlyOwner {
        baseURI = _baseURI;
    }
}