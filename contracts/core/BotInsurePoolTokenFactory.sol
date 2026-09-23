// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BotInsurePoolToken.sol";
import "../interfaces/IBotInsurePoolTokenFactory.sol";

contract BotInsurePoolTokenFactory is IBotInsurePoolTokenFactory {
    function createShareToken(
        string memory name,
        string memory symbol,
        uint256 poolId,
        address botInsureCore
    ) external override returns (address) {
        return address(new BotInsurePoolToken(name, symbol, poolId, botInsureCore));
    }
}
