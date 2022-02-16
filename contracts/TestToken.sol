// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleToken
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `ERC20` functions.
 */
contract TestToken is Context, ERC20, Ownable {
    /**
     * @dev Constructor that gives _msgSender() all of existing tokens.
     */
    constructor () ERC20("TestToken", "TTN") {
        _mint(_msgSender(), 10000 * (10 ** uint256(decimals())));
    }

    function mint(uint256 amount) public onlyOwner {
        _mint(msg.sender, amount * (10 ** uint256(decimals())));
    }
}