// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BotInsurePoolToken
 * @notice ERC20 token representing shares in a BotInsure protection pool.
 * Minting and burning are strictly authorized to the BotInsure core protocol.
 */
contract BotInsurePoolToken is ERC20, Ownable {
    uint256 public immutable poolId;

    /**
     * @param name_ Token name (e.g. "BotInsure BOT Price Protection Pool Share")
     * @param symbol_ Token symbol (e.g. "biBOT-PRICE")
     * @param poolId_ The associated protection pool ID
     * @param botInsureCore The BotInsure protocol address (owner)
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 poolId_,
        address botInsureCore
    ) ERC20(name_, symbol_) Ownable(botInsureCore) {
        poolId = poolId_;
    }

    /**
     * @notice Mints shares to a liquidity provider. Only callable by BotInsure core.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Burns shares when liquidity is withdrawn. Only callable by BotInsure core.
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
