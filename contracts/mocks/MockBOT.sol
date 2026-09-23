// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockBOT
 * @notice Mock BOT token for local testing and testnet simulation.
 */
contract MockBOT is ERC20 {
    uint8 private immutable _decimals;

    constructor() ERC20("Bot Token", "BOT") {
        _decimals = 18;
        // Mint initial supply of 10,000,000 BOT to deployer
        _mint(msg.sender, 10_000_000 * 10**18);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Free faucet function for testing on testnet / localhost.
     * Mints 1,000 BOT to the caller.
     */
    function faucet() external {
        _mint(msg.sender, 1_000 * 10**18);
    }
}
